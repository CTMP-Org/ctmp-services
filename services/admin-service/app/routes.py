"""API routes for admin-service."""

import logging
import uuid
import json
import random
import string
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, require_admin, require_admin_or_trainer
from app.models import (
    AuditLogEntry,
    AuditLogResponse,
    CreateGroupRequest,
    RoleAssignmentRequest,
    RoleAssignmentResponse,
    TrainingGroup,
    UserSummary,
    CreateUserRequest,
    CreateUserResponse,
)
from app.database import (
    get_db,
    User as DbUser,
    TrainingGroup as DbGroup,
    AuditLog as DbAuditLog,
    EC2Instance as DbInstance,
    user_group_association,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _add_audit_entry(
    db: Session,
    actor_id: str, actor_name: str, action: str,
    resource_type: str = "", resource_id: str = "",
    details: dict | None = None,
) -> None:
    """Write an entry to the database audit log."""
    entry = DbAuditLog(
        id=str(uuid.uuid4()),
        timestamp=datetime.utcnow(),
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details or {}),
    )
    db.add(entry)
    db.commit()


@router.get("/users", response_model=list[UserSummary])
async def list_users(
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    role: str | None = Query(None, description="Filter by role"),
) -> list[UserSummary]:
    """List all users, optionally filtered by role."""
    query = db.query(DbUser)
    if role:
        query = query.filter(DbUser.role == role)
    db_users = query.all()
    
    return [
        UserSummary(
            id=u.id,
            name=u.name or "",
            email=u.email or "",
            roles=[u.role],
            created_at=u.created_at or datetime.utcnow(),
        )
        for u in db_users
    ]


