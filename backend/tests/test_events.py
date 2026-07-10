from core import audio_processing
from core.services.fact_check_service import FireworksAPIError

NAMESPACE = '/data_receive_space'

CLUSTER_ID = b'\x1f\x43\xb6\x75'


def webm_chunk(*clusters):
    # header + N clusters; one emit needs at least two clusters for a complete
    # one to be returned, since the trailing cluster is held back
    return b'\x1a\x45\xdf\xa3header' + b''.join(CLUSTER_ID + c for c in clusters)


def create_session(socket_client):
    socket_client.emit('create_video_session', {}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)
    return received[0]['args'][0]['video_id']


def fake_transcribe(text):
    def _transcribe(audio_chunk):
        return text
    return _transcribe


def test_create_video_session(socket_client):
    socket_client.emit('create_video_session', {}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['name'] == 'video_session_created'
    assert 'video_id' in received[0]['args'][0]


def test_missing_video_id_and_audio_chunk(socket_client):
    socket_client.emit('receive_audio_chunk', {}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['name'] == 'error'
    assert received[0]['args'][0]['message'] == 'Missing required field(s): video_id, audio_chunk'


def test_missing_audio_chunk(socket_client):
    video_id = create_session(socket_client)

    socket_client.emit('receive_audio_chunk', {'video_id': video_id}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['args'][0]['message'] == 'Missing required field(s): audio_chunk'


def test_missing_video_id(socket_client):
    socket_client.emit('receive_audio_chunk', {'audio_chunk': b'fakebytes'}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['args'][0]['message'] == 'Missing required field(s): video_id'


def test_video_session_not_found(socket_client):
    socket_client.emit(
        'receive_audio_chunk',
        {'video_id': 999999, 'audio_chunk': b'fakebytes'},
        namespace=NAMESPACE,
    )
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['args'][0]['message'] == 'Video session not found.'


def test_receive_audio_chunk_happy_path(socket_client, monkeypatch):
    monkeypatch.setattr(
        audio_processing, 'transcribe',
        fake_transcribe('The sky is blue. Cats can fly.'),
    )

    def fake_fact_check(sentences, context_sentences=None, timeout=20):
        return [
            {
                'sentence': sentence,
                'verdict': 'True',
                'confidence': 0.9,
                'explanation': 'mocked explanation',
            }
            for sentence in sentences
        ]

    monkeypatch.setattr(audio_processing, 'fact_check_sentences', fake_fact_check)

    video_id = create_session(socket_client)

    socket_client.emit(
        'receive_audio_chunk',
        {'video_id': video_id, 'audio_chunk': webm_chunk(b'first', b'second')},
        namespace=NAMESPACE,
    )
    received = socket_client.get_received(namespace=NAMESPACE)

    # the claims are pushed right after transcription, before the verdicts
    assert received[0]['name'] == 'transcription'
    assert received[0]['args'][0] == {'sentences': ['The sky is blue.', 'Cats can fly.']}

    assert received[1]['name'] == 'response'
    results = received[1]['args'][0]
    assert len(results) == 2
    for result in results:
        assert set(result.keys()) == {'sentence', 'verdict', 'confidence', 'explanation'}


def test_empty_transcript_emits_nothing(socket_client, monkeypatch):
    monkeypatch.setattr(audio_processing, 'transcribe', fake_transcribe(''))

    video_id = create_session(socket_client)

    socket_client.emit(
        'receive_audio_chunk',
        {'video_id': video_id, 'audio_chunk': webm_chunk(b'first', b'second')},
        namespace=NAMESPACE,
    )
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received == []


def test_receive_audio_chunk_fireworks_failure(socket_client, monkeypatch):
    monkeypatch.setattr(
        audio_processing, 'transcribe',
        fake_transcribe('The sky is blue.'),
    )

    def boom(sentences, context_sentences=None, timeout=20):
        raise FireworksAPIError('Fireworks API request failed')

    monkeypatch.setattr(audio_processing, 'fact_check_sentences', boom)

    video_id = create_session(socket_client)

    socket_client.emit(
        'receive_audio_chunk',
        {'video_id': video_id, 'audio_chunk': webm_chunk(b'first', b'second')},
        namespace=NAMESPACE,
    )
    received = socket_client.get_received(namespace=NAMESPACE)

    # the transcription event fires before the fact-check call fails
    assert received[0]['name'] == 'transcription'
    assert received[1]['name'] == 'error'
    assert received[1]['args'][0]['message'] == 'Fireworks API request failed'


def test_duplicate_claims_use_cached_verdicts(socket_client, monkeypatch):
    monkeypatch.setattr(
        audio_processing, 'transcribe',
        fake_transcribe('The sky is blue. The sky is blue.'),
    )

    calls = []

    def fake_fact_check(sentences, context_sentences=None, timeout=20):
        calls.append(list(sentences))
        return [
            {
                'sentence': sentence,
                'verdict': 'True',
                'confidence': 0.9,
                'explanation': 'mocked explanation',
            }
            for sentence in sentences
        ]

    monkeypatch.setattr(audio_processing, 'fact_check_sentences', fake_fact_check)

    video_id = create_session(socket_client)

    for _ in range(2):
        socket_client.emit(
            'receive_audio_chunk',
            {'video_id': video_id, 'audio_chunk': webm_chunk(b'first', b'second')},
            namespace=NAMESPACE,
        )
    received = socket_client.get_received(namespace=NAMESPACE)

    # every repetition of an already-checked sentence is served from the
    # cache: the API only ever sees the sentence once
    assert calls == [['The sky is blue.']]

    responses = [event for event in received if event['name'] == 'response']
    assert len(responses) == 2
    for response in responses:
        results = response['args'][0]
        assert len(results) == 2
        for result in results:
            assert result['sentence'] == 'The sky is blue.'
            assert result['verdict'] == 'True'
