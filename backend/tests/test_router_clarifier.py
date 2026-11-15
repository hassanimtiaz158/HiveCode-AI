import uuid
import pytest
from sqlalchemy import select

from app.agents.clarifier import (
    get_default_clarifier_questions,
    run_clarifier_turn,
    synthesize_default_requirements,
)
from app.agents.router import heuristic_route, route_intent
from app.core.config import settings
from app.core.llm import get_effective_llm_config
from app.db.session import AsyncSessionLocal
from app.models.project import Decision, Project, Requirement
from app.models.user import User


@pytest.mark.anyio
async def test_llm_provider_switching_detection():
    """
    Verifies that changing the API key automatically switches between
    Qwen (dev) and Claude (production) without changing any code.
    """
    # 1. Dev / default (Qwen)
    settings.llm_api_key = "sk-or-v1-dev-free-key-12345"
    settings.anthropic_api_key = ""
    settings.llm_model = ""
    provider, model, key, base_url = get_effective_llm_config()
    assert provider == "qwen"
    assert "qwen" in model.lower()

    # 2. Production (Claude 3.5 Haiku) - simply changed key to Anthropic
    settings.llm_api_key = "sk-ant-api03-production-key-67890"
    provider, model, key, base_url = get_effective_llm_config()
    assert provider == "anthropic"
    assert "claude" in model.lower()

    # Reset
    settings.llm_api_key = ""


@pytest.mark.anyio
async def test_router_prompt_classification():
    """
    Verifies tri-modal classification across English and Roman Urdu prompts.
    """
    # QUESTION
    res_q1 = await route_intent("How can I connect my custom domain to this store?")
    assert res_q1.intent == "QUESTION"

    res_q2 = await route_intent("Yeh website live hone ke baad payment kaise milegi?")
    assert res_q2.intent == "QUESTION"

    # SMALL_EDIT
    res_e1 = await route_intent("Change the background color of the header to navy blue")
    assert res_e1.intent == "SMALL_EDIT"

    res_e2 = await route_intent("Button ka font size thora bara kardo aur color green kardo")
    assert res_e2.intent == "SMALL_EDIT"

    # NEW_OR_MAJOR
    res_n1 = await route_intent("Build an online artisanal coffee roastery store with subscription plans")
    assert res_n1.intent == "NEW_OR_MAJOR"

    res_n2 = await route_intent("Mujhe Lahore mein mithai aur bakery ke liye online website chahiye")
    assert res_n2.intent == "NEW_OR_MAJOR"


@pytest.mark.anyio
async def test_clarifier_question_and_option_generation():
    """
    Verifies Clarifier generates 3 to 5 questions and every question has 'You Decide'.
    """
    project_id = str(uuid.uuid4())
    result = await run_clarifier_turn(
        project_id=project_id,
        user_prompt="Build a website for my handmade rugs shop in Peshawar",
        turn=0,
        answers=None,
    )

    assert result.is_complete is False
    assert result.turn == 1
    assert 3 <= len(result.questions) <= 5

    for q in result.questions:
        assert "id" in q
        assert "question" in q
        assert "options" in q
        assert len(q["options"]) >= 3
        # Must include the You Decide / Recommended fallback option
        assert any("You Decide" in opt or "Recommended" in opt for opt in q["options"])


@pytest.mark.anyio
async def test_clarification_synthesis_and_db_audit_persistence():
    """
    Verifies that answering questions synthesizes a valid RequirementsContract
    and persists decisions to 'decisions' and requirements to 'requirements' tables.
    """
    async with AsyncSessionLocal() as session:
        # Create a test user and test project
        test_user = User(
            email=f"clarify_{uuid.uuid4().hex[:8]}@example.com",
            full_name="Clarify Test User",
            hashed_password="hash",
            is_active=True,
            is_verified=True,
        )
        session.add(test_user)
        await session.flush()

        test_project = Project(
            owner_id=test_user.id,
            name="Lahore Bakery Project",
            stack_profile="vite-react-tailwind",
        )
        session.add(test_project)
        await session.commit()
        project_id = str(test_project.id)

    # User answers questions, selecting one 'You Decide' option
    user_answers = {
        "business_type": "Artisan Bakery & Cafe",
        "color_palette": "You Decide (Recommended)",
        "primary_cta": "Order / Chat via WhatsApp button",
    }

    async with AsyncSessionLocal() as session:
        result = await run_clarifier_turn(
            project_id=project_id,
            user_prompt="Lahore Delights Bakery website",
            turn=1,
            answers=user_answers,
            db=session,
        )

        assert result.is_complete is True
        assert result.requirements is not None
        req = result.requirements
        assert req["business_name"] != ""
        assert req["palette"]["primary"].startswith("#")
        assert len(req["navigation"]) >= 1
        assert len(req["features"]) >= 1

        # Check DB persistence for decisions
        stmt_dec = select(Decision).where(Decision.project_id == uuid.UUID(project_id))
        decisions = (await session.execute(stmt_dec)).scalars().all()
        assert len(decisions) >= 3

        # Verify source tagging ('user' vs 'ai_default')
        sources = {d.topic: d.source for d in decisions}
        assert sources["color_palette"] == "ai_default"
        assert sources["business_type"] == "user"

        # Check DB persistence for requirements contract
        stmt_req = select(Requirement).where(Requirement.project_id == uuid.UUID(project_id))
        saved_req = (await session.execute(stmt_req)).scalars().first()
        assert saved_req is not None
        assert saved_req.n == 1
        assert saved_req.data["business_name"] == req["business_name"]
