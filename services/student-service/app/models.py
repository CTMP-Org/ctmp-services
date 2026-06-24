"""Pydantic models for student-service."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class EC2Action(str, Enum):
    START = "start"
    STOP = "stop"
    REBOOT = "reboot"
    TERMINATE = "terminate"


class TrainingGroup(BaseModel):
    """Details of a training group."""

    id: str = Field(..., description="Group ID")
    name: str = Field(..., description="Group name")
    description: str = Field(default="", description="Group description")
    trainer_id: str = Field(..., description="Assigned trainer ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    aws_region: str = Field(default="us-east-1", description="AWS region")


class EC2Instance(BaseModel):
    """Details of an EC2 instance."""

    id: str = Field(..., description="EC2 Instance ID")
    name: str = Field(..., description="Instance name/tag")
    state: str = Field(..., description="State of the instance (running, stopped, etc.)")
    instance_type: str = Field(..., description="Instance type (e.g. t3.micro)")
    launch_time: datetime = Field(default_factory=datetime.utcnow)
    group_id: str = Field(..., description="Associated group ID")


class InstanceActionRequest(BaseModel):
    """Request to perform a lifecycle action on an EC2 instance."""

    action: EC2Action = Field(..., description="Action to perform (start, stop, reboot, terminate)")


class InstanceActionResponse(BaseModel):
    """Response after dispatching an action to the queue."""

    instance_id: str
    action: str
    status: str
    message: str


class InstanceStatusResponse(BaseModel):
    """Response containing status details of an EC2 instance."""

    instance_id: str
    state: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
