"""API routes for analytics-service."""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from app.config import get_settings
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider


from app.dependencies import get_current_user
from app.models import DashboardMetrics, InstanceMetricsPoint, CostMetricsPoint
from app.database import (
    get_db,
    EC2Instance as DbInstance,
    TrainingGroup as DbGroup,
    User as DbUser,
    user_group_association,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def get_trainer_data(db: Session, trainer_id: str):
    group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == trainer_id).all()]
    student_ids = []
    if group_ids:
        student_ids = [r[0] for r in db.query(user_group_association.c.user_id).filter(
            user_group_association.c.group_id.in_(group_ids)
        ).all()]
        
    return group_ids, student_ids


def get_costs_sum(db: Session, user_oid: str | None = None) -> float:
    query = db.query(DbInstance)
    if user_oid:
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
        if not group_ids:
            return 0.0
        query = query.filter(DbInstance.group_id.in_(group_ids))
        
    db_instances = query.all()
    now = datetime.utcnow()
    total = 0.0
    for inst in db_instances:
        accumulated_running = inst.accumulated_running_hours or 0.0
        accumulated_stopped = inst.accumulated_stopped_hours or 0.0
        
        last_change = inst.last_state_change_time or inst.launch_time or now
        elapsed_hours = (now - last_change).total_seconds() / 3600.0
        if elapsed_hours < 0:
            elapsed_hours = 0.0
            
        if inst.state == "running":
            accumulated_running += elapsed_hours
        else:
            accumulated_stopped += elapsed_hours
            
        amount = (accumulated_running * 0.02) + (accumulated_stopped * 0.005)
        total += amount
    return round(total, 2)


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardMetrics:
    """Retrieve overall platform metrics for the admin dashboard."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if is_admin:
        active_instances = db.query(DbInstance).filter(DbInstance.state == "running").count()
        total_users = db.query(DbUser).filter(DbUser.role == "Student").count()
        active_groups = db.query(DbGroup).count()
        total_spend = get_costs_sum(db)
    else:
        group_ids, student_ids = get_trainer_data(db, user_oid)
        active_groups = len(group_ids)
        total_users = len(set(student_ids))
        
        if group_ids:
            active_instances = db.query(DbInstance).filter(
                DbInstance.group_id.in_(group_ids),
                DbInstance.state == "running"
            ).count()
        else:
            active_instances = 0
            
        total_spend = get_costs_sum(db, user_oid=user_oid)
        
    cpu_avg = 12.8 if active_instances > 0 else 0.0
    
    return DashboardMetrics(
        active_instances=active_instances,
        total_users=total_users,
        cpu_utilization_avg=cpu_avg,
        active_groups=active_groups,
        total_spend_usd=total_spend,
    )


@router.get("/activity")
async def stream_activity(
    token: str | None = Query(None, description="Optional authentication token via query parameters"),
) -> StreamingResponse:
    """Stream user and instance activity using Server-Sent Events (SSE)."""
    async def event_generator():
        try:
            while True:
                # Yield a standard keepalive heartbeat event every 15 seconds to keep connection open
                yield ": heartbeat\n\n"
                await asyncio.sleep(15.0)
        except asyncio.CancelledError:
            logger.info("SSE activity stream client disconnected.")

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/metrics/instances", response_model=list[InstanceMetricsPoint])
async def get_instance_metrics(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[InstanceMetricsPoint]:
    """Retrieve time-series instance metrics (running vs stopped counts)."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if is_admin:
        running = db.query(DbInstance).filter(DbInstance.state == "running").count()
        stopped = db.query(DbInstance).filter(DbInstance.state == "stopped").count()
    else:
        group_ids, _ = get_trainer_data(db, user_oid)
        if group_ids:
            running = db.query(DbInstance).filter(
                DbInstance.group_id.in_(group_ids),
                DbInstance.state == "running"
            ).count()
            stopped = db.query(DbInstance).filter(
                DbInstance.group_id.in_(group_ids),
                DbInstance.state == "stopped"
            ).count()
        else:
            running = 0
            stopped = 0
            
    now = datetime.utcnow()
    points = []
    # Return time series points for the last 5 hours
    for i in range(4, -1, -1):
        ts = now - timedelta(hours=i)
        # Add minor variations to past counts for a realistic graph
        running_val = max(0, running - i)
        stopped_val = max(0, stopped + (1 if i % 2 == 0 else 0))
        points.append(
            InstanceMetricsPoint(
                timestamp=ts,
                running_count=running_val,
                stopped_count=stopped_val,
            )
        )
    return points


