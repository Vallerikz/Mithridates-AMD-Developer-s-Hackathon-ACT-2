"""Used to test the socketio APIs"""

import socketio

sio = socketio.Client(
    logger=True, engineio_logger=True
)

sio.connect("http://localhost:8000",
            namespaces=["/data_receive_space"])

with open("test_audio.m4a", "rb") as f:
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
