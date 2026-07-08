import os

import requests

WHISPER_ENDPOINT_URL = os.environ.get("WHISPER_ENDPOINT_URL")
WHISPER_AUDIO_FORMAT = os.environ.get("WHISPER_AUDIO_FORMAT", "webm")


def transcribe(audio_chunk: bytes) -> str:
    """Transcribes an audio chunk via the self-hosted Whisper endpoint."""

    if not WHISPER_ENDPOINT_URL:
        raise RuntimeError("WHISPER_ENDPOINT_URL is not set")

    response = requests.post(
        WHISPER_ENDPOINT_URL,
        files={
            "audio": (f"chunk.{WHISPER_AUDIO_FORMAT}", audio_chunk),
        },
        timeout=30,
    )
    response.raise_for_status()

    return response.json()["text"].strip()
