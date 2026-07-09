import os

import eventlet
import requests

WHISPER_ENDPOINT_URL = os.environ.get("WHISPER_ENDPOINT_URL")
WHISPER_AUDIO_FORMAT = os.environ.get("WHISPER_AUDIO_FORMAT", "webm")

# The remote Whisper endpoint is a single-instance Flask dev server holding one
# loaded model in memory; it isn't safe to call concurrently. Gunicorn's eventlet
# worker dispatches each Socket.IO event to its own greenlet, so without this lock,
# overlapping receive_audio_chunk events fire overlapping requests and it 500s.
_transcribe_lock = eventlet.semaphore.Semaphore(1)


def transcribe(audio_chunk: bytes) -> str:
    """Transcribes an audio chunk via the self-hosted Whisper endpoint."""

    if not WHISPER_ENDPOINT_URL:
        raise RuntimeError("WHISPER_ENDPOINT_URL is not set")

    with _transcribe_lock:
        response = requests.post(
            WHISPER_ENDPOINT_URL,
            files={
                "audio": (f"chunk.{WHISPER_AUDIO_FORMAT}", audio_chunk),
            },
            timeout=30,
        )
        response.raise_for_status()

        return response.json()["text"].strip()
