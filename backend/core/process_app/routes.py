from flask import request, current_app

from core import socketio, db
from core.models import VideoSessionSaveModel, SentenceSaveModel


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

    # ------------------------------------------------------------------
    # TODO: Audio transcription
    # ------------------------------------------------------------------
    transcribed_sentence = "The sun sets in the east."

    sentence_ins = SentenceSaveModel(
        video_id=video.video_id,
        sentence=transcribed_sentence,
    )

    db.session.add(sentence_ins)
    db.session.commit()

    # ------------------------------------------------------------------
    # TODO: Send sentence to Fireworks
    # ------------------------------------------------------------------
    response = {
        "sentence": sentence_ins.sentence,
        "verdict": "False",
        "confidence": 0.98,
        "explanation": "The sun actually sets in the west because the Earth rotates on its axis from west to east."
    }

    socketio.emit(
        "response",
        response,
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
