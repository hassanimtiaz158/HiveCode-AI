import logging
from typing import Optional
import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.voice import TranscriptionResponse, WordTimestamp

logger = logging.getLogger(__name__)

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".webm", ".m4a", ".ogg", ".aac", ".flac"}

# Language mapping helper for ElevenLabs ISO codes
LANGUAGE_MAP = {
    "ur": "urd",
    "urdu": "urd",
    "en": "eng",
    "english": "eng",
}


async def transcribe_speech_elevenlabs(
    file: UploadFile,
    language_hint: Optional[str] = None,
) -> TranscriptionResponse:
    # 1. Validate file extension / format FIRST (returns 400)
    filename = file.filename or "audio.webm"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 2. Read file contents and validate file size FIRST (returns 400 / 413)
    audio_bytes = await file.read()
    if len(audio_bytes) < 256:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio recording is empty or too short. Please speak clearly into the microphone.",
        )
    if len(audio_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds the maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # 3. Check API Key AFTER input validation (returns 503)
    if not settings.elevenlabs_api_key:
        logger.warning("ELEVENLABS_API_KEY is not configured in .env.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Speech-to-Text service is not configured. Please set ELEVENLABS_API_KEY in .env.",
        )

    # 4. Prepare parameters for ElevenLabs
    model_id = settings.elevenlabs_stt_model_id or "scribe_v1"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
    }

    form_data = {
        "model_id": model_id,
        "tag_audio_events": "false",
    }

    if language_hint:
        mapped_lang = LANGUAGE_MAP.get(language_hint.lower(), language_hint.lower())
        form_data["language_code"] = mapped_lang

    files = {
        "file": (filename, audio_bytes, file.content_type or "audio/webm"),
    }

    # 5. Dispatch async request to ElevenLabs Scribe STT
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                ELEVENLABS_STT_URL,
                headers=headers,
                data=form_data,
                files=files,
            )
        except httpx.RequestError as exc:
            logger.error(f"Network error while connecting to ElevenLabs STT: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to communicate with Speech-to-Text provider: {str(exc)}",
            )

    # 6. Handle errors returned by ElevenLabs
    if response.status_code != 200:
        logger.error(f"ElevenLabs STT error [{response.status_code}]: {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ElevenLabs STT error: {response.text}",
        )

    result_json = response.json()
    transcribed_text = result_json.get("text", "").strip()

    # Parse optional word breakdown
    words = []
    for item in result_json.get("words", []):
        words.append(
            WordTimestamp(
                text=item.get("text", ""),
                start=item.get("start"),
                end=item.get("end"),
                type=item.get("type", "word"),
            )
        )

    return TranscriptionResponse(
        status="success",
        text=transcribed_text,
        language_code=result_json.get("language_code"),
        language_probability=result_json.get("language_probability"),
        words=words,
        requires_confirmation=True,
    )