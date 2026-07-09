"""Runs Whisper behind an HTTP endpoint on the notebook"""

import os
import tempfile
import threading
import traceback
from pathlib import Path

import whisper
from flask import Flask, request, jsonify
from werkzeug.exceptions import HTTPException

app = Flask(__name__)

# Must match setup_whisper_notebook.sh's WHISPER_CACHE_DIR so the model already
# downloaded during setup is found here instead of re-downloading under $HOME.
WHISPER_CACHE_DIR = os.environ.get("WHISPER_CACHE_DIR", "/workspace/whisper-cache")

model = whisper.load_model("large-v3", download_root=WHISPER_CACHE_DIR)

# Flask serves each request in its own thread, but the Whisper model is a single
# shared instance that is not thread-safe: two overlapping transcribe() calls
# crash both requests. Serialize inference; concurrent callers just wait.
_model_lock = threading.Lock()


@app.errorhandler(Exception)
def handle_error(exc):
    if isinstance(exc, HTTPException):
        return exc
    # The notebook console has no usable scrollback, so the response body is the
    # only place a traceback can be read from (the backend logs it).
    return jsonify({"error": f"{type(exc).__name__}: {exc}",
                    "traceback": traceback.format_exc()}), 500


@app.route("/transcribe", methods=["POST"])
def transcribe():
    audio_file = request.files["audio"]

    suffix = Path(audio_file.filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        audio_file.save(tmp.name)
        with _model_lock:
            result = model.transcribe(
                tmp.name,
                temperature=0,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
            )

    segments = [
        seg["text"].strip()
        for seg in result["segments"]
        if seg.get("no_speech_prob", 0) < 0.6
    ]

    return jsonify({"text": " ".join(segments).strip()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)
