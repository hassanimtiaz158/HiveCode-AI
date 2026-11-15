import logging
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import call_llm
from app.db.session import AsyncSessionLocal
from app.models.project import Decision, Project, Requirement
import sys
from pathlib import Path

# Ensure repo root is discoverable for contracts
_ROOT = str(Path(__file__).resolve().parents[3])
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from contracts.requirements import ColorPalette, NavItem, RequirementsContract, SiteFeature

logger = logging.getLogger("app.agents.clarifier")

CLARIFIER_QUESTIONS_SYSTEM_PROMPT = """You are the Diagnostic Clarifier Agent for Voice-to-Website AI.
Your mission is to ask exactly 3 to 5 multiple-choice questions to a non-technical shop owner to clarify their website requirements.

Guidelines:
1. Every question must have an "id", a clear "question", and 3 to 5 "options".
2. The last option in EVERY question MUST be "You Decide (Recommended)" so the user can delegate technical or stylistic choices to AI.
3. Keep the questions practical (e.g. business type/products, visual theme/palette, key features like WhatsApp ordering or catalog, contact info).
4. Do NOT ask more than 5 questions.
5. You must return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": "business_category",
      "question": "What is the primary focus of your store?",
      "options": ["Fresh Baked Goods & Custom Cakes", "Daily Bread & Pastries", "Cafe & Dine-in Snacks", "You Decide (Recommended)"]
    },
    ...
  ]
}
"""

REQUIREMENTS_SYNTHESIZER_SYSTEM_PROMPT = """You are the Senior Technical Architect for Voice-to-Website AI.
Your job is to synthesize all user inputs and interview answers into a complete, valid Requirements Contract.

Output MUST be a JSON object with this exact structure:
{
  "business_name": "String (e.g. Lahore Delights Bakery)",
  "business_type": "String (e.g. Bakery & Pastry Shop)",
  "locale": "en" | "ur",
  "palette": {
    "primary": "#Hex6",
    "secondary": "#Hex6",
    "background": "#Hex6",
    "text": "#Hex6"
  },
  "navigation": [
    {"label": "Home", "target_section": "hero"},
    {"label": "Menu", "target_section": "menu"},
    {"label": "About", "target_section": "about"},
    {"label": "Contact", "target_section": "contact"}
  ],
  "features": [
    {"name": "WhatsApp Ordering", "description": "1-click order dispatch via WhatsApp message", "priority": "must_have"},
    {"name": "Product Showcase", "description": "Interactive gallery of baked items with prices", "priority": "must_have"}
  ],
  "hero_headline": "Delicious Artisanal Bakes in Lahore",
  "hero_subheadline": "Freshly baked daily using premium ingredients with citywide home delivery.",
  "contact_phone": "+92 300 1234567",
  "contact_email": "info@example.com",
  "social_links": {"instagram": "https://instagram.com"}
}

CRITICAL RULES:
- All hex color codes in 'palette' must be valid 6-digit hex codes starting with # (e.g. #2563EB).
- If the user selected 'You Decide (Recommended)' for any choice, resolve it with an aesthetically pleasing, conversion-optimized default.
"""


class ClarifierResult(BaseModel):
    is_complete: bool = False
    turn: int = 1
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    requirements: Optional[Dict[str, Any]] = None
    decisions_logged: int = 0


def get_default_clarifier_questions(prompt: str) -> List[Dict[str, Any]]:
    """Heuristic / offline fallback questions covering standard business requirements."""
    return [
        {
            "id": "business_type",
            "question": "What is the primary category of your business?",
            "options": [
                "Retail Store / Ecommerce",
                "Food / Restaurant / Bakery",
                "Professional Services & Consulting",
                "Portfolio / Personal Brand",
                "You Decide (Recommended)",
            ],
        },
        {
            "id": "color_palette",
            "question": "Which visual theme and brand palette fits best?",
            "options": [
                "Warm & Earthy (Amber #D97706 & Cream #FFFBEB)",
                "Modern Corporate (Royal Blue #2563EB & Slate #F8FAFC)",
                "Fresh & Organic (Emerald Green #059669 & Clean White #FFFFFF)",
                "Bold & Luxurious (Charcoal #1F2937 & Gold #EAB308)",
                "You Decide (Recommended)",
            ],
        },
        {
            "id": "primary_cta",
            "question": "What is the main action visitors should take?",
            "options": [
                "Order / Chat via WhatsApp button",
                "Browse Product / Services Catalog",
                "Book an Appointment / Table",
                "Call Directly for Inquiries",
                "You Decide (Recommended)",
            ],
        },
    ]


def synthesize_default_requirements(project_id: str, prompt: str, answers: Dict[str, Any]) -> RequirementsContract:
    """Deterministic fallback synthesis guaranteeing 100% compliance with RequirementsContract."""
    b_type = answers.get("business_type", "General Store")
    if "You Decide" in b_type or not b_type:
        b_type = "Artisan Bakery & Cafe" if "bakery" in prompt.lower() else "Retail & Services"

    # Name extraction heuristic
    b_name = "My Business Store"
    for word in prompt.split():
        if word.istitle() and word.lower() not in ("i", "want", "need", "build", "website", "create"):
            b_name = f"{word} Store"
            break
    if "bakery" in prompt.lower():
        b_name = "Lahore Delights Bakery"

    palette = ColorPalette(
        primary="#2563EB" if "blue" in str(answers).lower() else "#059669",
        secondary="#F59E0B",
        background="#F8FAFC",
        text="#0F172A",
    )

    return RequirementsContract(
        project_id=project_id,
        version_n=1,
        business_name=b_name,
        business_type=b_type,
        locale="en",
        palette=palette,
        navigation=[
            NavItem(label="Home", target_section="hero"),
            NavItem(label="Products", target_section="products"),
            NavItem(label="About Us", target_section="about"),
            NavItem(label="Contact", target_section="contact"),
        ],
        features=[
            SiteFeature(name="WhatsApp Direct Order", description="1-click chat to order on WhatsApp", priority="must_have"),
            SiteFeature(name="Interactive Menu/Catalog", description="Categorized showcase of products with pricing", priority="must_have"),
        ],
        hero_headline=f"Welcome to {b_name}",
        hero_subheadline="Delivering excellence, premium quality and reliable service to our valued customers.",
        contact_phone="+92 300 1234567",
        contact_email="contact@example.com",
        social_links={"whatsapp": "https://wa.me/923001234567"},
    )


