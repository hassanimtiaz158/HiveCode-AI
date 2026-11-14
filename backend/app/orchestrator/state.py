from typing import Any, Dict, List, Literal, Optional
from typing_extensions import TypedDict


class ProjectGraphState(TypedDict):
    """
    Central typed state dictionary passed across all LangGraph nodes.
    Maintains complete continuity across multi-turn clarifying interviews,
    planning, code generation, sandboxing, and git commits.
    """
    project_id: str
    thread_id: str
    user_prompt: str
    intent: Optional[Literal["QUESTION", "SMALL_EDIT", "NEW_OR_MAJOR"]]
    router_confidence: Optional[float]
    
    # Clarifier Interview Tracking (Max 3 turns)
    clarification_turn: int
    clarification_questions: List[Dict[str, Any]]
    clarification_answers: Dict[str, Any]
    
    # Requirements Contract & Confirmation Gate
    requirements: Optional[Dict[str, Any]]
    requirements_confirmed: bool
    
    # Architectural Plan & Generated Code
    plan: Optional[Dict[str, Any]]
    files: Dict[str, str]  # file_path -> full_content
    target_files: List[str]  # 1 to 3 isolated files for surgical edits
    
    # Sandbox Build & Self-Healing
    build_result: Optional[Dict[str, Any]]
    fix_attempts: int  # Hard cap: 3 attempts
    quarantined: bool
    
    # Verification & Git Commits
    verified: bool
    git_commit_sha: Optional[str]
    version_tag: Optional[str]
    
    # Chat History & Diagnostic Logs
    messages: List[Dict[str, str]]
    error_message: Optional[str]