import io
import pytest
from httpx import ASGITransport, AsyncClient, Response
from unittest.mock import patch

from app.main import app


@pytest.fixture(autouse=True)
def mock_elevenlabs_env():
    """Ensure a dummy ElevenLabs API key is present for all tests, including in CI."""
    with patch("app.core.config.settings.elevenlabs_api_key", "mock_ci_test_key"):
        yield


@pytest.mark.anyio
async def test_transcribe_rejects_empty_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"audio_file": ("test.webm", io.BytesIO(b""), "audio/webm")}
        response = await client.post("/api/v1/voice/transcribe", files=files)
        assert response.status_code == 400


@pytest.mark.anyio
async def test_transcribe_rejects_unsupported_format():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"audio_file": ("test.pdf", io.BytesIO(b"dummy pdf bytes" * 50), "application/pdf")}
        response = await client.post("/api/v1/voice/transcribe", files=files)
        assert response.status_code == 400


@pytest.mark.anyio
async def test_transcribe_success_mocked():
    mock_elevenlabs_response = {
        "text": "Mujhe aik boutique ki website banani hai",
        "language_code": "urd",
        "language_probability": 0.97,
        "words": [{"text": "Mujhe", "start": 0.1, "end": 0.4, "type": "word"}],
    }

    fake_audio = b"RIFF" + b"\x00" * 500  # valid dummy audio bytes > 256 bytes
    orig_post = AsyncClient.post

    async def mock_post_call(self, url, *args, **kwargs):
        if "elevenlabs.io" in str(url):
            return Response(200, json=mock_elevenlabs_response)
        return await orig_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", new=mock_post_call):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            files = {"audio_file": ("sample.wav", io.BytesIO(fake_audio), "audio/wav")}
            data = {"language_hint": "ur"}
            response = await client.post("/api/v1/voice/transcribe", files=files, data=data)

            assert response.status_code == 200
            res_json = response.json()
            assert res_json["status"] == "success"
            assert res_json["text"] == "Mujhe aik boutique ki website banani hai"
            assert res_json["language_code"] == "urd"