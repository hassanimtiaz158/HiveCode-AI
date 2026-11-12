import pytest
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.orchestrator.graph import build_project_graph
from app.orchestrator.state import ProjectGraphState


@pytest.fixture
def memory_graph():
    """Provides a fresh compiled graph with an in-memory checkpointer."""
    return build_project_graph(checkpointer=MemorySaver())


@pytest.mark.anyio
async def test_router_question_intent_flow(memory_graph):
    """Tests that a question prompt routes to answer_question and ends."""
    config = {"configurable": {"thread_id": "test_thread_question"}}
    initial_state: ProjectGraphState = {
        "project_id": "p1",
        "thread_id": "test_thread_question",
        "user_prompt": "How do I change my domain settings?",
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
        "messages": [],
        "error_message": None,
    }

    result = await memory_graph.ainvoke(initial_state, config=config)
    assert result["intent"] == "QUESTION"
    assert len(result["messages"]) > 0


@pytest.mark.anyio
async def test_router_small_edit_flow(memory_graph):
    """Tests that small edits route through locator -> editor -> sandbox -> verifier -> committer."""
    config = {"configurable": {"thread_id": "test_thread_edit"}}
    initial_state: ProjectGraphState = {
        "project_id": "p1",
        "thread_id": "test_thread_edit",
        "user_prompt": "Change the button color to royal blue",
        "intent": None,
        "router_confidence": None,
        "clarification_turn": 0,
        "clarification_questions": [],
        "clarification_answers": {},
        "requirements": None,
        "requirements_confirmed": True,
        "plan": None,
        "files": {"src/App.tsx": "original content"},
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

    result = await memory_graph.ainvoke(initial_state, config=config)
    assert result["intent"] == "SMALL_EDIT"
    assert result["verified"] is True
    assert result["git_commit_sha"] is not None


@pytest.mark.anyio
async def test_fixer_self_healing_retry_ceiling(memory_graph):
    """Tests that a failing sandbox build triggers fixer and halts at quarantine after 3 retries."""
    config = {"configurable": {"thread_id": "test_thread_fixer"}}
    initial_state: ProjectGraphState = {
        "project_id": "p1",
        "thread_id": "test_thread_fixer",
        "user_prompt": "Edit my site",
        "intent": "SMALL_EDIT",
        "router_confidence": 1.0,
        "clarification_turn": 0,
        "clarification_questions": [],
        "clarification_answers": {},
        "requirements": None,
        "requirements_confirmed": True,
        "plan": None,
        "files": {},
        "target_files": [],
        "build_result": {"exit_code": 1, "stderr": "SyntaxError", "stdout": ""},
        "fix_attempts": 2,  # Already attempted twice, next should hit 3 and quarantine
        "quarantined": False,
        "verified": False,
        "git_commit_sha": None,
        "version_tag": None,
        "messages": [],
        "error_message": None,
    }

    result = await memory_graph.ainvoke(initial_state, config=config)
    assert result["fix_attempts"] >= 3
    assert result["quarantined"] is True
    assert "quarantined" in result["error_message"].lower()


@pytest.mark.anyio
async def test_human_interrupt_and_resumption(memory_graph):
    """
    Tests Inviolable Law 3 & Human Interrupt:
    1. Execution pauses at clarifier questions.
    2. Resuming with user answers continues the graph.
    """
    config = {"configurable": {"thread_id": "test_thread_interrupt"}}
    initial_state: ProjectGraphState = {
        "project_id": "p1",
        "thread_id": "test_thread_interrupt",
        "user_prompt": "Build an online shoe store",
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

    # First invoke pauses at clarifier interrupt
    await memory_graph.ainvoke(initial_state, config=config)
    snapshot = await memory_graph.aget_state(config)
    assert len(snapshot.tasks) > 0
    assert snapshot.tasks[0].interrupts is not None

    # Resume with user answer
    user_answers = {"answers": {"business_type": "Shoe Store", "primary_color": "#059669"}}
    await memory_graph.ainvoke(Command(resume=user_answers), config=config)

    # Pauses at confirmation interrupt
    snapshot2 = await memory_graph.aget_state(config)
    assert len(snapshot2.tasks) > 0

    # Resume with confirmation = True
    final_result = await memory_graph.ainvoke(Command(resume={"confirmed": True}), config=config)
    assert final_result["requirements_confirmed"] is True
    assert final_result["verified"] is True
    assert final_result["version_tag"] == "v1"