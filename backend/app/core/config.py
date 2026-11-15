from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseModel):
    env: Literal["development", "test", "production"] = "development"
    base_url: str = "http://localhost:8000"
    log_level: str = "INFO"
    version: str = "1.0.0"


class DatabaseConfig(BaseModel):
    url: str = "postgresql+asyncpg://pymentor:pymentor@localhost:5432/pymentor"
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False


class AuthConfig(BaseModel):
    jwt_secret: str = "dev-only-change-before-production-minimum-32-chars"
    jwt_algorithm: str = "HS256"
    access_ttl_seconds: int = 900
    refresh_ttl_seconds: int = 1209600
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"


class AIConfig(BaseModel):
    provider: str = "openai-compatible"
    base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    api_key: str = ""
    model: str = "gemini-4-hydrogen"
    fallback_model: str = "gemini-3.1-flash-lite"
    classifier_model: str = "gemini-3.1-flash-lite"
    embedding_model: str = "gemini-embedding-2"
    embedding_dim: int = 768
    timeout_seconds: float = 30.0
    daily_token_quota: int = 100_000


class ExecutionConfig(BaseModel):
    enabled: bool = True
    url: str = "http://executor:8080"
    internal_token: str = "dev-executor-token-change-in-prod"
    timeout_seconds: float = 10.0
    daily_quota: int = 50


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",
    )

    app: AppConfig = Field(default_factory=AppConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis_url: str = "redis://localhost:6379/0"
    auth: AuthConfig = Field(default_factory=AuthConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    execution: ExecutionConfig = Field(default_factory=ExecutionConfig)
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app.env == "production":
            if "dev-only" in self.auth.jwt_secret or len(self.auth.jwt_secret) < 32:
                raise ValueError("AUTH__JWT_SECRET must be set to a strong 32+ char secret in production.")
            if not self.auth.cookie_secure:
                raise ValueError("AUTH__COOKIE_SECURE must be true in production.")
            if "*" in self.cors_allowed_origins:
                raise ValueError("Wildcard CORS origins are prohibited in production.")
            if self.execution.enabled and "dev-executor-token" in self.execution.internal_token:
                raise ValueError("EXECUTION__INTERNAL_TOKEN must be rotated for production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
