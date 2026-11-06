import logging
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models.user import RefreshToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    ResendCodeRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserOut,
    VerifyEmailRequest,
)
from app.services.email_service import get_otp_email_template, send_brevo_email
from app.services.otp_service import create_otp, verify_otp

logger = logging.getLogger("app.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    remember: bool = True,
):
    """Set hardened HttpOnly session cookies."""
    max_age_refresh = (settings.refresh_token_days * 86400) if remember else 86400
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=settings.access_token_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=max_age_refresh,
        path="/",
    )


def clear_auth_cookies(response: Response):
    """Clear session cookies."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=600, key_prefix="signup"))],
)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and dispatch a 6-digit verification code via Brevo."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] 👤 Signup request received for '{email}'")

    stmt = select(User).where(User.email == email)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        if existing.is_verified:
            logger.info(f"[AUTH-OBSERVABILITY] ℹ️ Existing verified account for '{email}', generic response returned")
            return {"message": "Verification code dispatched"}
        else:
            logger.info(f"[AUTH-OBSERVABILITY] ℹ️ Existing unverified account for '{email}', resending OTP")
            code = await create_otp(db, email=email, purpose="email_verification")
            await send_brevo_email(
                to_email=email,
                to_name=existing.full_name,
                subject="Your 6-Digit Verification Code",
                html_content=get_otp_email_template(
                    code,
                    "Verify your email",
                    "Use this 6-digit code to activate your account on Voice-to-Website AI:",
                ),
            )
            return {"message": "Verification code dispatched"}

    user = User(
        email=email,
        full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
        phone=body.phone_number,
        is_active=True,
        is_verified=False,
        role="user",
    )
    db.add(user)
    await db.commit()

    code = await create_otp(db, email=email, purpose="email_verification")
    await send_brevo_email(
        to_email=email,
        to_name=body.full_name,
        subject="Your 6-Digit Verification Code",
        html_content=get_otp_email_template(
            code,
            "Verify your email",
            "Use this 6-digit code to activate your account on Voice-to-Website AI:",
        ),
    )
    return {"message": "Verification code dispatched"}


@router.post(
    "/verify-email",
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=300, key_prefix="verify_email"))],
)
async def verify_email_route(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verify account email with a 6-digit OTP."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] 📧 Email verification attempt for '{email}'")

    valid = await verify_otp(db, email=email, code=body.code, purpose="email_verification")
    if not valid:
        logger.warning(f"[AUTH-OBSERVABILITY] ❌ Verification failed for '{email}' (invalid/expired code)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user:
        user.is_verified = True
        await db.commit()
        logger.info(f"[AUTH-OBSERVABILITY] ✅ Account '{email}' successfully marked verified")

    return {"message": "Email successfully verified"}


@router.post(
    "/resend-code",
    dependencies=[Depends(rate_limit(max_requests=3, window_seconds=300, key_prefix="resend_code"))],
)
async def resend_code(body: ResendCodeRequest, db: AsyncSession = Depends(get_db)):
    """Dispatch a fresh 6-digit verification code."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] 🔄 Resend verification code requested for '{email}'")

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user and not user.is_verified:
        code = await create_otp(db, email=email, purpose="email_verification")
        await send_brevo_email(
            to_email=email,
            to_name=user.full_name,
            subject="Your Fresh Verification Code",
            html_content=get_otp_email_template(
                code,
                "Your verification code",
                "Here is your new 6-digit verification code:",
            ),
        )
    return {"message": "If that email is registered, a fresh code was sent."}


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=300, key_prefix="login"))],
)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate credentials and establish JWT session cookies."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] 🔐 Login request for '{email}'")

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning(f"[AUTH-OBSERVABILITY] 🚫 Invalid credentials for '{email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    if not user.is_active:
        logger.warning(f"[AUTH-OBSERVABILITY] 🛑 Inactive user login blocked for '{email}'")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support.",
        )

    # 403 triggers frontend redirect to /verify-email
    if not user.is_verified:
        logger.info(f"[AUTH-OBSERVABILITY] ⏳ Unverified user login blocked for '{email}' -> dispatching OTP")
        code = await create_otp(db, email=email, purpose="email_verification")
        await send_brevo_email(
            to_email=email,
            to_name=user.full_name,
            subject="Verification Required for Sign In",
            html_content=get_otp_email_template(
                code,
                "Verify your account",
                "Your account requires email verification before signing in:",
            ),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="That email hasn't been verified yet. Enter the 6-digit code we sent you.",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
    )
    raw_refresh, token_hash = generate_refresh_token()
    family_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_days if body.remember_me else 1
    )

    db_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        family_id=family_id,
        expires_at=expires_at,
    )
    db.add(db_token)
    await db.commit()

    set_auth_cookies(response, access_token, raw_refresh, body.remember_me)
    logger.info(f"[AUTH-OBSERVABILITY] ✨ Login successful for '{email}' (User UUID: {user.id})")

    return LoginResponse(
        user=UserOut(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
        ),
        message="Sign in successful",
    )


