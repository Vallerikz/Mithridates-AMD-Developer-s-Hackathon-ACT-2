import re

from core import db
from core.services.transcription_service import transcribe
from core.models import SentenceSaveModel


def process_audio(audio_chunk, video):
    """Processes the audio chunk and returns the response"""
    transcribed_text = transcribe(audio_chunk)
    sentences = [
        sentence.strip()
        for sentence in re.split(r'(?<=[.!?])\s+', transcribed_text)
        if sentence.strip()
    ]
    responses = []
    for sentence in sentences:
        sentence_ins = SentenceSaveModel(
            video_id=video.video_id, sentence=sentence,
        )
        db.session.add(sentence_ins)
        # TODO: Add fact checking here
        response = {}
        if len(response) != 0:
            responses.append(response)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
    return {
        "error": False,
        "error_message": None,
        "responses": responses
    }
