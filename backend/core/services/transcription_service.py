import os

from google import genai
from google.genai import types


client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)


def transcribe(audio_chunk: bytes) -> str:
    """Transcribes an audio chunk."""

    response = client.models.generate_content(
        model=os.environ.get("GEMINI_TRANSCRIPTION_MODEL"),
        contents=[
            "Transcribe this audio. Return only the spoken text.",
            types.Part.from_bytes(
                data=audio_chunk,
                mime_type="audio/mp3",
            ),
        ],
    )

    return response.text.strip()
