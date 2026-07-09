"""Used to test the socketio APIs"""

import time

import socketio
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
AUDIO_PATH = SCRIPT_DIR / "test_audio.webm"
# How many pieces to split the audio into, to mimic MediaRecorder's
# timesliced chunks (only the first chunk carries the container header).
NUM_CHUNKS = 3

sio = socketio.Client(logger=True, engineio_logger=False)

state = {"video_id": None}


@sio.on("video_session_created", namespace="/data_receive_space")
def on_session_created(data):
    print(">>> video_session_created:", data)
    state["video_id"] = data["video_id"]


@sio.on("response", namespace="/data_receive_space")
def on_response(data):
    print(">>> response:", data)


@sio.on("error", namespace="/data_receive_space")
def on_error(data):
    print(">>> error:", data)


sio.connect("http://localhost:8000", namespaces=["/data_receive_space"])

sio.emit("create_video_session", {}, namespace="/data_receive_space")

# Wait for the server to hand back a video_id before sending audio.
for _ in range(50):
    if state["video_id"] is not None:
        break
    time.sleep(0.1)
else:
    raise RuntimeError("Timed out waiting for video_session_created")

with AUDIO_PATH.open("rb") as f:
    audio = f.read()

chunk_size = (len(audio) + NUM_CHUNKS - 1) // NUM_CHUNKS
chunks = [audio[i:i + chunk_size] for i in range(0, len(audio), chunk_size)]

for i, chunk in enumerate(chunks):
    print(f">>> sending chunk {i + 1}/{len(chunks)} ({len(chunk)} bytes)")
    sio.emit(
        "receive_audio_chunk",
        {
            "video_id": state["video_id"],
            "audio_chunk": chunk,
        },
        namespace="/data_receive_space",
    )
    time.sleep(1)

# Give the server a moment to process the last chunk before disconnecting
# (disconnect triggers flush_audio, which drains the final held-back cluster).
time.sleep(8)
sio.disconnect()
