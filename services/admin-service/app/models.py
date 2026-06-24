"""Pydantic models for admin-service."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AppRole(str, Enum):
    ADMIN = "Admin"
    TRAINER = "Trainer"
    STUDENT = "Student"


class UserSummary(BaseModel):
    """Summary of a user in the system."""

    id: str = Field(..., description="User object ID")
    name: str = Field(default="", description="Display name")
    email: str = Field(default="", description="Email address")
    roles: list[str] = Field(default_factory=list, description="Assigned roles")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RoleAssignmentRequest(BaseModel):
    """Request to assign a role to a user."""

    role: AppRole = Field(..., description="Role to assign")


class RoleAssignmentResponse(BaseModel):
    """Response after role assignment."""

    user_id: str
    role: str
    assigned: bool
    message: str


class AuditLogEntry(BaseModel):
    """A single entry in the audit log."""

    id: str = Field(..., description="Audit log entry ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actor_id: str = Field(..., description="User who performed the action")
    actor_name: str = Field(default="", description="Display name of actor")
    action: str = Field(..., description="Action performed")
    resource_type: str = Field(default="", description="Type of resource affected")
    resource_id: str = Field(default="", description="ID of resource affected")
    details: dict = Field(default_factory=dict, description="Additional details")


class AuditLogResponse(BaseModel):
    """Paginated audit log response."""

    entries: list[AuditLogEntry]
    total: int
    page: int
    page_size: int


class TrainingGroup(BaseModel):
    """A training group."""

    id: str = Field(..., description="Group ID")
    name: str = Field(..., description="Group name")
    description: str = Field(default="", description="Group description")
    trainer_id: str = Field(default="", description="Assigned trainer ID")
    student_ids: list[str] = Field(default_factory=list, description="Student IDs")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    aws_account_id: str = Field(default="", description="Associated AWS account ID")
    aws_region: str = Field(default="us-east-1", description="AWS region")


class CreateGroupRequest(BaseModel):
    """Request to create a training group."""

    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="")
    trainer_id: str = Field(default="")
    aws_account_id: str = Field(default="")
    aws_region: str = Field(default="us-east-1")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=150)
    email: str = Field(..., min_length=3, max_length=150)
    name: str = Field(default="")
    role: AppRole = Field(default=AppRole.TRAINER)
    password: str | None = Field(default=None, description="Optional custom password. If omitted, one will be generated.")


class CreateUserResponse(BaseModel):
    id: str
    username: str
    email: str
    name: str
    role: str
    password: str
    invite_link: str
