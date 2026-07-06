import uuid
from datetime import datetime

from core import db


class VideoSession(db.Model):
    __tablename__ = 'video_sessions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
