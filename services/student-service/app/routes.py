"""API routes for student-service."""

import json
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from azure.storage.queue import QueueClient
from azure.identity import DefaultAzureCredential
from sqlalchemy.orm import Session

from app.config import get_settings, Settings
from app.dependencies import require_student
from app.models import (
    TrainingGroup,
    EC2Instance,
    InstanceActionRequest,
    InstanceActionResponse,
    InstanceStatusResponse,
)
from app.database import get_db, User as DbUser, EC2Instance as DbInstance, TrainingGroup as DbGroup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/student", tags=["student"])

# --- Queue client caching ---
_cached_queue_client: QueueClient | None = None
_cached_credential: DefaultAzureCredential | None = None

def _get_queue_client(settings: Settings) -> QueueClient | None:
    """Initialize and cache Azure Queue Client based on connection string or Managed Identity."""
    global _cached_queue_client, _cached_credential
    if _cached_queue_client is not None:
        return _cached_queue_client
        
    try:
        if settings.AZURE_STORAGE_CONNECTION_STRING:
            logger.info("Initializing QueueClient via Connection String.")
            _cached_queue_client = QueueClient.from_connection_string(
                conn_str=settings.AZURE_STORAGE_CONNECTION_STRING,
                queue_name=settings.AZURE_STORAGE_QUEUE_NAME,
            )
            return _cached_queue_client
        elif settings.AZURE_STORAGE_QUEUE_URL:
            logger.info("Initializing QueueClient via Managed Identity URL.")
            if _cached_credential is None:
                _cached_credential = DefaultAzureCredential()
            _cached_queue_client = QueueClient(
                account_url=settings.AZURE_STORAGE_QUEUE_URL,
                queue_name=settings.AZURE_STORAGE_QUEUE_NAME,
                credential=_cached_credential,
            )
            return _cached_queue_client
    except Exception as e:
        logger.error("Failed to initialize Azure Queue Client: %s", str(e))
    return None


@router.get("/groups", response_model=list[TrainingGroup])
async def get_student_groups(
    claims: Annotated[dict, Depends(require_student)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TrainingGroup]:
    """Get training groups assigned to the current student."""
    student_id = claims.get("sub", "")
    student = db.query(DbUser).filter(DbUser.id == student_id).first()
    if not student:
        return []
        
    result = []
    for g in student.groups:
        result.append(TrainingGroup(
            id=g.id,
            name=g.name,
            description=g.description or "",
            trainer_id=g.trainer_id or "",
            created_at=g.created_at,
            aws_region=g.aws_region or "us-east-1"
        ))
    return result


@router.get("/instances", response_model=list[EC2Instance])
async def get_visible_instances(
    claims: Annotated[dict, Depends(require_student)],
    db: Annotated[Session, Depends(get_db)],
) -> list[EC2Instance]:
    """Get EC2 instances visible to the current student based on group assignments."""
    student_id = claims.get("sub", "")
    student = db.query(DbUser).filter(DbUser.id == student_id).first()
    if not student:
        return []
        
    assigned_group_ids = [g.id for g in student.groups]
    if not assigned_group_ids:
        return []
    
    db_instances = db.query(DbInstance).filter(DbInstance.group_id.in_(assigned_group_ids)).all()
        
    result = []
    for inst in db_instances:
        result.append(EC2Instance(
            id=inst.id,
            name=inst.name or "",
            state=inst.state,
            instance_type=inst.instance_type,
            launch_time=inst.launch_time,
            group_id=inst.group_id
        ))
    return result


@router.post("/instances/{instance_id}/action", response_model=InstanceActionResponse)
async def dispatch_instance_action(
    instance_id: str,
    body: InstanceActionRequest,
    claims: Annotated[dict, Depends(require_student)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session, Depends(get_db)],
) -> InstanceActionResponse:
    """Dispatch an EC2 lifecycle action to the Azure Storage Queue or execute immediately in mock mode."""
    instance = db.query(DbInstance).filter(DbInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EC2 Instance {instance_id} not found",
        )

    student_id = claims.get("sub", "")
    group_id = instance.group_id
    
    # Verify access
    student = db.query(DbUser).filter(DbUser.id == student_id).first()
    allowed = False
    if student:
        allowed = group_id in [g.id for g in student.groups]
    if not allowed and "Admin" in claims.get("roles", []):
        allowed = True
        
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to perform actions on instances in this training group.",
        )

    group = db.query(DbGroup).filter(DbGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group {group_id} not found",
        )
    aws_region = group.aws_region or "us-east-1"
    aws_role_arn = f"arn:aws:iam::{group.aws_account_id}:role/AzureMIFederatedRole"

    # Calculate elapsed duration in previous state for cost estimation
    now = datetime.utcnow()
    last_change = instance.last_state_change_time or instance.launch_time or now
    elapsed_hours = (now - last_change).total_seconds() / 3600.0
    if elapsed_hours < 0:
        elapsed_hours = 0.0

    if instance.state == "running":
        instance.accumulated_running_hours = (instance.accumulated_running_hours or 0.0) + elapsed_hours
    else:
        instance.accumulated_stopped_hours = (instance.accumulated_stopped_hours or 0.0) + elapsed_hours

    instance.last_state_change_time = now

    # Prepare message body
    action_message = {
        "instance_id": instance_id,
        "action": body.action.value,
        "timestamp": now.isoformat() + "Z",
        "student_id": student_id,
        "group_id": group_id,
        "aws_region": aws_region,
        "aws_role_arn": aws_role_arn
    }

    queue_client = _get_queue_client(settings)
    if queue_client:
        try:
            import base64
            msg_bytes = json.dumps(action_message).encode('utf-8')
            msg_base64 = base64.b64encode(msg_bytes).decode('utf-8')
            queue_client.send_message(msg_base64)
            logger.info("Successfully sent message to queue for instance %s", instance_id)
            
            # Update status in db for immediate visual progress
            if body.action.value == "start":
                instance.state = "pending"
            elif body.action.value == "stop":
                instance.state = "stopping"
            elif body.action.value == "terminate":
                instance.state = "shutting-down"
            db.commit()
            
            return InstanceActionResponse(
                instance_id=instance_id,
                action=body.action.value,
                status="dispatched",
                message=f"Action '{body.action.value}' dispatched successfully to Azure queue.",
            )
        except Exception as e:
            logger.error("Failed to send message to Azure Storage Queue: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not queue action: {str(e)}",
            )
    else:
        logger.warning("Azure Storage Queue not configured. Running in MOCK mode.")
        if body.action.value == "start":
            instance.state = "running"
        elif body.action.value == "stop":
            instance.state = "stopped"
        elif body.action.value == "terminate":
            instance.state = "terminated"
        db.commit()

        return InstanceActionResponse(
            instance_id=instance_id,
            action=body.action.value,
            status="mocked",
            message=f"Azure storage queue not configured. Simulated action '{body.action.value}' successfully.",
        )


@router.get("/instances/{instance_id}/status", response_model=InstanceStatusResponse)
async def get_instance_status(
    instance_id: str,
    claims: Annotated[dict, Depends(require_student)],
    db: Annotated[Session, Depends(get_db)],
) -> InstanceStatusResponse:
    """Get status of a specific EC2 instance."""
    instance = db.query(DbInstance).filter(DbInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EC2 Instance {instance_id} not found",
        )

    return InstanceStatusResponse(
        instance_id=instance.id,
        state=instance.state,
    )
