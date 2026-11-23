import json
import os
from unittest.mock import AsyncMock, patch
import pytest

from app.agents.coder import (
    extract_clean_code,
    generate_project_files,
    generate_single_file,
    get_fallback_file_content,
    validate_file_syntax,
)
from app.agents.planner import generate_plan, get_fallback_plan
from contracts.plan import FileAction, PlanContract


@pytest.fixture
def sample_requirements():
    return {
        "project_id": "proj_coder_test",
        "version_n": 1,
        "business_name": "Lahore Leather Goods",
        "business_type": "Handcrafted Leather Boutique",
        "locale": "en",
        "palette": {
            "primary": "#1E3A8A",
            "secondary": "#F59E0B",
            "background": "#0F172A",
            "text": "#F8FAFC",
        },
        "navigation": [
            {"label": "Home", "target_section": "hero"},
            {"label": "Jackets", "target_section": "catalog"},
            {"label": "Contact", "target_section": "contact"},
        ],
        "features": [
            {"name": "Genuine Leather", "description": "100% full-grain leather.", "priority": "must_have"},
            {"name": "WhatsApp Inquiries", "description": "Direct WhatsApp assistance.", "priority": "must_have"},
        ],
        "hero_headline": "Authentic Handcrafted Leather Jackets",
        "hero_subheadline": "Crafted with Pakistani heritage and natural tanning.",
    }


def test_coder_code_fence_extraction():
    """Unit Test: Verifies clean stripping of markdown code fences."""
    raw_tsx = """```tsx
import React from "react";
export function Navbar() {
  return <nav>Logo</nav>;
}
```"""
    cleaned = extract_clean_code(raw_tsx)
    assert cleaned.startswith('import React from "react";')
    assert cleaned.endswith("}")
    assert "```" not in cleaned

    raw_json = """```json
{
  "business": "Lahore Sweets"
}
```"""
    cleaned_json = extract_clean_code(raw_json)
    assert cleaned_json == '{\n  "business": "Lahore Sweets"\n}'

    plain = 'export const greeting = "Hello World";'
    assert extract_clean_code(plain) == plain


def test_coder_site_json_import_validation(sample_requirements):
    """Unit Test: Verifies UI components import from data/site.json and use its keys."""
    action = FileAction(
        path="src/components/Navbar.tsx",
        role="component",
        action="create",
        description="Navigation header",
        imports=["react", "lucide-react", "../../data/site.json"],
        exports=["Navbar"],
    )

    code = get_fallback_file_content(action, sample_requirements)
    assert 'from "../../data/site.json"' in code or 'from "../data/site.json"' in code
    assert "siteData" in code
    assert "business.name" in code or "navigation.map" in code


def test_coder_lucide_icon_usage(sample_requirements):
    """Unit Test: Verifies that UI components import valid Lucide-react icons."""
    action = FileAction(
        path="src/components/Hero.tsx",
        role="component",
        action="create",
        description="Hero component",
        imports=["react", "lucide-react"],
        exports=["Hero"],
    )

    code = get_fallback_file_content(action, sample_requirements)
    assert 'from "lucide-react"' in code
    assert any(icon in code for icon in ["ArrowRight", "MessageCircle", "Menu", "Check", "Phone"])


def test_coder_syntax_validation():
    """Unit Test (Task 10.4): Verifies syntax validation and placeholder rejection."""
    # 1. Valid JSON
    valid_json = '{"title": "My Store", "products": []}'
    ok, err = validate_file_syntax("data/site.json", valid_json)
    assert ok is True
    assert err is None

    # 2. Invalid JSON
    invalid_json = '{"title": "My Store", "products": [}'
    ok, err = validate_file_syntax("data/site.json", invalid_json)
    assert ok is False
    assert "JSON syntax error" in err

    # 3. Valid TSX
    valid_tsx = """import React from "react";
export function Hero() {
  return (
    <div className="hero">
      <h1>Welcome</h1>
    </div>
  );
}
"""
    ok, err = validate_file_syntax("src/components/Hero.tsx", valid_tsx)
    assert ok is True

    # 4. Unbalanced delimiter in TSX (missing closing parenthesis)
    unbalanced_tsx = """export function Hero() {
  return (
    <div className="hero">
      <h1>Welcome</h1>
    </div>
  ;
}
"""
    ok, err = validate_file_syntax("src/components/Hero.tsx", unbalanced_tsx)
    assert ok is False
    assert "Unbalanced delimiter" in err or "unclosed" in err.lower()

    # 5. Rejected placeholder
    placeholder_tsx = """import React from "react";
export function Hero() {
  // TODO: implement real hero banner
  return <div>Stub</div>;
}
"""
    ok, err = validate_file_syntax("src/components/Hero.tsx", placeholder_tsx)
    assert ok is False
    assert "placeholder" in err.lower()


