from datetime import datetime, UTC

from core import db


class VideoSessionSaveModel(db.Model):
    __tablename__ = "videos"

    video_id = db.Column(db.Integer, primary_key=True)

    sentences = db.relationship(
        "SentenceSaveModel",
        backref="video",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Video {self.video_id}>"


class SentenceSaveModel(db.Model):
    __tablename__ = "sentences"

    id = db.Column(db.Integer, primary_key=True)

    video_id = db.Column(
        db.Integer,
        db.ForeignKey("videos.video_id"),
        nullable=False,
    )

    sentence = db.Column(
        db.Text,
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    def __repr__(self):
        return f"<Sentence {self.id}>"
