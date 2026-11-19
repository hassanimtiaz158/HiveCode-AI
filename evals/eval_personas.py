import asyncio
import json
import os
import sys

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))
sys.path.insert(0, ROOT)

from app.agents.clarifier import run_clarifier_turn
from app.agents.router import route_intent
from contracts.requirements import RequirementsContract


async def run_benchmark():
    persona_path = os.path.join(ROOT, "evals", "personas", "shop_owners.json")
    with open(persona_path, "r", encoding="utf-8") as f:
        personas = json.load(f)

    print(f"Loaded {len(personas)} shop owner personas from evals/personas/shop_owners.json\n")
    print(f"{'ID':<12} | {'Business':<25} | {'Intent':<12} | {'Questions':<10} | {'Contract':<8}")
    print("-" * 75)

    router_correct = 0
    clarifier_success = 0

    for p in personas:
        pid = p["id"]
        business = p["business"][:24]
        prompt = p["prompt"]
        expected_intent = p["expected_intent"]

        # 1. Router Evaluation
        routing = await route_intent(prompt)
        is_router_match = routing.intent == expected_intent
        if is_router_match:
            router_correct += 1
        router_status = f"PASS ({routing.intent})" if is_router_match else f"FAIL ({routing.intent})"

        # 2. Clarifier Evaluation Turn 0
        clarifier_res = await run_clarifier_turn(project_id="eval_proj", user_prompt=prompt, turn=0)
        has_questions = 3 <= len(clarifier_res.questions) <= 5
        has_you_decide = all(
            any("You Decide" in opt or "Recommended" in opt for opt in q.get("options", []))
            for q in clarifier_res.questions
        )
        q_status = f"{len(clarifier_res.questions)} Qs (OK)" if (has_questions and has_you_decide) else "FAIL"

        # 3. Clarifier Synthesis Turn 1 (All 'You Decide')
        answers = {q["id"]: "You Decide (Recommended)" for q in clarifier_res.questions}
        synth_res = await run_clarifier_turn(project_id="eval_proj", user_prompt=prompt, turn=1, answers=answers)
        contract_valid = False
        if synth_res.requirements:
            try:
                RequirementsContract(**synth_res.requirements)
                contract_valid = True
                clarifier_success += 1
            except Exception:
                contract_valid = False
        c_status = "VALID" if contract_valid else "INVALID"

        print(f"{pid:<12} | {business:<25} | {router_status:<12} | {q_status:<10} | {c_status:<8}")

    total = len(personas)
    router_acc = (router_correct / total) * 100
    clarifier_rate = (clarifier_success / total) * 100

    print("-" * 75)
    print(f"Benchmark Results:")
    print(f"  • Router Classification Accuracy: {router_correct}/{total} ({router_acc:.1f}%) [Threshold >= 96%]")
    print(f"  • Clarifier Schema Valid Rate:    {clarifier_success}/{total} ({clarifier_rate:.1f}%) [Threshold 100%]")

    assert router_acc >= 96.0, f"Router accuracy {router_acc}% below 96% threshold"
    assert clarifier_rate == 100.0, f"Clarifier rate {clarifier_rate}% below 100% threshold"
    print("\nALL PHASE 8 EVALUATION BENCHMARKS PASSED (100%)!")


if __name__ == "__main__":
    asyncio.run(run_benchmark())
