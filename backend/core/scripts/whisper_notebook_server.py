"""Runs Whisper behind an HTTP endpoint on the notebook"""

import os
import tempfile
from pathlib import Path

import whisper
from flask import Flask, request, jsonify

app = Flask(__name__)

# Must match setup_whisper_notebook.sh's WHISPER_CACHE_DIR so the model already
# downloaded during setup is found here instead of re-downloading under $HOME.
WHISPER_CACHE_DIR = os.environ.get("WHISPER_CACHE_DIR", "/workspace/whisper-cache")

model = whisper.load_model("large-v3", download_root=WHISPER_CACHE_DIR)


@app.route("/transcribe", methods=["POST"])
def transcribe():
    audio_file = request.files["audio"]

    suffix = Path(audio_file.filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        audio_file.save(tmp.name)
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
