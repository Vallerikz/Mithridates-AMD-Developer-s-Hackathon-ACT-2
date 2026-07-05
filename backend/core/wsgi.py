import os
from core import create_app, socketio

app = create_app(os.environ.get('FLASK_CONFIG'))


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
    socketio.run(app, port=port)
