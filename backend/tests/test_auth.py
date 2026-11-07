import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import hash_token
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.user import OtpCode, RefreshToken, User


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter buckets before each test."""
    limiter.reset()


@pytest.mark.anyio
async def test_signup_and_email_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"signup_{uuid.uuid4().hex[:8]}@example.com"
        signup_payload = {
            "email": unique_email,
            "full_name": "Test Merchant",
            "password": "SecurePassword123!",
            "phone_number": "+923001234567",
        }

        # 1. Signup
        res = await client.post("/api/v1/auth/signup", json=signup_payload)
        assert res.status_code == 201
        assert res.json()["message"] == "Verification code dispatched"

        # Check DB: user exists but is unverified
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.email == unique_email)
            user = (await session.execute(stmt)).scalar_one_or_none()
            assert user is not None
            assert user.is_verified is False

            # Retrieve OTP code hash from DB
            otp_stmt = select(OtpCode).where(
                OtpCode.email == unique_email,
                OtpCode.purpose == "email_verification",
            )
            otp_record = (await session.execute(otp_stmt)).scalars().first()
            assert otp_record is not None

        # 2. Login before verification returns 403
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "SecurePassword123!"},
        )
        assert login_res.status_code == 403
        assert "verified" in login_res.json()["detail"].lower()

        # 3. Invalid OTP code fails
        invalid_verify = await client.post(
            "/api/v1/auth/verify-email",
            json={"email": unique_email, "code": "000000"},
        )
        assert invalid_verify.status_code == 400

        # Get the latest active OTP code record
        known_code = "123456"
        async with AsyncSessionLocal() as session:
            stmt = (
                select(OtpCode)
                .where(
                    OtpCode.email == unique_email,
                    OtpCode.purpose == "email_verification",
                    OtpCode.used_at.is_(None),
                )
                .order_by(OtpCode.created_at.desc())
            )
            record = (await session.execute(stmt)).scalars().first()
            record.code_hash = hash_token(known_code)
            await session.commit()

        # 4. Valid OTP verifies account
        verify_res = await client.post(
            "/api/v1/auth/verify-email",
            json={"email": unique_email, "code": known_code},
        )
        assert verify_res.status_code == 200

        # 5. Login succeeds now
        login_success = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "SecurePassword123!"},
        )
        assert login_success.status_code == 200
        data = login_success.json()
        assert data["user"]["email"] == unique_email
        assert data["user"]["is_verified"] is True
        assert "access_token" in login_success.cookies
        assert "refresh_token" in login_success.cookies


@pytest.mark.anyio
async def test_session_refresh_and_logout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"session_{uuid.uuid4().hex[:8]}@example.com"
        signup_payload = {
            "email": unique_email,
            "full_name": "Session User",
            "password": "Password123!",
        }
        await client.post("/api/v1/auth/signup", json=signup_payload)

        # Mark user verified in DB
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.email == unique_email)
            user = (await session.execute(stmt)).scalar_one()
            user.is_verified = True
            await session.commit()

        # Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "Password123!"},
        )
        assert login_res.status_code == 200

        # /me endpoint
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["email"] == unique_email

        # Refresh session
        refresh_res = await client.post("/api/v1/auth/refresh")
        assert refresh_res.status_code == 200

        # Logout
        logout_res = await client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200


@pytest.mark.anyio
async def test_forgot_and_reset_password():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
        await client.post(
            "/api/v1/auth/signup",
            json={"email": unique_email, "full_name": "Reset User", "password": "OldPassword123!"},
        )

        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.email == unique_email)
            user = (await session.execute(stmt)).scalar_one()
            user.is_verified = True
            await session.commit()

        # Request reset code
        forgot_res = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": unique_email},
        )
        assert forgot_res.status_code == 200

        # Set known code in DB for reset
        known_code = "654321"
        async with AsyncSessionLocal() as session:
            stmt = select(OtpCode).where(
                OtpCode.email == unique_email,
                OtpCode.purpose == "password_reset",
            )
            record = (await session.execute(stmt)).scalars().first()
            record.code_hash = hash_token(known_code)
            await session.commit()

        # Reset password
        reset_res = await client.post(
            "/api/v1/auth/reset-password",
            json={"email": unique_email, "code": known_code, "password": "BrandNewPassword123!"},
        )
        assert reset_res.status_code == 200

        # Old password fails
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "OldPassword123!"},
        )
        assert bad_login.status_code == 401

        # New password succeeds
        good_login = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "BrandNewPassword123!"},
        )
        assert good_login.status_code == 200


@pytest.mark.anyio
async def test_rate_limiting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Rate limit on login is 5 requests per 300s
        for _ in range(5):
            res = await client.post(
                "/api/v1/auth/login",
                json={"email": "ratelimit@example.com", "password": "wrong"},
            )
            assert res.status_code in (401, 403, 404)

        # 6th attempt is throttled
        throttled_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "ratelimit@example.com", "password": "wrong"},
        )
        assert throttled_res.status_code == 429
        assert "too many attempts" in throttled_res.json()["detail"].lower()


@pytest.mark.anyio
async def test_signup_already_verified_returns_409():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"verified_{uuid.uuid4().hex[:8]}@example.com"
        signup_payload = {
            "email": unique_email,
            "full_name": "Already Verified",
            "password": "Password123!",
        }
        # First signup
        res1 = await client.post("/api/v1/auth/signup", json=signup_payload)
        assert res1.status_code == 201

        # Mark user verified in DB
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.email == unique_email)
            user = (await session.execute(stmt)).scalar_one()
            user.is_verified = True
            await session.commit()

        # Attempt to sign up again with the verified email
        res2 = await client.post("/api/v1/auth/signup", json=signup_payload)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"].lower()


@pytest.mark.anyio
async def test_signup_unverified_also_returns_409():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"unverified_{uuid.uuid4().hex[:8]}@example.com"
        signup_payload = {
            "email": unique_email,
            "full_name": "Unverified User",
            "password": "Password123!",
        }
        # First signup succeeds
        res1 = await client.post("/api/v1/auth/signup", json=signup_payload)
        assert res1.status_code == 201

        # Second signup attempt with the same unverified email returns 409 Conflict
        res2 = await client.post("/api/v1/auth/signup", json=signup_payload)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"].lower()
