from typing import List, Optional
from pydantic import BaseModel, Field


class WordTimestamp(BaseModel):
    """Word-level timestamp and metadata from transcription."""
    text: str
    start: Optional[float] = None
    end: Optional[float] = None
    type: Optional[str] = "word"


class TranscriptionResponse(BaseModel):
    """Response returned after successful speech-to-text conversion."""
    status: str = Field(default="success", description="Status indicator: 'success' or 'error'")
    text: str = Field(..., description="Full transcribed text from the user's speech")
    language_code: Optional[str] = Field(None, description="Detected or specified ISO language code (e.g., 'urd', 'eng')")
    language_probability: Optional[float] = Field(None, description="Confidence score for detected language")
    words: Optional[List[WordTimestamp]] = Field(default=[], description="Word-level timestamps if available")
    requires_confirmation: bool = Field(
        default=True, 
        description="Core Law 3: Non-technical users must confirm/edit transcript before generating code"
    )


class TranscriptionErrorResponse(BaseModel):
    """Error schema for failed transcription attempts."""
    status: str = "error"
    detail: str