"""Used to test the socketio APIs"""

import socketio
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
AUDIO_PATH = SCRIPT_DIR / "test_audio.mp3"


sio = socketio.Client(
    logger=True, engineio_logger=True
)

sio.connect("http://localhost:8000",
            namespaces=["/data_receive_space"])


with AUDIO_PATH.open("rb") as f:
    audio = f.read()

sio.emit(
    "receive_audio_chunk",
    {
        "video_id": 1,
        "audio_chunk": audio,
    },
    namespace="/data_receive_space",
)

sio.wait()
