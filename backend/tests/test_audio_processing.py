import pytest

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
