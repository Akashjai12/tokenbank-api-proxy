import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Anonymous Token Bank & API Proxy"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Redis configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Upstream LLM Configuration
    # Supports OpenAI compatible endpoints or Google Gemini
    UPSTREAM_API_BASE: str = os.getenv("UPSTREAM_API_BASE", "https://generativelanguage.googleapis.com/v1beta/openai")
    UPSTREAM_API_KEY: str = os.getenv("UPSTREAM_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    UPSTREAM_DEFAULT_MODEL: str = os.getenv("UPSTREAM_DEFAULT_MODEL", "gemini-3.8-flash")
    
    # Token defaults & thresholds
    DEFAULT_ALLOCATION: int = 100_000
    DEFAULT_ESTIMATED_TOKENS_PER_CHAR: float = 0.25  # ~4 chars per token
    DEFAULT_MAX_COMPLETION_TOKENS: int = 500
    TOKEN_PREFIX: str = "tb_live_"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
