import sys
import asyncio
from typing import Any, Dict, Optional
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import Command

from app.core.config import settings
from app.orchestrator.graph import build_project_graph
from app.orchestrator.state import ProjectGraphState

# Ensure compatible Windows event loop for psycopg
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

_cached_graph = None


def get_postgres_connection_string() -> str:
    """Format connection string for AsyncPostgresSaver (psycopg)."""
    url = settings.database_url.replace("+asyncpg", "")
    # Ensure IPv4 127.0.0.1 on local dev for Windows docker compatibility
    return url.replace("localhost", "127.0.0.1")


async def get_orchestrator_graph():
    """Returns the compiled LangGraph with memory or postgres checkpointer."""
    global _cached_graph
    if _cached_graph is not None:
        return _cached_graph

    # In test environment, use fast in-memory checkpointer
    if settings.env == "test":
        _cached_graph = build_project_graph(checkpointer=MemorySaver())
        return _cached_graph

    # Production / Dev: attach PostgreSQL checkpointer
    conn_string = get_postgres_connection_string()
    try:
        saver_cm = AsyncPostgresSaver.from_conn_string(conn_string)
        saver = await saver_cm.__aenter__()
        await saver.setup()
        _cached_graph = build_project_graph(checkpointer=saver)
    except Exception:
        # Fallback to MemorySaver if DB checkpointer fails
        _cached_graph = build_project_graph(checkpointer=MemorySaver())

    return _cached_graph


async def invoke_project_graph(
    project_id: str,
    user_prompt: str,
    thread_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Start or advance a project graph execution thread."""
    graph = await get_orchestrator_graph()
    tid = thread_id or f"proj_{project_id}"
    config = {"configurable": {"thread_id": tid}}

    initial_state: ProjectGraphState = {
        "project_id": project_id,
        "thread_id": tid,
        "user_prompt": user_prompt,
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
        "build_result": None,
        "fix_attempts": 0,
        "quarantined": False,
        "verified": False,
        "git_commit_sha": None,
        "version_tag": None,
        "messages": [{"role": "user", "content": user_prompt}],
        "error_message": None,
    }

    result = await graph.ainvoke(initial_state, config=config)
    return result


async def resume_project_graph(
    thread_id: str,
    resume_payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Resume a paused graph thread after user responds to an interrupt."""
    graph = await get_orchestrator_graph()
    config = {"configurable": {"thread_id": thread_id}}

    result = await graph.ainvoke(Command(resume=resume_payload), config=config)
    return result


async def get_project_graph_state(thread_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the current saved snapshot of a thread."""
    graph = await get_orchestrator_graph()
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = await graph.aget_state(config)
    if not state_snapshot:
        return None
    return {
        "values": state_snapshot.values,
        "next": state_snapshot.next,
        "tasks": [t.name for t in state_snapshot.tasks] if state_snapshot.tasks else [],
    }