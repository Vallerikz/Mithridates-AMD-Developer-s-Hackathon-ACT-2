from flask import request, current_app

from core import socketio, db
from core.audio_processing import process_audio
from core.models import VideoSessionSaveModel


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

    process_response = process_audio(audio_chunk, video)
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
            {"error": process_response['error_message']},
            room=request.sid,
            namespace="/data_receive_space",
        )


@socketio.on("disconnect", namespace="/data_receive_space")
def disconnect():
    """
    Cleans up the session mapping.
    """
    current_app.logger.info(
        "Client disconnected. Session ID: %s",
        request.sid,
    )
