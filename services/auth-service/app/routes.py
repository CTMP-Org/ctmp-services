"""API routes for auth-service."""

import logging
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.dependencies import _fetch_jwks, _get_signing_key, get_current_user
from app.models import (
    RoleResponse,
    TokenValidationRequest,
    TokenValidationResponse,
    UserProfile,
    LoginRequest,
    LoginResponse,
)
from app.database import get_db, User as DbUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> UserProfile:
    """Return the current user's profile extracted from JWT claims and sync to DB."""
    oid = claims.get("oid") or claims.get("sub", "")
    email = claims.get("email", claims.get("preferred_username", ""))
    username = claims.get("preferred_username", email or oid)
    name = claims.get("name", username)
    
    # Extract roles and groups from claims
    roles = claims.get("roles", [])
    if isinstance(roles, str):
        roles = [roles]
    roles = list(roles)
    
    groups = claims.get("groups", [])
    if isinstance(groups, str):
        groups = [groups]
    groups = [str(g) for g in groups]
        
    # Extract roles and groups from claims
    roles_lower = [r.lower() for r in roles]
    groups_lower = [str(g).lower() for g in groups]
    
    # Query database to check if user already exists
    db_user_role = None
    existing_user = None
    try:
        existing_user = db.query(DbUser).filter((DbUser.id == oid) | (DbUser.email == email)).first()
        if existing_user:
            db_user_role = existing_user.role
    except Exception as e:
        logger.error(f"Error querying existing user in DB: {e}")
        
    # Resolve role using Groups / App Roles / DB Fallback
    admin_group = os.environ.get("AZURE_AD_ADMIN_GROUP_ID", "").lower()
    trainer_group = os.environ.get("AZURE_AD_TRAINER_GROUP_ID", "").lower()
    student_group = os.environ.get("AZURE_AD_STUDENT_GROUP_ID", "").lower()
    
    is_admin = False
    is_trainer = False
    is_student = False
    
    if admin_group and admin_group in groups_lower:
        is_admin = True
    elif trainer_group and trainer_group in groups_lower:
        is_trainer = True
    elif student_group and student_group in groups_lower:
        is_student = True
        
    if not (is_admin or is_trainer or is_student):
        if "admin" in roles_lower:
            is_admin = True
        elif "trainer" in roles_lower:
            is_trainer = True
        elif "student" in roles_lower:
            is_student = True
            
    if not (is_admin or is_trainer or is_student) and db_user_role:
        role_val = db_user_role.lower()
        if role_val == "admin":
            is_admin = True
        elif role_val == "trainer":
            is_trainer = True
        elif role_val == "student":
            is_student = True
            
    determined_role = "Student"
    if is_admin:
        determined_role = "Admin"
    elif is_trainer:
        determined_role = "Trainer"
        
    if determined_role not in roles:
        roles.append(determined_role)
        
    # Sync to DB if not mock
    sub_val = claims.get("sub", "")
    if sub_val and not sub_val.startswith("mock-"):
        try:
            if not existing_user:
                new_user = DbUser(
                    id=oid,
                    username=username,
                    email=email,
                    hashed_password=DbUser.hash_password("SSO-No-Password-Set-Placeholder-123!"),
                    name=name,
                    role=determined_role
                )
                db.add(new_user)
                logger.info(f"SSO: Synced new user {username} with role {determined_role} to DB")
            else:
                changed = False
                if existing_user.role != determined_role:
                    existing_user.role = determined_role
                    changed = True
                if existing_user.name != name:
                    existing_user.name = name
                    changed = True
                if existing_user.email != email:
                    existing_user.email = email
                    changed = True
                if changed:
                    db.add(existing_user)
                    logger.info(f"SSO: Updated user {username} details (role: {determined_role}) in DB")
            db.commit()
        except Exception as e:
            logger.error(f"Error syncing user to database: {e}")
            db.rollback()
            
    return UserProfile(
        sub=oid,
        name=name,
        email=email,
        preferred_username=username,
        roles=roles,
        groups=groups,
        tenant_id=claims.get("tid", ""),
        oid=oid,
    )


@router.post("/validate", response_model=TokenValidationResponse)
async def validate_token(
    body: TokenValidationRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenValidationResponse:
    """Validate a JWT token and return its claims if valid."""
    try:
        jwks = await _fetch_jwks(settings)
        signing_key = _get_signing_key(body.token, jwks)

        claims = jwt.decode(
            body.token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.token_audience,
            issuer=settings.token_issuer,
            options={
                "verify_aud": bool(settings.AZURE_CLIENT_ID),
                "verify_iss": bool(settings.AZURE_TENANT_ID),
            },
        )

        return TokenValidationResponse(valid=True, claims=claims)

    except JWTError as e:
        return TokenValidationResponse(valid=False, error=str(e))
    except Exception as e:
        logger.error("Token validation error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token validation service unavailable",
        )


@router.get("/roles", response_model=RoleResponse)
async def get_user_roles(
    claims: Annotated[dict, Depends(get_current_user)],
) -> RoleResponse:
    """Return the current user's application roles."""
    roles = claims.get("roles", [])
    return RoleResponse(
        user_id=claims.get("sub", ""),
        roles=roles,
        is_admin="Admin" in roles,
        is_trainer="Trainer" in roles,
        is_student="Student" in roles,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """Authenticate users with local credentials and return profile & mock token."""
    user = db.query(DbUser).filter(DbUser.username == body.username).first()
    if not user or not user.verify_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    profile = UserProfile(
        sub=user.id,
        name=user.name or user.username,
        email=user.email or "",
        preferred_username=user.username,
        roles=[user.role],
        groups=[g.id for g in user.groups],
        tenant_id="mock-tenant",
        oid=user.id
    )
    
    return LoginResponse(
        token=f"mock-{user.id}",
        user=profile
    )


@router.get("/invite", response_model=LoginResponse)
async def invite(
    token: str = Query(..., description="Invitation/auto-login token"),
    db: Session = Depends(get_db),
) -> LoginResponse:
    """Verify an invitation token and automatically sign in the user."""
    user = db.query(DbUser).filter(DbUser.invite_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid invitation token",
        )
    
    profile = UserProfile(
        sub=user.id,
        name=user.name or user.username,
        email=user.email or "",
        preferred_username=user.username,
        roles=[user.role],
        groups=[g.id for g in user.groups],
        tenant_id="mock-tenant",
        oid=user.id
    )
    
    return LoginResponse(
        token=f"mock-{user.id}",
        user=profile
    )
