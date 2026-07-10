import json
import os
from datetime import datetime, UTC

import requests

FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions'

DEFAULT_MODEL = 'accounts/fireworks/models/llama-v3p1-8b-instruct'

VALID_VERDICTS = ('True', 'False', 'Unverifiable')

FACT_CHECK_SYSTEM_PROMPT = (
    "You are a rigorous fact-checking assistant. You will receive a JSON object "
    "whose \"sentences\" array contains sentences transcribed from a live video. "
    "For each sentence, decide whether the factual claim it makes is true, "
    "false, or unverifiable given well-established general knowledge.\n"
    "Respond with a single JSON object of the form {\"results\": [...]}. The "
    "\"results\" array must contain exactly one object per input sentence, in "
    "the same order, and each object must have these keys:\n"
    "  - \"verdict\": one of \"True\", \"False\", \"Unverifiable\"\n"
    "  - \"confidence\": a number between 0 and 1\n"
    "  - \"explanation\": a short, one-sentence justification\n"
    "Respond with the JSON object only, no surrounding prose or markdown."
)


def _system_prompt_with_date():
    today = datetime.now(UTC).strftime('%Y-%m-%d')
    return (
        f"Today's real-world date is {today}. Use it to judge claims about "
        "recent events, ages, durations, or anything time-sensitive.\n\n"
        + FACT_CHECK_SYSTEM_PROMPT
    )


CONTEXT_SYSTEM_PROMPT_SUFFIX = (
    "\n\nYou may also receive a \"context_sentences\" array: earlier sentences "
    "from the same video, given only so you understand the topic and situation. "
    "Do not fact-check them and do not include them in \"results\" — only the "
    "sentences in the \"sentences\" array get a verdict."
)


class FireworksAPIError(Exception):
    pass


def _api_key():
    api_key = os.environ.get('FIREWORKS_API_KEY')
    if not api_key:
        raise FireworksAPIError('FIREWORKS_API_KEY is not set')
    return api_key


MAX_TOKENS_PER_SENTENCE = 200
MAX_TOKENS_BASE = 2000


def _build_payload(sentences, context_sentences=None):
    system_prompt = _system_prompt_with_date()
    user_content = {'sentences': sentences}
    if context_sentences:
        system_prompt += CONTEXT_SYSTEM_PROMPT_SUFFIX
        user_content['context_sentences'] = context_sentences

    return {
        'model': os.environ.get('FIREWORKS_MODEL', DEFAULT_MODEL),
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': json.dumps(user_content)},
        ],
        'temperature': 0,
        'response_format': {'type': 'json_object'},
        'max_tokens': MAX_TOKENS_BASE + MAX_TOKENS_PER_SENTENCE * len(sentences),
        'reasoning_effort': 'low',
    }


def _coerce_confidence(value):
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    # sometimes the model returns 98 instead of 0.98
    if confidence > 1:
        confidence = confidence / 100 if confidence <= 100 else 1.0
    if confidence < 0:
        confidence = 0.0
    return round(confidence, 2)


def _normalize(sentence, raw_result):
    # force the response into the {sentence, verdict, confidence, explanation} format
    raw_result = raw_result if isinstance(raw_result, dict) else {}

    verdict = raw_result.get('verdict')
    if verdict not in VALID_VERDICTS:
        verdict = 'Unverifiable'

    explanation = raw_result.get('explanation')
    if not isinstance(explanation, str) or not explanation.strip():
        explanation = 'No explanation provided.'

    return {
        'sentence': sentence,
        'verdict': verdict,
        'confidence': _coerce_confidence(raw_result.get('confidence')),
        'explanation': explanation.strip() if isinstance(explanation, str) else explanation,
    }


def fact_check_sentences(sentences, context_sentences=None, timeout=60):
    if not sentences:
        return []

    headers = {
        'Authorization': f'Bearer {_api_key()}',
        'Content-Type': 'application/json',
    }

    try:
        response = requests.post(
            FIREWORKS_API_URL,
            headers=headers,
            json=_build_payload(sentences, context_sentences=context_sentences),
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise FireworksAPIError(f'Fireworks API request failed: {exc}') from exc

    try:
        content = response.json()['choices'][0]['message']['content']
        results = json.loads(content)['results']
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise FireworksAPIError(
            f'Unexpected Fireworks API response format: {exc}'
        ) from exc

    if not isinstance(results, list) or len(results) != len(sentences):
        raise FireworksAPIError(
            'Fireworks response did not contain one result per input sentence'
        )

    return [_normalize(sentence, raw) for sentence, raw in zip(sentences, results)]
