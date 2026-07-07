from flask import jsonify
from flasgger import swag_from

from core.features_app import bp
from core.models import VideoSessionSaveModel
from core.services.summary_service import summarize


@bp.route("/videos/<int:video_id>/summary", methods=["GET"])
@swag_from('/core/docs/get_video_summary.yml')
def get_video_summary(video_id):
    """
    Retrieves all transcribed sentences for a video session,
    generates a summary using the configured LLM, and returns
    the summary.
    """
    video = VideoSessionSaveModel.query.filter_by(
        video_id=video_id
    ).first()

    if not video:
        return jsonify({
            "message": "Video session not found."
        }), 404

    sentences = [
        sentence.sentence
        for sentence in video.sentences
    ]

    summary = summarize(sentences)

    return jsonify({
        "video_id": video.video_id,
        "summary": summary,
    }), 200
