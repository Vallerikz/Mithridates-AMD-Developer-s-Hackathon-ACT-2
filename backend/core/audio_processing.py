import os
import re

from flask import current_app

from core import db
from core.services.fact_check_service import (
    FireworksAPIError,
    fact_check_sentences,
)
from core.models import SentenceSaveModel

if os.environ.get("TRANSCRIPTION_ENGINE", "gemini") == "whisper":
    from core.services.whisper_transcription_service import transcribe
else:
    from core.services.transcription_service import transcribe

# webm cluster element id, marks the start of an independently decodable block
CLUSTER_ID = b"\x1f\x43\xb6\x75"

# unfinished sentence held over to the next chunk, keyed by video_id
_pending_text = {}
# webm reconstruction state, keyed by video_id:
#   init   -> container header (bytes before the first cluster)
#   buffer -> bytes from the last, still incomplete cluster onward
_audio_state = {}


def _collect_clusters(video_id, audio_chunk):
    """Rebuilds standalone webm segments from sliced MediaRecorder chunks.

    MediaRecorder streams webm with a timeslice: only the first chunk carries
    the container header, the following chunks are raw slices cut in the middle
    of a block and cannot be decoded on their own. The header is kept aside and
    every complete cluster is returned prefixed with it, so each segment decodes
    by itself. The last cluster is still growing and is held back until the next
    one starts (or the session ends).
    """
    state = _audio_state.setdefault(video_id, {"init": None, "buffer": b""})
    state["buffer"] += bytes(audio_chunk)

    if state["init"] is None:
        first = state["buffer"].find(CLUSTER_ID)
        if first == -1:
            return []
        state["init"] = state["buffer"][:first]
        state["buffer"] = state["buffer"][first:]

    starts = []
    pos = state["buffer"].find(CLUSTER_ID)
    while pos != -1:
        starts.append(pos)
        pos = state["buffer"].find(CLUSTER_ID, pos + len(CLUSTER_ID))

    if len(starts) < 2:
        return []

    segments = [
        state["init"] + state["buffer"][starts[i]:starts[i + 1]]
        for i in range(len(starts) - 1)
    ]
    state["buffer"] = state["buffer"][starts[-1]:]
    return segments


def _drain_clusters(video_id):
    """Returns the final held-back cluster and clears the reconstruction state."""
    state = _audio_state.pop(video_id, None)
    if not state or state["init"] is None or not state["buffer"]:
        return []
    return [state["init"] + state["buffer"]]


def _split_sentences(video_id, text, flush_pending=False):
    pending = _pending_text.pop(video_id, "")
    full_text = f"{pending} {text}".strip() if pending else text

    sentences = [
        sentence.strip()
        for sentence in re.split(r'(?<=[.!?])\s+', full_text)
        if sentence.strip()
    ]

    if not flush_pending and sentences and not re.search(r'[.!?]$', sentences[-1]):
        _pending_text[video_id] = sentences.pop()

    return sentences


def _store_and_check(video_id, sentences):
    for sentence in sentences:
        sentence_ins = SentenceSaveModel(video_id=video_id, sentence=sentence)
        db.session.add(sentence_ins)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to save sentences for video %s",
            video_id,
        )

    if not sentences:
        return {"error": False, "error_message": None, "responses": []}

    try:
        responses = fact_check_sentences(sentences)
    except FireworksAPIError as exc:
        return {"error": True, "error_message": str(exc), "responses": []}

    return {"error": False, "error_message": None, "responses": responses}


def _transcribe_segments(video_id, segments, flush_pending=False):
    sentences = []
    for segment in segments:
        try:
            text = transcribe(segment)
        except Exception as exc:
            current_app.logger.exception(
                "Failed to transcribe audio for video %s",
                video_id,
            )
            return {
                "error": True,
                "error_message": str(exc),
                "responses": [],
            }
        sentences.extend(_split_sentences(video_id, text))

    if flush_pending:
        leftover = _pending_text.pop(video_id, "")
        if leftover:
            sentences.append(leftover)

    return _store_and_check(video_id, sentences)


def process_audio(audio_chunk, video):
    """Processes an incoming audio chunk and returns the response"""
    segments = _collect_clusters(video.video_id, audio_chunk)
    return _transcribe_segments(video.video_id, segments)


def flush_audio(video_id):
    """Processes the final buffered audio when a session ends"""
    segments = _drain_clusters(video_id)
    return _transcribe_segments(video_id, segments, flush_pending=True)
