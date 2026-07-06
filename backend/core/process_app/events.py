from flask_socketio import emit

from core import socketio, db
from core.models import VideoSession
from core.process_app import fact_check

NAMESPACE = '/data_receive_space'


@socketio.on('create_video_session', namespace=NAMESPACE)
def handle_create_video_session():
    session = VideoSession()
    db.session.add(session)
    db.session.commit()

    emit('video_session_created', {'video_id': session.id})


@socketio.on('receive_audio_chunk', namespace=NAMESPACE)
def handle_receive_audio_chunk(data):
    video_id = (data or {}).get('video_id')
    audio_chunk = (data or {}).get('audio_chunk')

    missing = [field for field, value in (('video_id', video_id), ('audio_chunk', audio_chunk)) if not value]
    if missing:
        emit('error', {'message': f"Missing required field(s): {', '.join(missing)}"})
        return

    session = db.session.get(VideoSession, video_id)
    if session is None:
        emit('error', {'message': 'Video session not found'})
        return

    try:
        transcript = fact_check.transcribe_chunk(audio_chunk)
        sentences = fact_check.split_into_sentences(transcript)
        results = fact_check.check_sentences(sentences)
    except Exception:
        emit('error', {'message': 'error contacting external API'})
        return

    emit('response', results)
