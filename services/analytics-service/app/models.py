"""Pydantic models for analytics-service."""

from datetime import datetime
from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    """Overall platform dashboard metrics."""

    active_instances: int
    total_users: int
    cpu_utilization_avg: float = Field(..., description="Average CPU utilization across instances")
    active_groups: int
    total_spend_usd: float


class InstanceMetricsPoint(BaseModel):
    """Single time-series data point for instances."""

    timestamp: datetime
    running_count: int
    stopped_count: int


class CostMetricsPoint(BaseModel):
    """Single time-series data point for costs."""

    timestamp: datetime
    cumulative_cost_usd: float


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
