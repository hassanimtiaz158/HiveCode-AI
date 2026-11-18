import json
import logging
from typing import Any, Dict, List
from pydantic import ValidationError

from app.core.llm import call_llm
from app.orchestrator.topological_sorter import sort_files_topologically
from contracts.plan import FileAction, PlanContract

logger = logging.getLogger("app.agents.planner")

PLANNER_SYSTEM_PROMPT = """You are the Principal Software Architect for Voice-to-Website AI.
Your mission is to take a verified Requirements Contract and output a dependency-ordered architectural Plan Contract for a production 'vite-react-tailwind' project.

INVIOLABLE ARCHITECTURAL RULES:
1. THE DATA INVARIANT: 'data/site.json' MUST be the very first file. It holds 100% of user copy, headlines, product details, navigation links, and brand text.
2. MODULAR COMPONENTS: Every component in 'src/components/' must have single responsibility (e.g. Navbar.tsx, Hero.tsx, Features.tsx, ProductGrid.tsx, Footer.tsx).
3. ROOT ORCHESTRATOR: 'src/App.tsx' imports components and binds them with data from '../data/site.json'.
4. NO SPAGHETTI: Specify exact imports and exports for every file action.

You must return ONLY a valid JSON object matching this schema:
{
  "project_id": "string",
  "stack_profile": "vite-react-tailwind",
  "files": [
    {
      "path": "data/site.json",
      "role": "content",
      "action": "create",
      "description": "Central content repository containing all site copy, navigation items, products, and contact info",
      "imports": [],
      "exports": ["siteData"]
    },
    {
      "path": "src/components/Navbar.tsx",
      "role": "component",
      "action": "create",
      "description": "Responsive top navigation bar with brand logo, nav links, and WhatsApp CTA button",
      "imports": ["react", "lucide-react", "../../data/site.json"],
      "exports": ["Navbar"]
    },
    {
      "path": "src/components/Hero.tsx",
      "role": "component",
      "action": "create",
      "description": "Hero section featuring brand headline, subheadline, and primary CTA",
      "imports": ["react", "lucide-react"],
      "exports": ["Hero"]
    },
    {
      "path": "src/components/Footer.tsx",
      "role": "component",
      "action": "create",
      "description": "Footer with quick links, social media, copyright, and contact details",
      "imports": ["react", "lucide-react"],
      "exports": ["Footer"]
    },
    {
      "path": "src/App.tsx",
      "role": "page",
      "action": "create",
      "description": "Root component composing Navbar, Hero, Main Content, and Footer",
      "imports": ["./components/Navbar", "./components/Hero", "./components/Footer", "../data/site.json"],
      "exports": ["App"]
    }
  ],
  "estimated_tokens": 3500
}
"""


def get_fallback_plan(requirements: Dict[str, Any], project_id: str) -> PlanContract:
    """Generates a guaranteed valid fallback PlanContract tailored to the requirements."""
    business_name = requirements.get("business_name", "My Store")
    features = requirements.get("features", [])

    files = [
        FileAction(
            path="data/site.json",
            role="content",
            action="create",
            description=f"Central JSON data repository for {business_name}",
            imports=[],
            exports=["siteData"],
        ),
        FileAction(
            path="src/components/Navbar.tsx",
            role="component",
            action="create",
            description="Sticky navigation header with mobile hamburger drawer and WhatsApp order CTA",
            imports=["react", "lucide-react"],
            exports=["Navbar"],
        ),
        FileAction(
            path="src/components/Hero.tsx",
            role="component",
            action="create",
            description=f"High-conversion hero banner for {business_name}",
            imports=["react", "lucide-react"],
            exports=["Hero"],
        ),
    ]

    # Dynamically plan custom feature component if features are requested
    if any("product" in str(f).lower() or "catalog" in str(f).lower() or "menu" in str(f).lower() for f in features):
        files.append(
            FileAction(
                path="src/components/ProductCatalog.tsx",
                role="component",
                action="create",
                description="Interactive product showcase grid with category filters and item cards",
                imports=["react", "lucide-react"],
                exports=["ProductCatalog"],
            )
        )
    else:
        files.append(
            FileAction(
                path="src/components/Features.tsx",
                role="component",
                action="create",
                description="Key business offerings and highlights section",
                imports=["react", "lucide-react"],
                exports=["Features"],
            )
        )

    files.extend([
        FileAction(
            path="src/components/Footer.tsx",
            role="component",
            action="create",
            description="Footer with contact details, business hours, and social media icons",
            imports=["react", "lucide-react"],
            exports=["Footer"],
        ),
        FileAction(
            path="src/App.tsx",
            role="page",
            action="create",
            description="Main application orchestrator composing all sections with central site.json",
            imports=["./components/Navbar", "./components/Hero", "./components/Footer", "../data/site.json"],
            exports=["App"],
        ),
    ])

    sorted_files = sort_files_topologically(files)
    return PlanContract(
        project_id=project_id,
        stack_profile="vite-react-tailwind",
        files=sorted_files,
        estimated_tokens=3500,
    )


async def generate_plan(requirements: Dict[str, Any], project_id: str) -> PlanContract:
    """
    Executes the Planner Agent via LLM (Groq / Claude) to generate a dependency-ordered PlanContract.
    """
    user_prompt = f"""Generate an architectural file plan for this verified project:
Project ID: {project_id}
Requirements Contract:
{json.dumps(requirements, indent=2)}
"""

    fallback = get_fallback_plan(requirements, project_id)

    raw_result = await call_llm(
        system_prompt=PLANNER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.2,
        json_mode=True,
        fallback_data=fallback.model_dump(),
    )

    if isinstance(raw_result, dict):
        try:
            # Overwrite project_id to ensure alignment
            raw_result["project_id"] = project_id
            raw_result["stack_profile"] = "vite-react-tailwind"

            file_actions = [FileAction(**f) for f in raw_result.get("files", [])]
            # Enforce topological dependency sort
            sorted_files = sort_files_topologically(file_actions)

            # Ensure data/site.json is always present
            if not any(f.path == "data/site.json" for f in sorted_files):
                sorted_files.insert(
                    0,
                    FileAction(
                        path="data/site.json",
                        role="content",
                        action="create",
                        description="Central site data repository",
                        imports=[],
                        exports=["siteData"],
                    ),
                )

            return PlanContract(
                project_id=project_id,
                stack_profile="vite-react-tailwind",
                files=sorted_files,
                estimated_tokens=raw_result.get("estimated_tokens", 3500),
            )
        except (ValidationError, Exception) as exc:
            logger.warning(f"Planner LLM response failed schema validation ({exc}). Using verified fallback plan.")
            return fallback

    return fallback