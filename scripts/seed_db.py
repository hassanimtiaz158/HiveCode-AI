"""Database seed script for Voice-to-Website AI.

Populates default subscription plans and initial test users for the 3 core personas.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import Plan, Subscription, User


async def seed():
    async with AsyncSessionLocal() as session:
        print("[INFO] Seeding subscription plans...")
        # 1. Plans
        plans_data = [
            Plan(
                id="free_tier",
                name="Free Starter",
                monthly_token_quota=100_000,
                max_projects=2,
                max_edits_per_month=10,
                price_cents=0,
            ),
            Plan(
                id="pro_tier",
                name="Pro Merchant",
                monthly_token_quota=1_000_000,
                max_projects=10,
                max_edits_per_month=100,
                price_cents=2900,
            ),
        ]

        for plan in plans_data:
            existing = await session.get(Plan, plan.id)
            if not existing:
                session.add(plan)
                print(f"  + Added plan: {plan.name} ({plan.id})")
            else:
                print(f"  . Plan already exists: {plan.name}")

        await session.flush()

        print("\n[INFO] Seeding test users (Personas)...")
        # 2. Test Users
        users_data = [
            {
                "email": "tariq.khan@example.com",
                "full_name": "Tariq Khan",
                "phone": "+923001234567",
                "role": "user",
                "password": "Password123!",
                "plan_id": "free_tier",
            },
            {
                "email": "zainab.ahmed@example.com",
                "full_name": "Zainab Ahmed",
                "phone": "+923219876543",
                "role": "developer",
                "password": "Password123!",
                "plan_id": "pro_tier",
            },
            {
                "email": "admin@voicetoai.com",
                "full_name": "Super Admin",
                "phone": "+923000000000",
                "role": "admin",
                "password": "AdminSecurePassword123!",
                "plan_id": "pro_tier",
            },
        ]

        now = datetime.now(timezone.utc)
        one_month_later = now + timedelta(days=30)

        for u in users_data:
            stmt = select(User).where(User.email == u["email"])
            res = await session.execute(stmt)
            existing_user = res.scalar_one_or_none()

            if not existing_user:
                new_user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    phone=u["phone"],
                    role=u["role"],
                    hashed_password=hash_password(u["password"]),
                    is_active=True,
                    is_verified=True,
                )
                session.add(new_user)
                await session.flush()

                # Assign active subscription
                subscription = Subscription(
                    user_id=new_user.id,
                    plan_id=u["plan_id"],
                    status="active",
                    current_period_start=now,
                    current_period_end=one_month_later,
                )
                session.add(subscription)
                print(f"  + Added user: {new_user.full_name} <{new_user.email}> [{new_user.role}]")
            else:
                print(f"  . User already exists: {existing_user.email}")

        await session.commit()
        print("\n[SUCCESS] Database seeding successfully completed!")


if __name__ == "__main__":
    asyncio.run(seed())
