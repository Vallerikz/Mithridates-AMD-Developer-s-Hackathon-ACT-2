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
# verdicts already obtained for this video, keyed by video_id then by the
# exact sentence text; a repeated claim is answered from here instead of
# burning another Fireworks call
_verdict_cache = {}
# webm reconstruction state, keyed by video_id:
#   init   -> container header (bytes before the first cluster)
#   buffer -> bytes from the last, still incomplete cluster onward
_audio_state = {}

# backchannel/filler words that never carry a checkable claim on their own
_FILLER_SENTENCES = {
    'ok', 'okay', 'yes', 'no', 'yeah', 'yep', 'nope', 'sure', 'right',
    'thanks', 'thank you', 'please', 'hello', 'hi', 'hey', 'bye', 'goodbye',
    'um', 'uh', 'uhh', 'umm', 'hmm', 'well', 'so', 'alright', 'got it',
}

_MIN_CLAIM_WORDS = 3

# how many prior sentences from the same video to give the model as situational
# context (not fact-checked themselves, just there so it knows what's going on)
_CONTEXT_WINDOW_SIZE = 8


def _recent_context(video_id):
    rows = (
        SentenceSaveModel.query
        .filter_by(video_id=video_id)
        .order_by(SentenceSaveModel.id.desc())
        .limit(_CONTEXT_WINDOW_SIZE)
        .all()
    )
    return [row.sentence for row in reversed(rows)]


def _is_factual_claim(sentence):
    """Heuristic filter: skip fragments unlikely to carry a checkable claim.

    Fact-checking every greeting, filler word, and question burns a Fireworks
    call for sentences with nothing to verify, so only sentences that look
    like declarative statements are sent through.
    """
    normalized = sentence.strip().rstrip('.!?').strip().lower()
    if not normalized:
        return False
    if normalized in _FILLER_SENTENCES:
        return False
    if sentence.rstrip().endswith('?'):
        return False
    if len(normalized.split()) < _MIN_CLAIM_WORDS:
        return False
    return True


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

    segment = state["init"] + state["buffer"][starts[0]:starts[-1]]
    state["buffer"] = state["buffer"][starts[-1]:]
    return [segment]


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


def _store_and_check(video_id, sentences, on_claims=None):
    if not sentences:
        return {"error": False, "error_message": None, "responses": []}

    # grab the context before the new sentences are committed, otherwise the
    # window would contain the very sentences being checked
    context = _recent_context(video_id)

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

    claims = [sentence for sentence in sentences if _is_factual_claim(sentence)]
    if not claims:
        return {"error": False, "error_message": None, "responses": []}

    # let the caller show the claims right away, before the fact-check call
    if on_claims is not None:
        on_claims(claims)

    cache = _verdict_cache.setdefault(video_id, {})
    novel = []
    for claim in claims:
        if claim not in cache and claim not in novel:
            novel.append(claim)

    if novel:
        try:
            results = fact_check_sentences(novel, context_sentences=context)
        except FireworksAPIError as exc:
            return {"error": True, "error_message": str(exc), "responses": []}
        for claim, result in zip(novel, results):
            cache[claim] = result

    responses = [cache[claim] for claim in claims]
    return {"error": False, "error_message": None, "responses": responses}


def _transcribe_segments(video_id, segments, flush_pending=False, on_claims=None):
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

    return _store_and_check(video_id, sentences, on_claims=on_claims)


def process_audio(audio_chunk, video, on_claims=None):
    """Processes an incoming audio chunk and returns the response"""
    segments = _collect_clusters(video.video_id, audio_chunk)
    return _transcribe_segments(video.video_id, segments, on_claims=on_claims)


def flush_audio(video_id, on_claims=None):
    """Processes the final buffered audio when a session ends"""
    segments = _drain_clusters(video_id)
    response = _transcribe_segments(
        video_id, segments, flush_pending=True, on_claims=on_claims,
    )
    _verdict_cache.pop(video_id, None)
    return response
