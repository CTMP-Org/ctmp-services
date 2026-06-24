"""Pydantic models for auth-service."""

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    """Represents a user profile extracted from JWT claims."""

    sub: str = Field(..., description="Subject identifier (user ID)")
    name: str = Field(default="", description="Display name")
    email: str = Field(default="", description="Email address")
    preferred_username: str = Field(default="", description="Preferred username / UPN")
    roles: list[str] = Field(default_factory=list, description="Assigned application roles")
    groups: list[str] = Field(default_factory=list, description="Group memberships")
    tenant_id: str = Field(default="", description="Azure AD tenant ID")
    oid: str = Field(default="", description="Object ID in Azure AD")


class TokenValidationRequest(BaseModel):
    """Request body for token validation endpoint."""

    token: str = Field(..., description="JWT token to validate")


class TokenValidationResponse(BaseModel):
    """Response for token validation endpoint."""

    valid: bool = Field(..., description="Whether the token is valid")
    claims: dict | None = Field(default=None, description="Decoded token claims if valid")
    error: str | None = Field(default=None, description="Error message if invalid")


class RoleResponse(BaseModel):
    """Response containing user's application roles."""

    user_id: str = Field(..., description="User's subject identifier")
    roles: list[str] = Field(default_factory=list, description="Assigned application roles")
    is_admin: bool = Field(default=False, description="Whether user has admin role")
    is_trainer: bool = Field(default=False, description="Whether user has trainer role")
    is_student: bool = Field(default=False, description="Whether user has student role")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service health status")


class LoginRequest(BaseModel):
    username: str = Field(..., description="Local account username")
    password: str = Field(..., description="Password")


class LoginResponse(BaseModel):
    token: str = Field(..., description="Session token")
    user: UserProfile = Field(..., description="Decoded user profile")

