"""API routes for billing-service."""

import logging
import json
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user
from app.models import (
    CostResponse,
    CostDetail,
    GroupCostResponse,
    StudentCostResponse,
    BillingSummaryResponse,
)
from app.database import get_db, EC2Instance as DbInstance, TrainingGroup as DbGroup, User as DbUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


def get_db_costs(db: Session, user_oid: str | None = None):
    query = db.query(DbInstance)
    if user_oid:
        # Get groups managed by the trainer
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
        if not group_ids:
            return []
        query = query.filter(DbInstance.group_id.in_(group_ids))
        
    db_instances = query.all()
    now = datetime.utcnow()
    
    records = []
    for inst in db_instances:
        # 1. Base accumulated cost stored from prior lifecycle transitions
        accumulated_running = inst.accumulated_running_hours or 0.0
        accumulated_stopped = inst.accumulated_stopped_hours or 0.0
        
        # 2. Add dynamic elapsed cost for the current active state since last transition
        last_change = inst.last_state_change_time or inst.launch_time or now
        elapsed_hours = (now - last_change).total_seconds() / 3600.0
        if elapsed_hours < 0:
            elapsed_hours = 0.0
            
        if inst.state == "running":
            accumulated_running += elapsed_hours
        else:
            accumulated_stopped += elapsed_hours
            
        # Total cost calculation
        amount = (accumulated_running * 0.02) + (accumulated_stopped * 0.005)
        
        records.append({
            "id": inst.id,
            "group_id": inst.group_id,
            "student_id": inst.student_id or "system",
            "date": inst.launch_time or now,
            "amount": round(amount, 4)
        })
    return records


@router.get("/costs", response_model=CostResponse)
async def get_costs(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: datetime | None = Query(None, description="Start date of range"),
    end_date: datetime | None = Query(None, description="End date of range"),
) -> CostResponse:
    """Retrieve aggregated costs, optionally filtered by a date range."""
    # Defaults
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if is_admin:
        records = get_db_costs(db)
    else:
        records = get_db_costs(db, user_oid=user_oid)
        
    filtered_details = []
    total = 0.0

    for record in records:
        if start_date <= record["date"] <= end_date:
            amount = record["amount"]
            total += amount
            filtered_details.append(
                CostDetail(
                    date=record["date"],
                    amount=amount,
                    currency="USD",
                    resource_type="EC2",
                )
            )

    return CostResponse(
        total_cost=round(total, 2),
        currency="USD",
        start_date=start_date,
        end_date=end_date,
        details=filtered_details,
    )


@router.get("/costs/group/{group_id}", response_model=GroupCostResponse)
async def get_costs_by_group(
    group_id: str,
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> GroupCostResponse:
    """Retrieve cost aggregated for a specific training group."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    # Check if trainer owns the group
    if not is_admin:
        group = db.query(DbGroup).filter(DbGroup.id == group_id, DbGroup.trainer_id == user_oid).first()
        if not group:
            return GroupCostResponse(group_id=group_id, total_cost=0.0, currency="USD", details=[])
            
    records = get_db_costs(db)
    filtered_details = []
    total = 0.0

    for record in records:
        if record["group_id"] == group_id:
            amount = record["amount"]
            total += amount
            filtered_details.append(
                CostDetail(
                    date=record["date"],
                    amount=amount,
                    currency="USD",
                    resource_type="EC2",
                )
            )

    return GroupCostResponse(
        group_id=group_id,
        total_cost=round(total, 2),
        currency="USD",
        details=filtered_details,
    )


@router.get("/costs/student/{student_id}", response_model=StudentCostResponse)
async def get_costs_by_student(
    student_id: str,
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentCostResponse:
    """Retrieve cost aggregated for a specific student."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if not is_admin:
        # Check if student is in trainer's groups
        from app.database import user_group_association
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
        is_student_in_group = False
        if group_ids:
            is_student_in_group = db.query(user_group_association).filter(
                user_group_association.c.user_id == student_id,
                user_group_association.c.group_id.in_(group_ids)
            ).first() is not None
            
        if not is_student_in_group:
            return StudentCostResponse(student_id=student_id, total_cost=0.0, currency="USD", details=[])
            
    records = get_db_costs(db)
    filtered_details = []
    total = 0.0

    for record in records:
        if record["student_id"] == student_id:
            amount = record["amount"]
            total += amount
            filtered_details.append(
                CostDetail(
                    date=record["date"],
                    amount=amount,
                    currency="USD",
                    resource_type="EC2",
                )
            )

    return StudentCostResponse(
        student_id=student_id,
        total_cost=round(total, 2),
        currency="USD",
        details=filtered_details,
    )


@router.get("/summary", response_model=BillingSummaryResponse)
async def get_billing_summary(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BillingSummaryResponse:
    """Retrieve a summary overview for the billing dashboard."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if is_admin:
        records = get_db_costs(db)
        unique_groups = db.query(DbGroup).count()
        unique_students = db.query(DbUser).filter(DbUser.role == "Student").count()
    else:
        records = get_db_costs(db, user_oid=user_oid)
        
        from app.database import user_group_association
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
        unique_groups = len(group_ids)
        if group_ids:
            unique_students = db.query(user_group_association.c.user_id).filter(
                user_group_association.c.group_id.in_(group_ids)
            ).distinct().count()
        else:
            unique_students = 0
            
    total = sum(r["amount"] for r in records)
    
    # Calculate group totals to find the top spending group
    group_totals: dict[str, float] = {}
    for r in records:
        group_totals[r["group_id"]] = group_totals.get(r["group_id"], 0.0) + r["amount"]
    
    top_group = max(group_totals, key=group_totals.get) if group_totals else "N/A"
    
    monthly_budget = 500.0
    utilization = (total / monthly_budget) * 100.0

    return BillingSummaryResponse(
        total_platform_cost=round(total, 2),
        active_groups_count=unique_groups,
        active_students_count=unique_students,
        top_spending_group_id=top_group,
        currency="USD",
        monthly_budget=monthly_budget,
        budget_utilization_percentage=round(utilization, 2),
    )
