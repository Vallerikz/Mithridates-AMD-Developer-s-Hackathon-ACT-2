import os
from dotenv import load_dotenv

load_dotenv(os.environ.get('env_file'))

basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    FLASK_APP = os.environ.get('FLASK_APP')
    FLASK_DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Default pool (5 + 10 overflow = 15 connections) runs out under a
    # handful of concurrent Socket.IO streams: each audio chunk holds its DB
    # connection open for the whole (now-serialized, since the Whisper mutex
    # fix) blocking transcription round-trip. Raised to give a live
    # multi-viewer demo headroom.
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'max_overflow': 20,
        'pool_timeout': 60,
        'pool_pre_ping': True,
    }


class DevelopmentConfig(Config):
    FLASK_DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')


class TestingConfig(Config):
    FLASK_DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URI')


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}
