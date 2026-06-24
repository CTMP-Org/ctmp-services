"""Pydantic models for billing-service."""

from datetime import datetime
from pydantic import BaseModel, Field


class CostDetail(BaseModel):
    """Cost details for a specific date or resource."""

    date: datetime = Field(..., description="Date of the cost record")
    amount: float = Field(..., description="Cost amount")
    currency: str = Field(default="USD", description="Cost currency")
    resource_type: str = Field(default="EC2", description="AWS service resource type")


class CostResponse(BaseModel):
    """Aggregated cost response."""

    total_cost: float = Field(..., description="Summed cost for the query")
    currency: str = Field(default="USD")
    start_date: datetime
    end_date: datetime
    details: list[CostDetail] = Field(default_factory=list)


class GroupCostResponse(BaseModel):
    """Cost response for a specific group."""

    group_id: str
    total_cost: float
    currency: str = Field(default="USD")
    details: list[CostDetail] = Field(default_factory=list)


class StudentCostResponse(BaseModel):
    """Cost response for a specific student."""

    student_id: str
    total_cost: float
    currency: str = Field(default="USD")
    details: list[CostDetail] = Field(default_factory=list)


class BillingSummaryResponse(BaseModel):
    """Dashboard billing summary."""

    total_platform_cost: float = Field(..., description="Total platform cost to date")
    active_groups_count: int
    active_students_count: int
    top_spending_group_id: str
    currency: str = Field(default="USD")
    monthly_budget: float
    budget_utilization_percentage: float


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
