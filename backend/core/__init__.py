import os
import json

from flask import Flask
from config import config
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow

load_dotenv(os.environ.get('env_file'))

# flask extensions
cors_origins = json.loads(os.environ.get('CORS_ORIGINS'))
cors = CORS(origins=cors_origins)
db = SQLAlchemy()
socketio = SocketIO(
    cors_allowed_origins=cors_origins,
    logger=True, engineio_logger=True
)
swagger = Swagger()
migrate = Migrate(compare_type=True)
marshmallow = Marshmallow()


def create_app(config_name, **kwargs):
    app = Flask(
        __name__
    )
    app.config.from_object(config[config_name])

    # Initializing flask extensions
    db.init_app(app)
    cors.init_app(app)
    socketio.init_app(app)
    migrate.init_app(app, db)
    marshmallow.init_app(app)
    swagger.init_app(app)

    # Registering Blueprints
    from core.process_app import bp as p_bp
    from core.features_app import bp as f_bp

    app.register_blueprint(p_bp)
    app.register_blueprint(f_bp)

    return app


# Importing models here so that they are registered with SQLAlchemy
from core import models  # noqa: F401,E402
