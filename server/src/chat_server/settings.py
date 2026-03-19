from functools import lru_cache

from pydantic import PostgresDsn, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )

    ENVIRONMENT: str

    # CORS Origin allowed
    ORIGINS: list[str]

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"

    SUPERUSER_USERNAME: str = "admin"
    SUPERUSER_PASSWORD: str = "admin"

    # PostgreSQL Configuration
    POSTGRES_USER: str = "chatuser"
    POSTGRES_PASSWORD: str = "chatpassword"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "chatdb"

    @computed_field
    @property
    def DATABASE_URL(self) -> PostgresDsn:
        """
        Construct PostgreSQL connection URL.
        """
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Use this function to access settings throughout the application.
    """
    return Settings()
