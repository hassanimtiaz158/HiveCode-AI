from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Checks both locations so it works from the repo root or from backend/
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        extra="ignore",
    )

    # Application
    env: str = "dev"  # dev | staging | production | test

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    test_database_url: str = ""

    # JWT & sessions
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # Brevo email
    brevo_api_key: str = ""
    brevo_sender_email: str = "noreply@voicetowebsite.ai"
    brevo_sender_name: str = "Voice-to-Website AI"

    # OTP
    otp_ttl_seconds: int = 60
    otp_max_attempts: int = 5

    # ElevenLabs Speech-to-Text
    elevenlabs_api_key: str = ""
    elevenlabs_stt_model_id: str = "scribe_v1"

    @model_validator(mode="after")
    def _validate_production(self):
        if self.env in ("staging", "production"):
            if len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be a random value of 32+ chars in staging/production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be True in staging/production")
        return self


settings = Settings()