import logging
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_token
from app.models.user import OtpCode

logger = logging.getLogger("app.services.otp")


def generate_6digit_code() -> str:
    """Generate a secure 6-digit numeric string."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def create_otp(
    db: AsyncSession, email: str, purpose: str
) -> str:
    """Generate an OTP, persist its SHA-256 hash in DB, and return the plain code with observability logging."""
    code = generate_6digit_code()
    code_hash = hash_token(code)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.otp_ttl_seconds)

    # Invalidate previous unused codes for this email and purpose
    update_res = await db.execute(
        update(OtpCode)
        .where(
            OtpCode.email == email.strip().lower(),
            OtpCode.purpose == purpose,
            OtpCode.used_at.is_(None),
        )
        .values(used_at=now)
    )
    if update_res.rowcount and update_res.rowcount > 0:
        logger.info(
            f"[OTP-OBSERVABILITY] 🔄 Invalidated {update_res.rowcount} previous pending OTP(s) for {email} ({purpose})"
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

    # In dev/staging, display code clearly for convenient testing; in prod, mask it
    display_code = code if settings.env != "production" else f"{code[0]}****{code[-1]}"

    logger.info(
        "[OTP-OBSERVABILITY] 🔑 New OTP Code Generated\n"
        f"  Email     : {email}\n"
        f"  Purpose   : {purpose}\n"
        f"  Code      : {display_code}\n"
        f"  TTL       : {settings.otp_ttl_seconds} seconds\n"
        f"  ExpiresAt : {expires_at.isoformat()}\n"
        f"  Digest    : {code_hash[:12]}..."
    )
    return code


async def verify_otp(
    db: AsyncSession, email: str, code: str, purpose: str
) -> bool:
    """Validate OTP against hash, expiration, and attempt limits with observability logging."""
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
        logger.warning(
            "[OTP-OBSERVABILITY] ⚠️ OTP verification failed (no active unexpired record found)\n"
            f"  Email     : {email}\n"
            f"  Purpose   : {purpose}\n"
            f"  Timestamp : {now.isoformat()}"
        )
        return False

    if otp_record.attempts >= settings.otp_max_attempts:
        logger.warning(
            "[OTP-OBSERVABILITY] 🛑 OTP verification rejected: Maximum attempts exceeded!\n"
            f"  Email     : {email}\n"
            f"  Purpose   : {purpose}\n"
            f"  Attempts  : {otp_record.attempts}/{settings.otp_max_attempts}\n"
            f"  Timestamp : {now.isoformat()}"
        )
        return False

    if otp_record.code_hash != code_hash:
        otp_record.attempts += 1
        await db.commit()
        logger.warning(
            "[OTP-OBSERVABILITY] ❌ OTP verification mismatch\n"
            f"  Email     : {email}\n"
            f"  Purpose   : {purpose}\n"
            f"  Attempt   : {otp_record.attempts}/{settings.otp_max_attempts}\n"
            f"  Timestamp : {now.isoformat()}"
        )
        return False

    otp_record.used_at = now
    await db.commit()
    logger.info(
        "[OTP-OBSERVABILITY] 🔓 OTP verification successful!\n"
        f"  Email     : {email}\n"
        f"  Purpose   : {purpose}\n"
        f"  Attempt   : {otp_record.attempts + 1}\n"
        f"  Timestamp : {now.isoformat()}"
    )
    return True
