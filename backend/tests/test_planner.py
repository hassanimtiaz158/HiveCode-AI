import pytest
from app.agents.planner import generate_plan, get_fallback_plan
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


def test_topological_sorter_order():
    """Verifies that data/site.json is always first and components precede App.tsx."""
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


def test_topological_sorter_circular_dependency_safe():
    """Verifies that mutual circular dependencies do not crash or infinite loop."""
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
async def test_planner_generates_valid_contract(sample_requirements):
    """Verifies that the Planner outputs a fully valid PlanContract schema."""
    plan = await generate_plan(sample_requirements, project_id="test_proj_123")
    
    assert isinstance(plan, PlanContract)
    assert plan.project_id == "test_proj_123"
    assert plan.stack_profile == "vite-react-tailwind"
    assert len(plan.files) >= 4

    # Enforce data/site.json invariant
    paths = [f.path for f in plan.files]
    assert "data/site.json" in paths
    assert paths[0] == "data/site.json"
    assert "src/App.tsx" in paths


@pytest.mark.anyio
async def test_planner_fallback_structure(sample_requirements):
    """Verifies that the fallback plan conforms strictly to the pinned stack."""
    plan = get_fallback_plan(sample_requirements, project_id="fallback_proj")
    assert plan.files[0].path == "data/site.json"
    assert plan.files[-1].path == "src/App.tsx"
    assert any("ProductCatalog.tsx" in f.path or "Features.tsx" in f.path for f in plan.files)