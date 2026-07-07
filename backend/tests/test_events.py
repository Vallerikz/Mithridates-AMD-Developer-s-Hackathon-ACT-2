from core.process_app import fireworks_client

NAMESPACE = '/data_receive_space'


def create_session(socket_client):
    socket_client.emit('create_video_session', namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)
    return received[0]['args'][0]['video_id']


def test_create_video_session(socket_client):
    socket_client.emit('create_video_session', namespace=NAMESPACE)
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
    socket_client.emit('receive_audio_chunk', {'video_id': 'nope', 'audio_chunk': b'fakebytes'}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['args'][0]['message'] == 'Video session not found'


def test_receive_audio_chunk_happy_path(socket_client, monkeypatch):
    def fake_fact_check(sentences, timeout=20):
        return [
            {
                'sentence': sentence,
                'verdict': 'True',
                'confidence': 0.9,
                'explanation': 'mocked explanation',
            }
            for sentence in sentences
        ]

    monkeypatch.setattr(fireworks_client, 'fact_check_sentences', fake_fact_check)

    video_id = create_session(socket_client)

    socket_client.emit('receive_audio_chunk', {'video_id': video_id, 'audio_chunk': b'fakebytes'}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['name'] == 'response'
    result = received[0]['args'][0][0]
    assert set(result.keys()) == {'sentence', 'verdict', 'confidence', 'explanation'}


def test_receive_audio_chunk_fireworks_failure(socket_client, monkeypatch):
    def boom(sentences, timeout=20):
        raise fireworks_client.FireworksAPIError('boom')

    monkeypatch.setattr(fireworks_client, 'fact_check_sentences', boom)

    video_id = create_session(socket_client)

    socket_client.emit('receive_audio_chunk', {'video_id': video_id, 'audio_chunk': b'fakebytes'}, namespace=NAMESPACE)
    received = socket_client.get_received(namespace=NAMESPACE)

    assert received[0]['name'] == 'error'
    assert received[0]['args'][0]['message'] == 'error contacting external API'
