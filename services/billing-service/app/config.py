"""Configuration for billing-service using Pydantic Settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Billing service configuration loaded from environment variables."""

    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    JWKS_URL: str = ""
    ISSUER: str = ""
    AUDIENCE: str = ""
    CORS_ORIGINS: str = "*"
    LOG_LEVEL: str = "INFO"
    SERVICE_NAME: str = "billing-service"
    PORT: int = 8000

    @property
    def jwks_uri(self) -> str:
        if self.JWKS_URL:
            return self.JWKS_URL
        return f"https://login.microsoftonline.com/{self.AZURE_TENANT_ID}/discovery/v2.0/keys"

    @property
    def token_issuer(self) -> str:
        if self.ISSUER:
            return self.ISSUER
        return f"https://login.microsoftonline.com/{self.AZURE_TENANT_ID}/v2.0"

    @property
    def token_audience(self) -> str | list[str]:
        if self.AUDIENCE:
            return self.AUDIENCE
        if not self.AZURE_CLIENT_ID:
            return ""
        return [self.AZURE_CLIENT_ID, f"api://{self.AZURE_CLIENT_ID}"]

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()