@router.post(
    "/users/{user_id}/role",
    response_model=RoleAssignmentResponse,
    status_code=status.HTTP_200_OK,
)
async def assign_role(
    user_id: str,
    body: RoleAssignmentRequest,
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> RoleAssignmentResponse:
    """Assign a role to a user."""
    user = db.query(DbUser).filter(DbUser.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )

    role_value = body.role.value
    if user.role == role_value:
        return RoleAssignmentResponse(
            user_id=user_id,
            role=role_value,
            assigned=False,
            message=f"User already has role {role_value}",
        )

    old_role = user.role
    user.role = role_value
    db.commit()

    _add_audit_entry(
        db=db,
        actor_id=claims.get("sub", ""),
        actor_name=claims.get("name", ""),
        action="assign_role",
        resource_type="user",
        resource_id=user_id,
        details={"old_role": old_role, "new_role": role_value},
    )

    return RoleAssignmentResponse(
        user_id=user_id,
        role=role_value,
        assigned=True,
        message=f"Role {role_value} assigned to user {user_id}",
    )


@router.get("/audit-log", response_model=AuditLogResponse)
async def get_audit_log(
    claims: Annotated[dict, Depends(require_admin_or_trainer)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> AuditLogResponse:
    """Retrieve paginated audit log."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    query = db.query(DbAuditLog)
    
    if not is_admin:
        # Caller is a trainer
        # Get groups managed by the trainer
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
        
        # Get student IDs in these groups
        student_ids = [r[0] for r in db.query(user_group_association.c.user_id).filter(user_group_association.c.group_id.in_(group_ids)).all()] if group_ids else []
        
        # Get instance IDs in these groups
        instance_ids = [inst.id for inst in db.query(DbInstance).filter(DbInstance.group_id.in_(group_ids)).all()] if group_ids else []
        
        # Filter logs
        conditions = [
            DbAuditLog.actor_id == user_oid
        ]
        if student_ids:
            conditions.append(DbAuditLog.actor_id.in_(student_ids))
        if group_ids:
            conditions.append((DbAuditLog.resource_type == "group") & DbAuditLog.resource_id.in_(group_ids))
        if instance_ids:
            conditions.append((DbAuditLog.resource_type == "instance") & DbAuditLog.resource_id.in_(instance_ids))
            
        query = query.filter(or_(*conditions))
        
    total = query.count()
    start = (page - 1) * page_size
    
    # Order by timestamp desc
    db_entries = query.order_by(DbAuditLog.timestamp.desc()).offset(start).limit(page_size).all()
    
    entries = []
    for entry in db_entries:
        try:
            details_dict = json.loads(entry.details) if entry.details else {}
        except Exception:
            details_dict = {"raw_value": entry.details} if entry.details else {}
            
        entries.append(
            AuditLogEntry(
                id=entry.id,
                timestamp=entry.timestamp or datetime.utcnow(),
                actor_id=entry.actor_id or "system",
                actor_name=entry.actor_name or "",
                action=entry.action,
                resource_type=entry.resource_type or "",
                resource_id=entry.resource_id or "",
                details=details_dict,
            )
        )
        
    return AuditLogResponse(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/groups",
    response_model=TrainingGroup,
    status_code=status.HTTP_201_CREATED,
)
async def create_group(
    body: CreateGroupRequest,
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> TrainingGroup:
    """Create a new training group."""
    group_id = f"group-{uuid.uuid4().hex[:6]}"
    
    # Verify trainer exists if trainer_id is provided
    if body.trainer_id:
        trainer = db.query(DbUser).filter(DbUser.id == body.trainer_id).first()
        if not trainer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trainer user {body.trainer_id} does not exist"
            )
            
    group = DbGroup(
        id=group_id,
        name=body.name,
        description=body.description,
        trainer_id=body.trainer_id or None,
        aws_account_id=body.aws_account_id,
        aws_region=body.aws_region or "us-east-1",
        created_at=datetime.utcnow(),
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    _add_audit_entry(
        db=db,
        actor_id=claims.get("sub", ""),
        actor_name=claims.get("name", ""),
        action="create_group",
        resource_type="group",
        resource_id=group_id,
        details={"name": body.name},
    )

    return TrainingGroup(
        id=group.id,
        name=group.name,
        description=group.description or "",
        trainer_id=group.trainer_id or "",
        student_ids=[s.id for s in group.students],
        created_at=group.created_at,
        aws_account_id=group.aws_account_id or "",
        aws_region=group.aws_region or "us-east-1",
    )


@router.get("/groups", response_model=list[TrainingGroup])
async def list_groups(
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TrainingGroup]:
    """List all training groups."""
    db_groups = db.query(DbGroup).all()
    return [
        TrainingGroup(
            id=g.id,
            name=g.name,
            description=g.description or "",
            trainer_id=g.trainer_id or "",
            student_ids=[s.id for s in g.students],
            created_at=g.created_at,
            aws_account_id=g.aws_account_id or "",
            aws_region=g.aws_region or "us-east-1",
        )
        for g in db_groups
    ]


@router.post(
    "/users",
    response_model=CreateUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    body: CreateUserRequest,
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> CreateUserResponse:
    """Create a new user (Trainer, Admin, or Student) manually with credentials."""
    # Check if username or email already exists
    existing = db.query(DbUser).filter(
        (DbUser.username == body.username) | (DbUser.email == body.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    # Generate a password if not provided
    raw_password = body.password
    if not raw_password:
        raw_password = "CTMP-" + "".join(
            random.choices(string.ascii_uppercase + string.digits, k=8)
        )

    user_id = f"user-{uuid.uuid4().hex[:6]}"
    invite_token = str(uuid.uuid4())

    new_user = DbUser(
        id=user_id,
        username=body.username,
        email=body.email,
        hashed_password=DbUser.hash_password(raw_password),
        name=body.name or body.username,
        role=body.role.value,
        invite_token=invite_token,
    )
    db.add(new_user)
    db.commit()

    _add_audit_entry(
        db=db,
        actor_id=claims.get("sub", ""),
        actor_name=claims.get("name", ""),
        action="create_user",
        resource_type="user",
        resource_id=user_id,
        details={"username": body.username, "role": body.role.value},
    )

    invite_link = f"/login?token={invite_token}"

    return CreateUserResponse(
        id=user_id,
        username=body.username,
        email=body.email,
        name=new_user.name,
        role=new_user.role,
        password=raw_password,
        invite_link=invite_link,
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: str,
    claims: Annotated[dict, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """Delete a user from the directory."""
    user = db.query(DbUser).filter(DbUser.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    
    # Don't allow deleting the emergency local admin itself
    if user.username == "admin1":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the emergency local administrator account",
        )

    db.delete(user)
    db.commit()

    _add_audit_entry(
        db=db,
        actor_id=claims.get("sub", ""),
        actor_name=claims.get("name", ""),
        action="delete_user",
        resource_type="user",
        resource_id=user_id,
        details={"username": user.username},
    )
