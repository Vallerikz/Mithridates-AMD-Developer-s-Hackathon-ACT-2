"""Stress variant of socket_test_client.py: many small chunks, short intervals,
closer to a real MediaRecorder timeslice (~250ms) than the original 3-way split.
Used to try to reproduce the intermittent Whisper 500 seen on real live sessions.
"""

import sys
import time

import socketio
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
AUDIO_PATH = SCRIPT_DIR / "test_audio.webm"

CHUNK_BYTES = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
INTERVAL = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3

sio = socketio.Client(logger=False, engineio_logger=False)

state = {"video_id": None, "errors": [], "responses": 0}


@sio.on("video_session_created", namespace="/data_receive_space")
def on_session_created(data):
    print(">>> video_session_created:", data)
    state["video_id"] = data["video_id"]


@sio.on("response", namespace="/data_receive_space")
def on_response(data):
    state["responses"] += 1
    print(">>> response:", data)


@sio.on("error", namespace="/data_receive_space")
def on_error(data):
    state["errors"].append(data)
    print(">>> error:", data)


sio.connect("http://localhost:8000", namespaces=["/data_receive_space"])

sio.emit("create_video_session", {}, namespace="/data_receive_space")

for _ in range(50):
    if state["video_id"] is not None:
        break
    time.sleep(0.1)
else:
    raise RuntimeError("Timed out waiting for video_session_created")

with AUDIO_PATH.open("rb") as f:
    audio = f.read()

chunks = [audio[i:i + CHUNK_BYTES] for i in range(0, len(audio), CHUNK_BYTES)]

print(f">>> {len(chunks)} chunks of ~{CHUNK_BYTES} bytes, {INTERVAL}s apart "
      f"({len(chunks) * INTERVAL:.1f}s total)")

for i, chunk in enumerate(chunks):
    sio.emit(
        "receive_audio_chunk",
        {
            "video_id": state["video_id"],
            "audio_chunk": chunk,
        },
        namespace="/data_receive_space",
    )
    time.sleep(INTERVAL)

time.sleep(30)
sio.disconnect()

print(f">>> DONE. responses={state['responses']} errors={len(state['errors'])}")
if state["errors"]:
    sys.exit(1)
