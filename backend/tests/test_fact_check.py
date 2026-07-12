import json

import pytest
import requests

from core.services import fact_check_service
from core.services.fact_check_service import (
    FireworksAPIError,
    fact_check_sentences,
)


class FakeResponse:
    def __init__(self, payload, status_ok=True):
        self._payload = payload
        self._status_ok = status_ok

    def raise_for_status(self):
        if not self._status_ok:
            raise requests.HTTPError('500 Server Error')

    def json(self):
        return self._payload


def _fireworks_payload(results):
    return {
        'choices': [
            {'message': {'content': json.dumps({'results': results})}}
        ]
    }


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setenv('FIREWORKS_API_KEY', 'test-key')


def test_returns_one_result_per_sentence(monkeypatch):
    sentences = ['The sky is blue.', 'Cats can fly.']
    api_results = [
        {'sentence': 'The sky is blue.', 'verdict': 'True',
         'confidence': 0.95, 'explanation': 'Correct.'},
        {'sentence': 'Cats can fly.', 'verdict': 'False',
         'confidence': 0.99, 'explanation': 'Cats cannot fly.'},
    ]

    def fake_post(url, **kwargs):
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    results = fact_check_sentences(sentences)

    assert len(results) == 2
    for result, sentence in zip(results, sentences):
        assert set(result.keys()) == {'sentence', 'verdict', 'confidence', 'explanation'}
        assert result['sentence'] == sentence
    assert results[0]['verdict'] == 'True'
    assert results[1]['verdict'] == 'False'


def test_empty_list_short_circuits(monkeypatch):
    def fail_post(*args, **kwargs):
        raise AssertionError('requests.post should not be called for empty input')

    monkeypatch.setattr(requests, 'post', fail_post)

    assert fact_check_sentences([]) == []


def test_missing_api_key_raises(monkeypatch):
    monkeypatch.delenv('FIREWORKS_API_KEY', raising=False)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['Anything.'])


def test_http_error_raises(monkeypatch):
    def fake_post(url, **kwargs):
        return FakeResponse({}, status_ok=False)

    monkeypatch.setattr(requests, 'post', fake_post)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['The sky is blue.'])


def test_network_error_raises(monkeypatch):
    def fake_post(url, **kwargs):
        raise requests.ConnectionError('no network')

    monkeypatch.setattr(requests, 'post', fake_post)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['The sky is blue.'])


def test_malformed_json_content_raises(monkeypatch):
    def fake_post(url, **kwargs):
        return FakeResponse({'choices': [{'message': {'content': 'not json'}}]})

    monkeypatch.setattr(requests, 'post', fake_post)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['The sky is blue.'])


def test_missing_choices_raises(monkeypatch):
    def fake_post(url, **kwargs):
        return FakeResponse({'unexpected': 'shape'})

    monkeypatch.setattr(requests, 'post', fake_post)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['The sky is blue.'])


def test_length_mismatch_raises(monkeypatch):
    api_results = [
        {'sentence': 'A.', 'verdict': 'True', 'confidence': 0.9, 'explanation': 'x'},
    ]

    def fake_post(url, **kwargs):
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    with pytest.raises(FireworksAPIError):
        fact_check_sentences(['A.', 'B.'])


def test_unknown_verdict_is_coerced(monkeypatch):
    api_results = [
        {'sentence': 'Weird.', 'verdict': 'MAYBE',
         'confidence': 0.5, 'explanation': 'unclear'},
    ]

    def fake_post(url, **kwargs):
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    result = fact_check_sentences(['Weird.'])[0]
    assert result['verdict'] == 'Unverifiable'


def test_confidence_out_of_range_is_normalized(monkeypatch):
    api_results = [
        {'sentence': 'Scaled.', 'verdict': 'True',
         'confidence': 95, 'explanation': 'ok'},
    ]

    def fake_post(url, **kwargs):
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    result = fact_check_sentences(['Scaled.'])[0]
    assert 0.0 <= result['confidence'] <= 1.0
    assert result['confidence'] == 0.95


def test_missing_explanation_gets_default(monkeypatch):
    api_results = [
        {'sentence': 'No reason.', 'verdict': 'True', 'confidence': 0.8},
    ]

    def fake_post(url, **kwargs):
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    result = fact_check_sentences(['No reason.'])[0]
    assert result['explanation'] == 'No explanation provided.'


def test_authorization_header_is_sent(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured['headers'] = kwargs.get('headers', {})
        captured['url'] = url
        api_results = [
            {'sentence': 'A.', 'verdict': 'True', 'confidence': 0.9, 'explanation': 'x'},
        ]
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)

    fact_check_sentences(['A.'])

    assert captured['url'] == fact_check_service.FIREWORKS_API_URL
    assert captured['headers']['Authorization'] == 'Bearer test-key'


def _capture_payload(monkeypatch, captured):
    def fake_post(url, **kwargs):
        captured['payload'] = kwargs.get('json', {})
        api_results = [
            {'sentence': 'A.', 'verdict': 'True', 'confidence': 0.9, 'explanation': 'x'},
        ]
        return FakeResponse(_fireworks_payload(api_results))

    monkeypatch.setattr(requests, 'post', fake_post)


def test_video_context_is_sent_as_user_data(monkeypatch):
    captured = {}
    _capture_payload(monkeypatch, captured)

    fact_check_sentences(['A.'], video_context='Some Debate - YouTube')

    system_message, user_message = captured['payload']['messages']
    user_content = json.loads(user_message['content'])

    assert user_content['video_context'] == 'Some Debate - YouTube'
    # the title is third-party text: it must stay data, never become instructions
    assert 'Some Debate' not in system_message['content']
    assert fact_check_service.VIDEO_CONTEXT_SYSTEM_PROMPT_SUFFIX in system_message['content']


def test_no_video_context_leaves_payload_untouched(monkeypatch):
    captured = {}
    _capture_payload(monkeypatch, captured)

    fact_check_sentences(['A.'])

    system_message, user_message = captured['payload']['messages']

    assert 'video_context' not in json.loads(user_message['content'])
    assert fact_check_service.VIDEO_CONTEXT_SYSTEM_PROMPT_SUFFIX not in system_message['content']
