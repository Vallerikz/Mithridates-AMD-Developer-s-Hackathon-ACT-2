import re

from flask import current_app

from core import db
from core.services.transcription_service import transcribe
from core.services.fact_check_service import (
    FireworksAPIError,
    fact_check_sentences,
)
from core.models import SentenceSaveModel


def process_audio(audio_chunk, video):
    """Processes the audio chunk and returns the response"""
    try:
        transcribed_text = transcribe(audio_chunk)
    except Exception as exc:
        current_app.logger.exception(
            "Failed to transcribe audio for video %s",
            video.video_id,
        )
        return {
            "error": True,
            "error_message": str(exc),
            "responses": []
        }
    sentences = [
        sentence.strip()
        for sentence in re.split(r'(?<=[.!?])\s+', transcribed_text)
        if sentence.strip()
    ]
    for sentence in sentences:
        sentence_ins = SentenceSaveModel(
            video_id=video.video_id, sentence=sentence,
        )
        db.session.add(sentence_ins)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to save sentences for video %s",
            video.video_id,
        )
    responses = []
    if sentences:
        try:
            responses = fact_check_sentences(sentences)
        except FireworksAPIError as exc:
            return {
                "error": True,
                "error_message": str(exc),
                "responses": []
            }
    return {
        "error": False,
        "error_message": None,
        "responses": responses
    }
