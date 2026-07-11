from core import marshmallow
from marshmallow import fields


class VideoSessionSaveModelSchema(marshmallow.Schema):
    video_id = fields.Int()
    summary_text = fields.Str(allow_none=True)
    created_at = fields.DateTime()

    class Meta:
        fields = (
            'video_id', 'summary_text', 'created_at'
        )


video_save_session_schema = VideoSessionSaveModelSchema()
video_save_sessions_schema = VideoSessionSaveModelSchema(many=True)
