import json
import os

import requests

FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions'

DEFAULT_MODEL = 'accounts/fireworks/models/llama-v3p1-70b-instruct'

VALID_VERDICTS = ('True', 'False', 'Unverifiable')

FACT_CHECK_SYSTEM_PROMPT = (
    "You are a rigorous fact-checking assistant. You will receive a JSON array "
    "of sentences transcribed from a live video. For each sentence, decide "
    "whether the factual claim it makes is true, false, or unverifiable given "
    "well-established general knowledge.\n"
    "Respond with a single JSON object of the form {\"results\": [...]}. The "
    "\"results\" array must contain exactly one object per input sentence, in "
    "the same order, and each object must have these keys:\n"
    "  - \"sentence\": the sentence, copied verbatim\n"
    "  - \"verdict\": one of \"True\", \"False\", \"Unverifiable\"\n"
    "  - \"confidence\": a number between 0 and 1\n"
    "  - \"explanation\": a short, one-sentence justification\n"
    "Respond with the JSON object only, no surrounding prose or markdown."
)


class FireworksAPIError(Exception):
    pass


def _api_key():
    api_key = os.environ.get('FIREWORKS_API_KEY')
    if not api_key:
        raise FireworksAPIError('FIREWORKS_API_KEY is not set')
    return api_key


def _build_payload(sentences):
    return {
        'model': os.environ.get('FIREWORKS_MODEL', DEFAULT_MODEL),
        'messages': [
            {'role': 'system', 'content': FACT_CHECK_SYSTEM_PROMPT},
            {'role': 'user', 'content': json.dumps(sentences)},
        ],
        'temperature': 0,
        'response_format': {'type': 'json_object'},
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


def fact_check_sentences(sentences, timeout=20):
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
            json=_build_payload(sentences),
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
