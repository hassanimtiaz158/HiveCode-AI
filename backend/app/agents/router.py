import logging
import re
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.core.llm import call_llm

logger = logging.getLogger("app.agents.router")

ROUTER_SYSTEM_PROMPT = """You are the Tri-Modal Intent Router for Voice-to-Website AI.
Your job is to classify the user's spoken or typed input into exactly one of three intents:

1. "QUESTION":
   The user is asking an informational question, looking for advice, or asking how the system works without requesting a specific website change or build.
   Examples:
   - "How do I add a custom domain?"
   - "What technologies do you use?"
   - "Can I accept credit cards in Pakistan?"
   - "Yeh website live kaise hogi?"

2. "SMALL_EDIT":
   The user wants to make a targeted, minor surgical modification to an existing website (text, color, button, font, layout tweak, or phone number).
   Examples:
   - "Change the navbar background to black"
   - "Update our contact phone number to 0300-1234567"
   - "Make the hero button text say 'Order Now'"
   - "Button ka rang neela kardo"
   - "Heading ko change karke Welcome to Karachi Bakery likh do"

3. "NEW_OR_MAJOR":
   The user wants to build a new website from scratch, add a brand-new feature or page, or do a major architectural redesign.
   Examples:
   - "Build an online store for handcrafted leather bags"
   - "I need a restaurant portfolio for my Italian bistro with online reservations"
   - "Mujhe Lahore mein bakery ke liye website chahiye"
   - "Create a personal portfolio for a software engineer"

You must reply with ONLY a valid JSON object matching this schema:
{
  "intent": "QUESTION" | "SMALL_EDIT" | "NEW_OR_MAJOR",
  "confidence": 0.95,
  "rationale": "One brief sentence explaining why this intent was chosen."
}
"""


class RouterResult(BaseModel):
    intent: Literal["QUESTION", "SMALL_EDIT", "NEW_OR_MAJOR"]
    confidence: float = Field(ge=0.0, le=1.0, default=0.9)
    rationale: str = Field(default="")


def heuristic_route(prompt: str) -> RouterResult:
    """Fast deterministic rule-based classifier used for fallback or offline testing."""
    p = prompt.lower().strip()

    # Question patterns (English & Roman Urdu)
    question_triggers = [
        "how", "what", "why", "when", "can i", "is it possible", "help", "explain",
        "kaise", "kya", "kyun", "kahan", "madad", "batao", "bataiye"
    ]
    if any(re.search(rf"\b{t}\b", p) for t in question_triggers) and not any(
        kw in p for kw in ["build", "create", "make", "banao", "chahiye"]
    ):
        return RouterResult(
            intent="QUESTION",
            confidence=0.92,
            rationale="Prompt asks an informational question without specifying a new site build or edit.",
        )

    # Small edit patterns (English & Roman Urdu)
    edit_triggers = [
        "change", "edit", "update", "replace", "color", "colour", "button", "font", "text",
        "typo", "background", "border", "padding", "title", "heading",
        "badlo", "kardo", "hatao", "rang", "neela", "peela", "laal", "kala"
    ]
    if any(re.search(rf"\b{t}\b", p) for t in edit_triggers) and not any(
        kw in p for kw in ["new website", "from scratch", "naya website", "store banao"]
    ):
        return RouterResult(
            intent="SMALL_EDIT",
            confidence=0.90,
            rationale="Prompt targets a surgical edit to an existing element.",
        )

    # Default to new or major build
    return RouterResult(
        intent="NEW_OR_MAJOR",
        confidence=0.95,
        rationale="Prompt requests creating or majorly updating a website.",
    )


async def route_intent(prompt: str, context: Optional[List[Dict[str, str]]] = None) -> RouterResult:
    """
    Classify user prompt using the active LLM (Qwen in dev, Claude in prod),
    with graceful fallback to heuristic classification.
    """
    fallback = heuristic_route(prompt)
    fallback_dict = {
        "intent": fallback.intent,
        "confidence": fallback.confidence,
        "rationale": fallback.rationale,
    }

    try:
        data = await call_llm(
            system_prompt=ROUTER_SYSTEM_PROMPT,
            user_prompt=f"User prompt: {prompt}",
            temperature=0.1,
            json_mode=True,
            fallback_data=fallback_dict,
        )

        if isinstance(data, dict) and "intent" in data:
            raw_intent = str(data["intent"]).upper().strip()
            if raw_intent in ("QUESTION", "SMALL_EDIT", "NEW_OR_MAJOR"):
                conf = float(data.get("confidence", 0.95))
                conf = max(0.0, min(1.0, conf))
                return RouterResult(
                    intent=raw_intent,  # type: ignore
                    confidence=conf,
                    rationale=str(data.get("rationale", "")),
                )
    except Exception as exc:
        logger.warning(f"[ROUTER-OBSERVABILITY] LLM routing error: {exc}. Using heuristic fallback.")

    return fallback
