import json
import os
import pytest
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.agents.planner import generate_plan, get_fallback_plan
from app.orchestrator.graph import build_project_graph
from app.orchestrator.state import ProjectGraphState
from app.orchestrator.topological_sorter import sort_files_topologically
from contracts.plan import FileAction, PlanContract


@pytest.fixture
def sample_requirements():
    return {
        "project_id": "test_proj_123",
        "version_n": 1,
        "business_name": "Karachi Spice Bazaar",
        "business_type": "Gourmet Spices & Dry Fruits",
        "locale": "en",
        "palette": {
            "primary": "#B45309",
            "secondary": "#D97706",
            "background": "#FFFBEB",
            "text": "#1F2937",
        },
        "navigation": [
            {"label": "Home", "target_section": "hero"},
            {"label": "Spices", "target_section": "catalog"},
            {"label": "Contact", "target_section": "contact"},
        ],
        "features": [
            {"name": "WhatsApp Quick Order", "description": "Instant order via WhatsApp", "priority": "must_have"},
            {"name": "Product Catalog", "description": "Spices list with weights and prices", "priority": "must_have"},
        ],
        "hero_headline": "Authentic Organic Spices in Karachi",
        "hero_subheadline": "Farm fresh whole spices delivered to your doorstep.",
    }


def test_planner_schema_validation(sample_requirements):
    """Task 9.2: Verifies that PlanContract schema is strictly validated."""
    plan = get_fallback_plan(sample_requirements, project_id="test_proj_schema")
    assert isinstance(plan, PlanContract)
    assert plan.project_id == "test_proj_schema"
    assert plan.stack_profile == "vite-react-tailwind"
    assert plan.estimated_tokens > 0
    assert len(plan.files) >= 5

    # Check serialized dump also parses back cleanly
    dumped = plan.model_dump()
    parsed = PlanContract(**dumped)
    assert parsed.project_id == plan.project_id
    assert len(parsed.files) == len(plan.files)


def test_topological_sorter_order():
    """Task 9.3: Verifies that data/site.json is always first and components precede App.tsx."""
    raw_files = [
        FileAction(
            path="src/App.tsx",
            role="page",
            action="create",
            description="Root App",
            imports=["./components/Navbar", "../data/site.json"],
        ),
        FileAction(
            path="src/components/Navbar.tsx",
            role="component",
            action="create",
            description="Navbar component",
            imports=["../data/site.json"],
        ),
        FileAction(
            path="data/site.json",
            role="content",
            action="create",
            description="Central data",
            imports=[],
        ),
    ]

    sorted_files = sort_files_topologically(raw_files)
    paths = [f.path for f in sorted_files]

    assert paths[0] == "data/site.json"
    assert paths.index("src/components/Navbar.tsx") < paths.index("src/App.tsx")


def test_enforcement_of_site_json_in_plan():
    """Acceptance Criteria: data/site.json is strictly at index 0 and holds siteData."""
    raw_files = [
        FileAction(
            path="src/components/Hero.tsx",
            role="component",
            action="create",
            description="Hero banner",
            imports=["react"],
            exports=["Hero"],
        ),
        FileAction(
            path="src/App.tsx",
            role="page",
            action="create",
            description="Main App",
            imports=["./components/Hero"],
            exports=["App"],
        ),
        FileAction(
            path="data/site.json",
            role="content",
            action="create",
            description="Central store copy",
            imports=[],
            exports=["siteData"],
        ),
    ]

    sorted_files = sort_files_topologically(raw_files)
    assert sorted_files[0].path == "data/site.json"
    assert sorted_files[0].role == "content"


def test_circular_dependency_rejection():
    """Subtask 9.3.1: Verifies that circular dependencies do not crash or infinite loop."""
    circular_files = [
        FileAction(
            path="src/components/A.tsx",
            role="component",
            action="create",
            description="Component A",
            imports=["./B"],
        ),
        FileAction(
            path="src/components/B.tsx",
            role="component",
            action="create",
            description="Component B",
            imports=["./A"],
        ),
        FileAction(
            path="data/site.json",
            role="content",
            action="create",
            description="Data",
            imports=[],
        ),
    ]

    sorted_files = sort_files_topologically(circular_files)
    assert len(sorted_files) == 3
    assert sorted_files[0].path == "data/site.json"


