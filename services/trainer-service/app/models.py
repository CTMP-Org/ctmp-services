"""Pydantic models for trainer-service."""

from datetime import datetime
from pydantic import BaseModel, Field


class AwsTemplateRequest(BaseModel):
    """Request schema for generating AWS CloudFormation template."""

    azure_tenant_id: str = Field(..., description="Azure Active Directory Tenant ID")
    azure_client_id: str = Field(..., description="Azure Managed Identity Client ID to trust")
    aws_role_name: str = Field(default="AzureMIFederatedRole", description="Name of the AWS IAM Role to create")


class AwsTemplateResponse(BaseModel):
    """Response schema containing the generated CloudFormation template."""

    template_yaml: str = Field(..., description="CloudFormation YAML template")


class TrainingGroup(BaseModel):
    """Details of a training group."""

    id: str = Field(..., description="Group ID")
    name: str = Field(..., description="Group name")
    description: str = Field(default="", description="Group description")
    trainer_id: str = Field(..., description="Assigned trainer ID")
    student_ids: list[str] = Field(default_factory=list, description="Assigned student IDs")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    aws_account_id: str = Field(default="", description="Associated AWS account ID")
    aws_region: str = Field(default="us-east-1", description="AWS region")


class AssignStudentsRequest(BaseModel):
    """Request to assign students to a training group."""

    student_ids: list[str] = Field(..., description="List of student user IDs to assign")


class EC2Instance(BaseModel):
    """Details of an EC2 instance."""

    id: str = Field(..., description="EC2 Instance ID")
    name: str = Field(..., description="Instance name/tag")
    state: str = Field(..., description="State of the instance (running, stopped, etc.)")
    instance_type: str = Field(..., description="Instance type (e.g. t3.micro)")
    launch_time: datetime = Field(default_factory=datetime.utcnow)
    group_id: str = Field(..., description="Associated group ID")
    student_id: str = Field(default="", description="Assigned student ID")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str


class CreateGroupAndStudentsRequest(BaseModel):
    name: str = Field(..., description="Group name")
    description: str = Field(default="", description="Group description")
    aws_account_id: str = Field(default="", description="Associated AWS Account ID")
    aws_region: str = Field(default="us-east-1", description="AWS Region")
    student_emails: list[str] = Field(default_factory=list, description="List of student emails to register")
    auto_generate_count: int = Field(default=0, ge=0, le=50, description="Number of random student accounts to auto-generate")
    max_instances_per_student: int = Field(default=2, ge=1, le=5, description="Max EC2 instances per student")


class GeneratedStudentCredentials(BaseModel):
    id: str = Field(..., description="Student user ID")
    username: str = Field(..., description="Login username")
    password: str = Field(..., description="Plain-text password to share")
    name: str = Field(..., description="Display name")
    invite_token: str = Field(..., description="Invitation token")
    login_link: str = Field(..., description="Direct auto-login URL")


class CreateGroupAndStudentsResponse(BaseModel):
    group_id: str = Field(..., description="Group ID")
    name: str = Field(..., description="Group name")
    student_count: int = Field(..., description="Total student count in group")
    created_students: list[GeneratedStudentCredentials] = Field(default_factory=list, description="Credentials for generated students")


class StudentInstanceResponse(BaseModel):
    """Details of a student instance including group and student info."""

    id: str = Field(..., description="EC2 Instance ID")
    name: str = Field(..., description="Instance name/tag")
    state: str = Field(..., description="State of the instance")
    instance_type: str = Field(..., description="Instance type")
    launch_time: datetime = Field(..., description="Launch time")
    group_id: str = Field(..., description="Group ID")
    group_name: str = Field(..., description="Group name")
    student_id: str | None = Field(None, description="Student ID")
    student_name: str | None = Field(None, description="Student display name")
    student_email: str | None = Field(None, description="Student email")