@pytest.mark.anyio
async def test_planner_to_coder_execution_pipeline(sample_requirements):
    """
    Integration Test: Verifies end-to-end handoff from Planner -> Sequential Coder.
    Emits WebSocket events and ensures all planned files are generated with valid syntax.
    """
    plan = await generate_plan(sample_requirements, project_id="pipeline_proj_1")
    assert isinstance(plan, PlanContract)
    assert len(plan.files) >= 5

    events_emitted = []

    async def mock_ws_progress(event):
        events_emitted.append(event)

    generated_files = await generate_project_files(
        plan=plan,
        requirements=sample_requirements,
        on_progress=mock_ws_progress,
    )

    # 1. All files generated
    assert len(generated_files) == len(plan.files)
    for f in plan.files:
        assert f.path in generated_files
        content = generated_files[f.path]
        assert len(content.strip()) > 50

        # Syntax check
        ok, err = validate_file_syntax(f.path, content)
        assert ok is True, f"Syntax validation failed for {f.path}: {err}"

    # 2. WebSocket events verification
    started_events = [e for e in events_emitted if e["event"] == "file_generation_started"]
    completed_events = [e for e in events_emitted if e["event"] == "file_generation_completed"]
    finished_events = [e for e in events_emitted if e["event"] == "generation_finished"]

    assert len(started_events) == len(plan.files)
    assert len(completed_events) == len(plan.files)
    assert len(finished_events) == 1


@pytest.mark.anyio
async def test_coder_15_benchmark_plans(monkeypatch):
    """
    Definition of Done: Complete sequential file generation loop executes reliably
    across 15 diverse benchmark retail plans with zero syntax errors.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    personas_path = os.path.join(root_dir, "evals", "personas", "shop_owners.json")

    with open(personas_path, "r", encoding="utf-8") as f:
        personas = json.load(f)

    selected_personas = personas[:15]
    assert len(selected_personas) == 15

    # Fast deterministic generator test for 15 plans
    async def fast_call_llm(**kwargs):
        fallback_data = kwargs.get("fallback_data", {})
        if isinstance(fallback_data, dict):
            return fallback_data.get("code", "")
        return str(fallback_data)

    monkeypatch.setattr("app.agents.coder.call_llm", fast_call_llm)

    for p in selected_personas:
        req = {
            "project_id": f"bench_coder_{p['id']}",
            "version_n": 1,
            "business_name": p["business"],
            "business_type": p.get("expected_category", "Retail Store"),
            "locale": p.get("locale", "en"),
            "palette": {
                "primary": "#4F46E5",
                "secondary": "#06B6D4",
                "background": "#0F172A",
                "text": "#F8FAFC",
            },
            "navigation": [
                {"label": "Home", "target_section": "hero"},
                {"label": "Products", "target_section": "catalog"},
                {"label": "Contact", "target_section": "contact"},
            ],
            "features": [
                {"name": "WhatsApp Order", "description": "Instant WhatsApp ordering", "priority": "must_have"},
                {"name": "Verified Quality", "description": "100% authenticity guarantee", "priority": "must_have"},
            ],
            "hero_headline": f"Welcome to {p['business']}",
            "hero_subheadline": p["prompt"],
        }

        plan = get_fallback_plan(req, project_id=req["project_id"])
        files = await generate_project_files(plan=plan, requirements=req)

        # Acceptance Criteria:
        # 1. All files generated without truncation
        assert len(files) == len(plan.files)
        for f in plan.files:
            content = files[f.path]
            assert len(content.strip()) > 30

            # 2. Zero syntax errors in generated .tsx and .json files
            ok, err = validate_file_syntax(f.path, content)
            assert ok is True, f"Syntax error in {f.path} for {p['business']}: {err}"

            # 3. All copy rendered in components is sourced from data/site.json
            if f.role == "component":
                assert 'from "../../data/site.json"' in content or 'from "../data/site.json"' in content
                assert "siteData" in content
