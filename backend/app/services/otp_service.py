import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_token
from app.models.user import OtpCode


def generate_6digit_code() -> str:
    """Generate a secure 6-digit numeric string."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def create_otp(
    db: AsyncSession, email: str, purpose: str
) -> str:
    """Generate an OTP, persist its SHA-256 hash in DB, and return the plain code."""
    code = generate_6digit_code()
    code_hash = hash_token(code)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.otp_ttl_seconds)

    # Invalidate previous unused codes for this email and purpose
    await db.execute(
        update(OtpCode)
        .where(
            OtpCode.email == email.strip().lower(),
            OtpCode.purpose == purpose,
            OtpCode.used_at.is_(None),
        )
        .values(used_at=now)
    )

    otp = OtpCode(
        email=email.strip().lower(),
        code_hash=code_hash,
        purpose=purpose,
        expires_at=expires_at,
        attempts=0,
    )
    db.add(otp)
    await db.commit()
    return code


async def verify_otp(
    db: AsyncSession, email: str, code: str, purpose: str
) -> bool:
    """Validate OTP against hash, expiration, and attempt limits."""
    code_hash = hash_token(code.strip())
    now = datetime.now(timezone.utc)

    stmt = (
        select(OtpCode)
        .where(
            OtpCode.email == email.strip().lower(),
            OtpCode.purpose == purpose,
            OtpCode.used_at.is_(None),
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
    )
    res = await db.execute(stmt)
    otp_record = res.scalars().first()

    if not otp_record:
        return False

    if otp_record.attempts >= settings.otp_max_attempts:
        return False

    if otp_record.code_hash != code_hash:
        otp_record.attempts += 1
        await db.commit()
        return False

    otp_record.used_at = now
    await db.commit()
    return True
