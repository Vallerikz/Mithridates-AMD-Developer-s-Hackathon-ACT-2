from flask import jsonify, request
from flasgger import swag_from
from flask_expects_json import expects_json

from core import db
from core.features_app import bp
from core.models import VideoSessionSaveModel
from core.services.summary_service import summarize
from core.schema import video_save_sessions_schema
from core.json_schemas import post_video_summary_schema


@bp.route("/videos/<int:video_id>/summary", methods=["POST"])
@swag_from('/core/docs/post_video_summary.yml')
@expects_json(post_video_summary_schema)
def post_video_summary(video_id):
    """
    Generates or updates the summary for a video session.

    Body:
        action: "generate" (only summarize if no summary exists yet)
                or "update" (always regenerate, overwriting any existing summary)
    """
    action = request.json['action']

    video = VideoSessionSaveModel.query.filter_by(
        video_id=video_id
    ).first()

    if not video:
        return jsonify({
            "message": "Video session not found."
        }), 404

    if action == "generate" and video.summary_text:
        return jsonify({
            "video_id": video.video_id,
            "summary": video.summary_text,
        }), 200

    sentences = [
        sentence.sentence
        for sentence in video.sentences
    ]
    if not sentences:
        return jsonify({
            "video_id": video.video_id,
            "summary": "",
        }), 200

    summary_dict = summarize(sentences)
    if not summary_dict["success"]:
        return jsonify({
            "error": summary_dict["error_message"]
        }), 500

    try:
        video.summary_text = summary_dict["summary"]
        db.session.add(video)
        db.session.commit()
    except Exception as e:
        print(f"{e} exception occured.", flush=True)
        db.session.rollback()
        return jsonify({"error": "Failed to save summary."}), 500

    return jsonify({
        "video_id": video.video_id,
        "summary": summary_dict["summary"],
    }), 200


@bp.route("/history", methods=["GET"])
@swag_from('/core/docs/get_history.yml')
def get_history():
    """
    Retrieves past sessions, paginated.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)  # cap it so clients can't request 10,000 at once

    pagination = VideoSessionSaveModel.query.order_by(
        VideoSessionSaveModel.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    data = video_save_sessions_schema.dump(pagination.items)

    return jsonify({
        "items": data,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total_items": pagination.total,
        "total_pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }), 200
