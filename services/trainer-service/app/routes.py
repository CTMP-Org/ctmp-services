"""API routes for trainer-service."""

import logging
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import require_trainer
from app.models import (
    AwsTemplateRequest,
    AwsTemplateResponse,
    TrainingGroup,
    AssignStudentsRequest,
    CreateGroupAndStudentsRequest,
    CreateGroupAndStudentsResponse,
    EC2Instance,
    StudentInstanceResponse,
)
from app.database import (
    get_db,
    User as DbUser,
    TrainingGroup as DbGroup,
    EC2Instance as DbInstance,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trainer", tags=["trainer"])

# --- Database routes ---

@router.post("/aws-template", response_model=AwsTemplateResponse)
async def generate_aws_template(
    body: AwsTemplateRequest,
    claims: Annotated[dict, Depends(require_trainer)],
) -> AwsTemplateResponse:
    """Generate a CloudFormation YAML template to establish OIDC federation trust."""
    tenant_id = body.azure_tenant_id
    client_id = body.azure_client_id
    role_name = body.aws_role_name

    cf_template = f"""AWSTemplateFormatVersion: '2010-09-09'
Description: OIDC Trust Federation with Azure Active Directory (Entra ID) for EC2 management.

Parameters:
  AzureTenantID:
    Type: String
    Default: "{tenant_id}"
    Description: The Azure AD (Entra ID) Tenant ID.
  AzureClientID:
    Type: String
    Default: "{client_id}"
    Description: The Client ID of the Azure Managed Identity to trust.

Resources:
  AzureOIDCProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: !Sub "https://sts.windows.net/${{AzureTenantID}}/"
      ClientIdList:
        - !Ref AzureClientID
      ThumbprintList:
        - df3c24f9bfd666761b268073fe06d1cc8d4f82a4

  AzureFederatedRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: "{role_name}"
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Ref AzureOIDCProvider
            Action: sts:AssumeRoleWithWebIdentity
          Condition:
            StringEquals:
              sts.windows.net/{tenant_id}/:aud: !Ref AzureClientID
      Policies:
        - PolicyName: EC2LifecycleManagement
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ec2:StartInstances
                  - ec2:StopInstances
                  - ec2:RebootInstances
                  - ec2:DescribeInstances
                  - ec2:DescribeInstanceStatus
                Resource: '*'

Outputs:
  RoleArn:
    Description: ARN of the federated IAM Role to assume.
    Value: !GetAtt AzureFederatedRole.Arn
"""
    return AwsTemplateResponse(template_yaml=cf_template)


@router.get("/instances", response_model=list[StudentInstanceResponse])
async def get_trainer_instances(
    claims: Annotated[dict, Depends(require_trainer)],
    db: Session = Depends(get_db),
) -> list[StudentInstanceResponse]:
    """Retrieve all instances for the trainer's groups or all if admin/no groups."""
    trainer_id = claims.get("sub", "")
    # Get groups where this trainer is assigned
    db_groups = db.query(DbGroup).filter(DbGroup.trainer_id == trainer_id).all()
    group_ids = [g.id for g in db_groups]
    
    # If the user is Admin or has no groups, let them see all instances
    roles = claims.get("roles", [])
    if "Admin" in roles or not group_ids:
        query = db.query(DbInstance)
    else:
        query = db.query(DbInstance).filter(DbInstance.group_id.in_(group_ids))
        
    db_instances = query.all()
    
    result = []
    for inst in db_instances:
        student_name = ""
        student_email = ""
        if inst.student:
            student_name = inst.student.name or inst.student.username
            student_email = inst.student.email or ""
            
        group_name = inst.group.name if inst.group else "Default Group"
        
        result.append(StudentInstanceResponse(
            id=inst.id,
            name=inst.name or "Unnamed Instance",
            state=inst.state or "unknown",
            instance_type=inst.instance_type or "t3.micro",
            launch_time=inst.launch_time or datetime.utcnow(),
            group_id=inst.group_id,
            group_name=group_name,
            student_id=inst.student_id,
            student_name=student_name,
            student_email=student_email
        ))
    return result


@router.get("/groups", response_model=list[TrainingGroup])
async def get_trainer_groups(
    claims: Annotated[dict, Depends(require_trainer)],
    db: Session = Depends(get_db),
) -> list[TrainingGroup]:
    """Retrieve all training groups assigned to the currently authenticated trainer."""
    trainer_id = claims.get("sub", "")
    db_groups = db.query(DbGroup).filter(DbGroup.trainer_id == trainer_id).all()
        
    result = []
    for g in db_groups:
        result.append(TrainingGroup(
            id=g.id,
            name=g.name,
            description=g.description or "",
            trainer_id=g.trainer_id or "",
            student_ids=[s.id for s in g.students],
            created_at=g.created_at,
            aws_account_id=g.aws_account_id or "",
            aws_region=g.aws_region or "us-east-1"
        ))
    return result


@router.post("/groups", response_model=CreateGroupAndStudentsResponse)
async def create_group_with_students(
    body: CreateGroupAndStudentsRequest,
    claims: Annotated[dict, Depends(require_trainer)],
    db: Session = Depends(get_db),
) -> CreateGroupAndStudentsResponse:
    """Create a new training group and generate its student user accounts in one step."""
    from app.models import GeneratedStudentCredentials
    import string
    import random
    
    try:
        group_id = f"group-{uuid.uuid4().hex[:6]}"
        db_group = DbGroup(
            id=group_id,
            name=body.name,
            description=body.description,
            trainer_id=claims.get("sub"),
            aws_account_id=body.aws_account_id,
            aws_region=body.aws_region
        )
        db.add(db_group)
        db.commit()
        
        created_students = []
        students_to_create = []
        
        # Parse email strings
        for email in body.student_emails:
            email = email.strip()
            if not email:
                continue
            username = email.split("@")[0]
            name = username.replace(".", " ").title()
            students_to_create.append((username, email, name))
            
        # Parse auto-generation count
        for i in range(body.auto_generate_count):
            rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
            username = f"student_{i+1}_{rand_suffix}"
            email = f"{username}@training.sneakertail.online"
            name = f"Student {i+1} ({rand_suffix})"
            students_to_create.append((username, email, name))
            
        for username, email, name in students_to_create:
            student_id = f"user-{uuid.uuid4().hex[:6]}"
            raw_password = "CTMP-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            invite_token = str(uuid.uuid4())
            
            db_user = DbUser(
                id=student_id,
                username=username,
                email=email,
                hashed_password=DbUser.hash_password(raw_password),
                name=name,
                role="Student",
                invite_token=invite_token
            )
            db.add(db_user)
            db.commit()
            
            # Associate user with group
            db_group.students.append(db_user)
            db.commit()
            
            login_link = f"http://localhost:3000/login?token={invite_token}"
            
            created_students.append(GeneratedStudentCredentials(
                id=student_id,
                username=username,
                password=raw_password,
                name=name,
                invite_token=invite_token,
                login_link=login_link
            ))
            
        db.refresh(db_group)
        
        return CreateGroupAndStudentsResponse(
            group_id=group_id,
            name=db_group.name,
            student_count=len(db_group.students),
            created_students=created_students
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create group and students: {str(e)}"
        )


@router.post("/groups/{group_id}/students", response_model=TrainingGroup)
async def assign_students_to_group(
    group_id: str,
    body: AssignStudentsRequest,
    claims: Annotated[dict, Depends(require_trainer)],
    db: Session = Depends(get_db),
) -> TrainingGroup:
    """Assign existing students to a training group."""
    group = db.query(DbGroup).filter(DbGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training group {group_id} not found",
        )
        
    for s_id in body.student_ids:
        student = db.query(DbUser).filter(DbUser.id == s_id).first()
        if student and student not in group.students:
            group.students.append(student)
            
    db.commit()
    db.refresh(group)
    
    return TrainingGroup(
        id=group.id,
        name=group.name,
        description=group.description or "",
        trainer_id=group.trainer_id or "",
        student_ids=[s.id for s in group.students],
        created_at=group.created_at,
        aws_account_id=group.aws_account_id or "",
        aws_region=group.aws_region or "us-east-1"
    )


@router.get("/groups/{group_id}/instances", response_model=list[EC2Instance])
async def list_group_instances(
    group_id: str,
    claims: Annotated[dict, Depends(require_trainer)],
    db: Session = Depends(get_db),
) -> list[EC2Instance]:
    """List all EC2 instances associated with a training group."""
    group = db.query(DbGroup).filter(DbGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training group {group_id} not found",
        )
        
    result = []
    for inst in group.instances:
        result.append(EC2Instance(
            id=inst.id,
            name=inst.name or "",
            state=inst.state,
            instance_type=inst.instance_type,
            launch_time=inst.launch_time,
            group_id=inst.group_id,
            student_id=inst.student_id or ""
        ))
    return result