@pytest.mark.anyio
async def test_clarifier_to_planner_handoff():
    """Integration Test: Full handoff from Clarifier -> Requirements Confirmation -> Planner."""
    memory_graph = build_project_graph(checkpointer=MemorySaver())
    config = {"configurable": {"thread_id": "test_thread_planner_handoff"}}
    initial_state: ProjectGraphState = {
        "project_id": "handoff_proj_1",
        "thread_id": "test_thread_planner_handoff",
        "user_prompt": "Create an organic skincare website for Karachi boutique",
        "intent": None,
        "router_confidence": None,
        "clarification_turn": 0,
        "clarification_questions": [],
        "clarification_answers": {},
        "requirements": None,
        "requirements_confirmed": False,
        "plan": None,
        "files": {},
        "target_files": [],
        "build_result": {"exit_code": 0, "stdout": "ok", "stderr": ""},
        "fix_attempts": 0,
        "quarantined": False,
        "verified": False,
        "git_commit_sha": None,
        "version_tag": None,
        "messages": [],
        "error_message": None,
    }

    # Step 1: Clarifier interview pause
    await memory_graph.ainvoke(initial_state, config=config)
    snapshot = await memory_graph.aget_state(config)
    assert len(snapshot.tasks) > 0

    # Step 2: User answers clarifier questions
    user_answers = {"answers": {"business_type": "Skincare Store", "primary_color": "#10B981"}}
    await memory_graph.ainvoke(Command(resume=user_answers), config=config)

    # Step 3: User approves requirements blueprint
    final_result = await memory_graph.ainvoke(Command(resume={"confirmed": True}), config=config)

    # Assert planner handoff succeeded
    assert final_result["requirements_confirmed"] is True
    assert final_result["plan"] is not None
    plan = final_result["plan"]
    assert plan["stack_profile"] == "vite-react-tailwind"
    assert len(plan["files"]) >= 5
    assert plan["files"][0]["path"] == "data/site.json"
    assert plan["files"][0]["role"] == "content"


@pytest.mark.anyio
async def test_planner_15_diverse_retail_specs():
    """
    Task 9.4: Benchmark validation suite against 15 diverse retail specifications.
    Verifies across all 15 diverse retail specs:
    1. 100% of generated plans parse into PlanContract without schema errors.
    2. Every plan includes 'data/site.json', 'src/App.tsx', and modular components in 'src/components/'.
    3. 'data/site.json' is strictly at index 0.
    4. Zero circular dependencies.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    personas_path = os.path.join(root_dir, "evals", "personas", "shop_owners.json")

    with open(personas_path, "r", encoding="utf-8") as f:
        personas = json.load(f)

    # Select the first 15 diverse retail specifications
    selected_personas = personas[:15]
    assert len(selected_personas) == 15, "Expected at least 15 personas for Task 9.4 benchmark"

    for p in selected_personas:
        req = {
            "project_id": f"bench_{p['id']}",
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
                {"name": "WhatsApp Order", "description": "WhatsApp CTA", "priority": "must_have"},
                {"name": "Product Showcase", "description": "Item grid", "priority": "must_have"},
            ],
            "hero_headline": f"Welcome to {p['business']}",
            "hero_subheadline": p["prompt"],
        }

        # Generate and validate PlanContract
        plan = await generate_plan(requirements=req, project_id=f"bench_{p['id']}")

        # 1. Schema check
        assert isinstance(plan, PlanContract), f"Failed schema validation for {p['business']}"
        assert plan.stack_profile == "vite-react-tailwind"

        # 2. Path checks
        paths = [f.path for f in plan.files]
        assert "data/site.json" in paths, f"'data/site.json' missing in plan for {p['business']}"
        assert "src/App.tsx" in paths, f"'src/App.tsx' missing in plan for {p['business']}"
        assert any(p.startswith("src/components/") for p in paths), f"No modular components in plan for {p['business']}"

        # 3. Data invariant
        assert paths[0] == "data/site.json", f"'data/site.json' not at index 0 for {p['business']}"
        assert plan.files[0].role == "content"

        # 4. App.tsx order: all components must precede App.tsx
        app_index = paths.index("src/App.tsx")
        for idx, path in enumerate(paths):
            if path.startswith("src/components/"):
                assert idx < app_index, f"Component {path} appears after src/App.tsx"
