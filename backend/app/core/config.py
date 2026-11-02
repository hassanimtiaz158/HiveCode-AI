from typing import List, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/app/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "dev"  # dev | staging | production | test
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voicetoai_db"

    # JWT & Session
    jwt_secret: str = "voicetoai_super_secret_development_key_32_characters_minimum"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 30
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_secure: bool = False  # Set to True in production with HTTPS
    cors_origins: List[str] = ["http://localhost:5173"]

    # Brevo Transactional Email Service
    brevo_api_key: str = ""
    brevo_sender_email: str = "noreply@voicetowebsite.ai"
    brevo_sender_name: str = "Voice-to-Website AI"

    # OTP Settings
    otp_ttl_seconds: int = 60  # Matches frontend countdown (60s)
    otp_max_attempts: int = 5

    @model_validator(mode="after")
    def _require_real_secret(self):
        if self.env in ("staging", "production") and (
            not self.jwt_secret or len(self.jwt_secret) < 32
        ):
            raise ValueError("JWT_SECRET must be a random value of 32+ chars in staging/production")
        return self


settings = Settings()
