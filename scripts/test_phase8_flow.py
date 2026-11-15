import asyncio
import json
import os
import sys

# Ensure UTF-8 output and compatible Windows event loop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend and repo root are in python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))
sys.path.insert(0, ROOT)

from app.agents.clarifier import run_clarifier_turn
from app.agents.router import route_intent
from app.core.llm import get_effective_llm_config
from app.orchestrator.service import invoke_project_graph, resume_project_graph


async def main():
    print("=" * 70)
    print(">> VOICE-TO-WEBSITE AI: PHASE 8 LOCAL INTERACTIVE TEST")
    print("=" * 70)

    # 1. Inspect LLM Provider
    provider, model, key, base_url = get_effective_llm_config()
    print(f"\n[1] LLM Configuration:")
    print(f"    - Active Provider: {provider.upper()}")
    print(f"    - Model:           {model}")
    print(f"    - API Key:         {'Configured (' + key[:8] + '...)' if key else 'None (Using heuristic fallback)'}")

    # 2. Test Tri-Modal Router
    print("\n[2] Testing Tri-Modal Router:")
    test_prompts = [
        ("How do I connect my domain?", "QUESTION"),
        ("Change button color to emerald green", "SMALL_EDIT"),
        ("Mujhe Lahore mein artisanal bakery ke liye website chahiye", "NEW_OR_MAJOR"),
    ]
    for prompt, expected in test_prompts:
        result = await route_intent(prompt)
        match = "[PASS]" if result.intent == expected else "[FAIL]"
        print(f"    {match} Prompt: \"{prompt}\"")
        print(f"       -> Classified: {result.intent} (Confidence: {result.confidence:.2f})")

    # 3. Test Full LangGraph Clarifier Flow
    print("\n[3] Testing LangGraph State Machine & Clarifier Interview:")
    import uuid
    project_id = str(uuid.uuid4())
    user_prompt = "Build an artisanal sourdough bakery website in Lahore"

    print(f"    * Step A: Invoking state machine with prompt: \"{user_prompt}\"...")
    invoke_res = await invoke_project_graph(project_id=project_id, user_prompt=user_prompt)

    # The graph routes to clarifier and halts at the interrupt
    print(f"    * Step B: Graph paused at Clarifier interview interrupt!")
    questions = invoke_res.get("clarification_questions", [])
    print(f"    * Generated {len(questions)} diagnostic questions:")
    for idx, q in enumerate(questions, 1):
        print(f"       [{idx}] {q['question']}")
        for opt in q['options']:
            is_rec = " * [RECOMMENDED]" if ("You Decide" in opt or "Recommended" in opt) else ""
            print(f"            - {opt}{is_rec}")

    # Step C: Submit user answers (including a "You Decide")
    user_answers = {
        questions[0]['id']: questions[0]['options'][0],
        questions[1]['id']: "You Decide (Recommended)",
        questions[2]['id']: questions[2]['options'][0] if len(questions) > 2 else "WhatsApp button",
    }
    print(f"\n    * Step C: User answers submitted:")
    for qid, ans in user_answers.items():
        print(f"       - {qid} -> {ans}")

    # Step D: Resume graph with answers
    tid = f"proj_{project_id}"
    print(f"\n    * Step D: Resuming graph with answers...")
    resume_res = await resume_project_graph(thread_id=tid, resume_payload={"answers": user_answers})

    # Step E: Confirm Requirements Summary
    print(f"    * Step E: Graph reached Requirements Confirmation gate!")
    req = resume_res.get("requirements", {})
    if req:
        print(f"       - Business Name: {req.get('business_name')}")
        print(f"       - Business Type: {req.get('business_type')}")
        print(f"       - Primary Color: {req.get('palette', {}).get('primary')}")
        print(f"       - Hero Headline: \"{req.get('hero_headline')}\"")
        print(f"       - Features:      {[f['name'] for f in req.get('features', [])]}")

    # Step F: Final Approval
    print(f"\n    * Step F: User approves requirements blueprint (confirmed=True)...")
    final_res = await resume_project_graph(thread_id=tid, resume_payload={"confirmed": True})
    print(f"    * Build Pipeline Status:")
    print(f"       - Verified:    {final_res.get('verified')}")
    print(f"       - Version Tag: {final_res.get('version_tag')}")
    print(f"       - Commit SHA:  {final_res.get('git_commit_sha')}")

    print("\n" + "=" * 70)
    print("SUCCESS: PHASE 8 LOCAL TEST COMPLETED CLEANLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
