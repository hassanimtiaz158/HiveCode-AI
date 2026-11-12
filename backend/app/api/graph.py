from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.orchestrator.service import (
    get_project_graph_state,
    invoke_project_graph,
    resume_project_graph,
)

router = APIRouter(prefix="/projects/{project_id}/graph", tags=["LangGraph Orchestrator"])


class GraphInvokeRequest(BaseModel):
    user_prompt: str = Field(..., description="User's spoken or text prompt")
    thread_id: Optional[str] = Field(None, description="Optional custom thread ID")


class GraphResumeRequest(BaseModel):
    thread_id: str = Field(..., description="Thread ID paused by an interrupt")
    answers: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Answers to questions")
    confirmed: Optional[bool] = Field(None, description="Confirmation flag for requirements")


@router.post("/invoke", summary="Invoke or Start Project State Graph")
async def invoke_graph_endpoint(project_id: str, req: GraphInvokeRequest):
    """Dispatches user prompt to LangGraph state machine."""
    try:
        result = await invoke_project_graph(
            project_id=project_id,
            user_prompt=req.user_prompt,
            thread_id=req.thread_id,
        )
        return {"status": "success", "state": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph execution error: {str(exc)}",
        )


@router.post("/resume", summary="Resume Paused Graph Thread")
async def resume_graph_endpoint(project_id: str, req: GraphResumeRequest):
    """Resumes an interrupted graph thread with user answers."""
    try:
        payload = {"answers": req.answers}
        if req.confirmed is not None:
            payload["confirmed"] = req.confirmed
            
        result = await resume_project_graph(
            thread_id=req.thread_id,
            resume_payload=payload,
        )
        return {"status": "resumed", "state": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph resume error: {str(exc)}",
        )


@router.get("/state", summary="Get Current Graph Thread State")
async def get_graph_state_endpoint(project_id: str, thread_id: str):
    """Retrieves current execution snapshot from checkpointer."""
    state = await get_project_graph_state(thread_id=thread_id)
    if not state:
        raise HTTPException(status_code=404, detail="Graph thread not found")
    return {"status": "success", "snapshot": state}