@router.post(
    "/forgot-password",
    dependencies=[Depends(rate_limit(max_requests=3, window_seconds=300, key_prefix="forgot_pw"))],
)
async def forgot_password_route(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initiate password reset flow with a 6-digit OTP."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] ❓ Forgot password requested for '{email}'")

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user and user.is_active:
        code = await create_otp(db, email=email, purpose="password_reset")
        await send_brevo_email(
            to_email=email,
            to_name=user.full_name,
            subject="Password Reset Code",
            html_content=get_otp_email_template(
                code,
                "Reset your password",
                "Use this 6-digit code to choose a new password:",
            ),
        )

    return {"message": "If that email is registered, a reset code was dispatched."}


@router.post(
    "/reset-password",
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=300, key_prefix="reset_pw"))],
)
async def reset_password_route(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify reset OTP and update user password."""
    email = body.email.strip().lower()
    logger.info(f"[AUTH-OBSERVABILITY] 🛡️ Reset password attempt for '{email}'")

    valid = await verify_otp(db, email=email, code=body.code, purpose="password_reset")
    if not valid:
        logger.warning(f"[AUTH-OBSERVABILITY] ❌ Password reset failed for '{email}' (invalid or expired code)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    user.hashed_password = hash_password(body.password)
    await db.commit()
    logger.info(f"[AUTH-OBSERVABILITY] 🎉 Password successfully changed for '{email}'")
    return {"message": "Password successfully updated"}


@router.post("/refresh")
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Rotate refresh token and issue a fresh access token."""
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token.",
        )

    token_hash = hash_token(raw_refresh)
    now = datetime.now(timezone.utc)

    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    db_token = (await db.execute(stmt)).scalar_one_or_none()

    if not db_token or db_token.revoked_at is not None or db_token.expires_at < now:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    # Invalidate current token (Token Rotation)
    db_token.revoked_at = now

    user = await db.get(User, db_token.user_id)
    if not user or not user.is_active:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive.",
        )

    new_access = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
    )
    new_raw_refresh, new_token_hash = generate_refresh_token()
    new_expires_at = now + timedelta(days=settings.refresh_token_days)

    new_db_token = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        family_id=db_token.family_id,
        expires_at=new_expires_at,
    )
    db.add(new_db_token)
    await db.commit()

    set_auth_cookies(response, new_access, new_raw_refresh, remember=True)
    logger.info(f"[AUTH-OBSERVABILITY] 🔄 Session token rotated for user '{user.email}'")
    return {"message": "Session refreshed successfully"}


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Fetch profile of current authenticated user."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )

    user_id = uuid.UUID(payload["sub"])
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Revoke refresh token and wipe session cookies."""
    raw_refresh = request.cookies.get("refresh_token")
    if raw_refresh:
        token_hash = hash_token(raw_refresh)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        db_token = (await db.execute(stmt)).scalar_one_or_none()
        if db_token and db_token.revoked_at is None:
            db_token.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    clear_auth_cookies(response)
    logger.info("[AUTH-OBSERVABILITY] 🚪 User logged out, session terminated")
    return {"message": "Successfully signed out."}
