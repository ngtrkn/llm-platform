from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator, field_validator, Field
from typing import Optional, Any, Union
import json


def parse_cors_origins(value: Any) -> list[str]:
    """Parse CORS_ORIGINS from various formats to list"""
    if isinstance(value, str):
        # Try JSON first (for arrays like ["http://localhost:3000"])
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass
        
        # Otherwise, split by comma
        return [origin.strip() for origin in value.split(',') if origin.strip()]
    elif isinstance(value, list):
        return value
    return ["http://localhost:3000", "http://localhost:5173"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "LLM Platform"
    
    # LLM API Keys
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2023-05-15"
    
    # Database Settings
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    
    MONGODB_URL: Optional[str] = None
    MONGODB_DB: Optional[str] = "llm_platform"
    
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_COLLECTION: str = "embeddings"
    
    # CORS - accepts comma-separated string from .env or list
    # Use Union to allow string initially, validator will convert to list
    CORS_ORIGINS: Union[str, list[str]] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="CORS allowed origins (comma-separated string or JSON array)"
    )
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def validate_cors_origins(cls, v: Any) -> list[str]:
        """Convert CORS_ORIGINS to list format"""
        return parse_cors_origins(v)
    
    # CV Service
    CV_SERVICE_URL: str = "http://cv-service:8001"  # Docker service name, or http://localhost:8001 for local


settings = Settings()
