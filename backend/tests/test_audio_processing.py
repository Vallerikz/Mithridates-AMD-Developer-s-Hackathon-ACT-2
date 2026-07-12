import pytest

from core import audio_processing
from core.audio_processing import _is_factual_claim


@pytest.mark.parametrize(
    "sentence",
    [
        "The sky is blue.",
        "Cats can fly.",
        "Paris is the capital of France.",
        "The earth orbits the sun.",
    ],
)
def test_is_factual_claim_accepts_declarative_statements(sentence):
    assert _is_factual_claim(sentence) is True


@pytest.mark.parametrize(
    "sentence",
    [
        "Yes.",
        "Ok.",
        "Hello!",
        "Thanks.",
        "Hmm.",
        "Right.",
        "",
        "   ",
    ],
)
def test_is_factual_claim_rejects_filler_and_empty(sentence):
    assert _is_factual_claim(sentence) is False


@pytest.mark.parametrize(
    "sentence",
    [
        "What time is it?",
        "Is the sky blue?",
    ],
)
def test_is_factual_claim_rejects_questions(sentence):
    assert _is_factual_claim(sentence) is False


@pytest.mark.parametrize(
    "sentence",
    [
        "Blue.",
        "Not really.",
    ],
)
def test_is_factual_claim_rejects_short_fragments(sentence):
    assert _is_factual_claim(sentence) is False


def test_set_video_context_normalizes_and_caps():
    audio_processing.set_video_context(1, "  Some   Debate\n- YouTube  ")
    assert audio_processing._video_context[1] == "Some Debate - YouTube"

    audio_processing.set_video_context(2, "x" * 500)
    assert len(audio_processing._video_context[2]) == audio_processing._MAX_VIDEO_CONTEXT_CHARS

    audio_processing._video_context.pop(1, None)
    audio_processing._video_context.pop(2, None)


@pytest.mark.parametrize("context", [None, "", "   ", 42, {"title": "x"}])
def test_set_video_context_ignores_junk(context):
    audio_processing.set_video_context(99, context)
    assert 99 not in audio_processing._video_context
