from flask import request, current_app

from core import socketio, db
from core.audio_processing import process_audio, flush_audio
from core.models import VideoSessionSaveModel

# session id -> video_id, used to flush the final audio buffer on disconnect
_session_videos = {}


def _emit_transcription(sid):
    """Pushes the claims to the client before the fact-check call, so the
    frontend can already display them while the verdicts are computed."""
    def _callback(claims):
        socketio.emit(
            "transcription",
            {"sentences": claims},
            room=sid,
            namespace="/data_receive_space",
        )
    return _callback


@socketio.on("connect", namespace="/data_receive_space")
def connect():
    """Socket.IO connection established."""
    current_app.logger.info(
        "Client connected. Session ID: %s",
        request.sid,
    )


@socketio.on("create_video_session", namespace="/data_receive_space")
def create_video_session(_):
    """
    Creates a new video/session and returns the video_id.
    """

    video = VideoSessionSaveModel()

    db.session.add(video)
    db.session.commit()

    socketio.emit(
        "video_session_created",
        {
            "video_id": video.video_id,
        },
        room=request.sid, namespace='/data_receive_space'
    )


@socketio.on("receive_audio_chunk", namespace="/data_receive_space")
def receive_audio_chunk(data):
    """
    Receives one audio chunk from frontend.
    """

    required_fields = ("video_id", "audio_chunk")

    missing_fields = [
        field for field in required_fields
        if field not in data
    ]

    if missing_fields:
        socketio.emit(
            "error",
            {
                "message": (
                    f"Missing required field(s): "
                    f"{', '.join(missing_fields)}"
                )
            },
            room=request.sid,
            namespace="/data_receive_space",
        )
        return

    video = VideoSessionSaveModel.query.filter_by(
        video_id=data["video_id"]
    ).first()

    if not video:
        socketio.emit(
            "error",
            {"message": "Video session not found."},
            room=request.sid,
            namespace="/data_receive_space",
        )
        return

    # Expects audio as an ArrayBuffer
    audio_chunk = data["audio_chunk"]

    _session_videos[request.sid] = video.video_id

    process_response = process_audio(
        audio_chunk, video, on_claims=_emit_transcription(request.sid),
    )
    if process_response["error"] is False:
        if len(process_response["responses"]) == 0:
            return
        socketio.emit(
            "response", process_response['responses'],
            room=request.sid, namespace="/data_receive_space",
        )
    else:
        socketio.emit(
            "error",
            {"message": process_response['error_message']},
            room=request.sid,
            namespace="/data_receive_space",
        )


@socketio.on("disconnect", namespace="/data_receive_space")
def disconnect(reason=None):
    """
    Cleans up the session mapping.
    """
    current_app.logger.info(
        "Client disconnected. Session ID: %s",
        request.sid,
    )

    video_id = _session_videos.pop(request.sid, None)
    if video_id is None:
        return

    flush_response = flush_audio(
        video_id, on_claims=_emit_transcription(request.sid),
    )
    if flush_response["error"] is False:
        if len(flush_response["responses"]) == 0:
            return
        socketio.emit(
            "response", flush_response["responses"],
            room=request.sid, namespace="/data_receive_space",
        )
    else:
        socketio.emit(
            "error",
            {"message": flush_response["error_message"]},
            room=request.sid,
            namespace="/data_receive_space",
        )
