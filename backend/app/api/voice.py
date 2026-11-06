from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, status

from app.schemas.voice import TranscriptionErrorResponse, TranscriptionResponse
from app.services.voice_service import transcribe_speech_elevenlabs

router = APIRouter(prefix="/voice", tags=["Voice Pipeline"])


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": TranscriptionErrorResponse, "description": "Invalid audio file or empty content"},
        413: {"model": TranscriptionErrorResponse, "description": "Audio file exceeds size limits"},
        502: {"model": TranscriptionErrorResponse, "description": "Upstream ElevenLabs STT service failure"},
        503: {"model": TranscriptionErrorResponse, "description": "ElevenLabs API key missing"},
    },
    summary="Transcribe Spoken Audio via ElevenLabs",
    description="Upload an audio recording (WebM, WAV, MP3) to convert speech into text for LLM web generation.",
)
async def transcribe_audio_endpoint(
    audio_file: UploadFile = File(..., description="Spoken voice recording from client microphone"),
    language_hint: Optional[str] = Form(
        None, 
        description="Optional language hint ('ur' for Urdu, 'en' for English, or None for auto-detection)"
    ),
):
    """
    Ingests recorded audio from the client and converts speech to text using ElevenLabs STT.
    Returns the transcription and detected language.
    """
    return await transcribe_speech_elevenlabs(file=audio_file, language_hint=language_hint)