async def record_decisions_and_requirements(
    project_id: str,
    answers: Dict[str, Any],
    requirements: RequirementsContract,
    db: Optional[AsyncSession] = None,
) -> int:
    """
    Persists all user decisions and the synthesized RequirementsContract to PostgreSQL.
    """
    session_to_close = None
    if db is None:
        session_to_close = AsyncSessionLocal()
        session = session_to_close
    else:
        session = db

    logged_count = 0
    try:
        proj_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

        # 1. Record individual decisions in 'decisions' table
        for topic, choice in answers.items():
            is_ai_default = "You Decide" in str(choice) or not str(choice).strip()
            decision = Decision(
                project_id=proj_uuid,
                topic=str(topic),
                choice=str(choice),
                reason="Selected by user during diagnostic interview" if not is_ai_default else "Auto-resolved to high-converting default choice",
                source="ai_default" if is_ai_default else "user",
            )
            session.add(decision)
            logged_count += 1

        # 2. Record requirements version in 'requirements' table
        # Check current latest version
        stmt = select(Requirement.n).where(Requirement.project_id == proj_uuid).order_by(Requirement.n.desc())
        last_n = (await session.execute(stmt)).scalars().first() or 0
        new_n = last_n + 1

        req_row = Requirement(
            project_id=proj_uuid,
            n=new_n,
            data=requirements.model_dump(),
            diff=None,
        )
        session.add(req_row)

        await session.commit()
        logger.info(f"[CLARIFIER-OBSERVABILITY] 💾 Logged {logged_count} decisions and requirement v{new_n} for project {project_id}")
    except Exception as exc:
        logger.warning(f"[CLARIFIER-OBSERVABILITY] DB audit log skipped/failed: {exc}")
        await session.rollback()
    finally:
        if session_to_close:
            await session_to_close.close()

    return logged_count


async def run_clarifier_turn(
    project_id: str,
    user_prompt: str,
    turn: int = 0,
    answers: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None,
) -> ClarifierResult:
    """
    Orchestrates the Clarifier Agent interview turn:
    - Turn 0 or unanswered: Generates 3-5 multiple-choice questions.
    - If user answered (or Turn >= 2): Generates RequirementsContract, resolves 'You Decide', and saves to DB.
    """
    answers = answers or {}
    logger.info(f"[CLARIFIER-OBSERVABILITY] 🔍 Clarifier turn {turn} for project '{project_id}' with {len(answers)} answers.")

    # If turn is 0 and no answers provided yet -> Ask questions
    if turn == 0 and not answers:
        fallback_questions = get_default_clarifier_questions(user_prompt)
        try:
            res = await call_llm(
                system_prompt=CLARIFIER_QUESTIONS_SYSTEM_PROMPT,
                user_prompt=f"User desires website for: {user_prompt}",
                temperature=0.2,
                json_mode=True,
                fallback_data={"questions": fallback_questions},
            )
            questions = res.get("questions", fallback_questions) if isinstance(res, dict) else fallback_questions
        except Exception:
            questions = fallback_questions

        # Enforce "You Decide (Recommended)" as last option in every question
        for q in questions:
            opts = q.get("options", [])
            if not any("You Decide" in o for o in opts):
                opts.append("You Decide (Recommended)")
            q["options"] = opts

        return ClarifierResult(
            is_complete=False,
            turn=1,
            questions=questions,
            requirements=None,
            decisions_logged=0,
        )

    # User has provided answers (or reached turn limit) -> Synthesize Requirements Contract
    fallback_contract = synthesize_default_requirements(project_id, user_prompt, answers)
    try:
        prompt_content = f"User initial prompt: {user_prompt}\nAnswers from diagnostic interview: {answers}"
        res = await call_llm(
            system_prompt=REQUIREMENTS_SYNTHESIZER_SYSTEM_PROMPT,
            user_prompt=prompt_content,
            temperature=0.2,
            json_mode=True,
            fallback_data=fallback_contract.model_dump(),
        )
        if isinstance(res, dict) and "palette" in res:
            res["project_id"] = project_id
            res["version_n"] = 1
            contract = RequirementsContract(**res)
        else:
            contract = fallback_contract
    except Exception as exc:
        logger.warning(f"[CLARIFIER-OBSERVABILITY] LLM synthesis failed ({exc}); using fallback contract.")
        contract = fallback_contract

    # Save decisions and requirements to DB
    decisions_count = await record_decisions_and_requirements(
        project_id=project_id,
        answers=answers,
        requirements=contract,
        db=db,
    )

    return ClarifierResult(
        is_complete=True,
        turn=turn + 1,
        questions=[],
        requirements=contract.model_dump(),
        decisions_logged=decisions_count,
    )
