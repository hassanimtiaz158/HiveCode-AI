import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
from jwt.exceptions import PyJWTError

from app.core.config import settings

# OWASP Recommended Argon2 password hashing with fallback
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import InvalidHashError, VerifyMismatchError

    _hasher = PasswordHasher()

    def hash_password(password: str) -> str:
        """Hash a plaintext password using Argon2id."""
        return _hasher.hash(password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against an Argon2 or bcrypt hash."""
        try:
            return _hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            return False
        except Exception:
            return False

except ImportError:
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)


def hash_token(raw_token: str) -> str:
    """Return SHA-256 hex digest for secure storage of refresh and OTP tokens."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a signed JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_minutes)
    )
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a signed JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except PyJWTError:
        return None


def generate_refresh_token() -> Tuple[str, str]:
    """Generate a cryptographically strong random token and its SHA-256 hash."""
    raw_token = secrets.token_urlsafe(48)
    return raw_token, hash_token(raw_token)