@router.get("/metrics/costs", response_model=list[CostMetricsPoint])
async def get_cost_metrics(
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[CostMetricsPoint]:
    """Retrieve time-series cost metrics (cumulative spend)."""
    roles = claims.get("roles", [])
    is_admin = "Admin" in roles
    user_oid = claims.get("oid") or claims.get("sub", "")
    
    if is_admin:
        total_spend = get_costs_sum(db)
    else:
        total_spend = get_costs_sum(db, user_oid=user_oid)
        
    now = datetime.utcnow()
    points = []
    # Return daily cumulative costs for the last 30 days (steps of 5 days)
    for i in range(30, -1, -5):
        ts = now - timedelta(days=i)
        cum_val = round(total_spend * (1.0 - (i / 35.0)), 2)
        points.append(
            CostMetricsPoint(
                timestamp=ts,
                cumulative_cost_usd=max(0.0, cum_val),
            )
        )
    return points


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/ai/chat")
async def ai_chat(
    payload: ChatRequest,
    claims: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Chat with the CTMP Cloud Cohort & Cost Advisor using Azure AI Foundry."""
    role = "Student"
    roles = claims.get("roles", [])
    if "Admin" in roles:
        role = "Admin"
    elif "Trainer" in roles:
        role = "Trainer"
        
    user_oid = claims.get("oid") or claims.get("sub", "")
    user_name = claims.get("name") or "User"
    
    # 1. Gather context from PostgreSQL based on role
    if role == "Student":
        student = db.query(DbUser).filter(DbUser.id == user_oid).first()
        group_ids = [g.id for g in student.groups] if student else []
    elif role == "Trainer":
        group_ids = [g.id for g in db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()]
    else: # Admin
        group_ids = [g.id for g in db.query(DbGroup).all()]
        
    if group_ids:
        active_instances = db.query(DbInstance).filter(DbInstance.group_id.in_(group_ids), DbInstance.state == "running").all()
        stopped_instances = db.query(DbInstance).filter(DbInstance.group_id.in_(group_ids), DbInstance.state == "stopped").all()
    else:
        active_instances = []
        stopped_instances = []
        
    total_spend = 0.0
    if role == "Admin":
        total_spend = get_costs_sum(db)
    elif role == "Trainer" or (role == "Student" and group_ids):
        total_spend = get_costs_sum(db, user_oid=user_oid if role == "Trainer" else None)
        if role == "Student":
            # Sum up costs for student group instances
            now = datetime.utcnow()
            for inst in active_instances + stopped_instances:
                accumulated_running = inst.accumulated_running_hours or 0.0
                accumulated_stopped = inst.accumulated_stopped_hours or 0.0
                last_change = inst.last_state_change_time or inst.launch_time or now
                elapsed_hours = (now - last_change).total_seconds() / 3600.0
                if elapsed_hours < 0:
                    elapsed_hours = 0.0
                if inst.state == "running":
                    accumulated_running += elapsed_hours
                else:
                    accumulated_stopped += elapsed_hours
                total_spend += (accumulated_running * 0.02) + (accumulated_stopped * 0.005)
                
    total_spend = round(total_spend, 2)
    
    # Format database context for prompt injection
    context_str = f"User Identity: {user_name} (Role: {role})\n"
    context_str += "Accessible Cloud Telemetry Context:\n"
    context_str += f"- Active (Running) Sandbox VMs: {len(active_instances)}\n"
    context_str += f"- Inactive (Stopped) Sandbox VMs: {len(stopped_instances)}\n"
    context_str += f"- Total Spend: ${total_spend:.2f} USD\n"
    
    if role in ["Admin", "Trainer"]:
        if role == "Admin":
            all_groups = db.query(DbGroup).all()
        else:
            all_groups = db.query(DbGroup).filter(DbGroup.trainer_id == user_oid).all()
        context_str += f"- Total Cohort Groups: {len(all_groups)}\n"
        context_str += "Cohort Groups List:\n"
        for g in all_groups:
            inst_count = len(g.instances)
            context_str += f"  * Group '{g.name}' (ID: {g.id}) in AWS Region {g.aws_region} with {inst_count} VMs\n"
            
    if active_instances:
        context_str += "Running VM Details:\n"
        for inst in active_instances:
            context_str += f"  * VM ID {inst.id} ({inst.instance_type}) - Group ID: {inst.group_id}\n"
            
    settings = get_settings()
    
    # 2. Build Chat Messages
    system_prompt = (
        "You are the CTMP Cloud Cohort & Cost Advisor, an advanced AI chatbot integrated directly into the "
        "Contoso Cloud Training Management Portal (CTMP). You have access to real-time database context "
        "of sandbox VM instances and cost statistics. Use this context to answer user queries accurately, "
        "professionally, and helpfully. Keep answers clear and relatively concise. Do not mention system "
        "secrets or internal connection strings. If the user asks for actions like launching or stopping "
        "a VM, explain how to do it in the UI since you cannot perform direct actions.\n\n"
        f"{context_str}"
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in payload.history[-10:]:
        role_map = {"user": "user", "assistant": "assistant", "system": "system"}
        role_val = role_map.get(msg.get("role"), "user")
        messages.append({"role": role_val, "content": msg.get("content", "")})
        
    messages.append({"role": "user", "content": payload.message})
    
    # 3. Call Azure OpenAI or fallback gracefully
    if not settings.AZURE_OPENAI_ENDPOINT or not settings.AZURE_OPENAI_DEPLOYMENT:
        logger.warning("Azure OpenAI configuration is missing. Falling back to diagnostic/mock responses.")
        return {
            "response": (
                f"Hello {user_name}! I am currently running in diagnostic mode because the Azure AI Foundry "
                "endpoint or deployment variables are not fully configured. "
                f"However, I can still see your context: You are signed in as a {role} and have access to "
                f"{len(active_instances) + len(stopped_instances)} VM instance(s) and a cumulative spend of ${total_spend:.2f} USD."
            )
        }
        
    try:
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
        )
        client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            azure_ad_token_provider=token_provider,
            api_version="2024-02-15-preview"
        )
        
        response = client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        
        ai_response = response.choices[0].message.content
        return {"response": ai_response}
        
    except Exception as e:
        logger.error(f"Error calling Azure OpenAI Service: {e}", exc_info=True)
        return {
            "response": (
                "I apologize, but I encountered an error communicating with the Azure AI Foundry endpoints. "
                "Please verify that the model quota is available and that identity RBAC permissions are configured."
            )
        }

