import os

import pytest

os.environ.setdefault('GEMINI_API_KEY', 'test-key')

from core import create_app, db, socketio


@pytest.fixture(scope='session')
def app():
    app = create_app('testing')
    with app.app_context():
        yield app


@pytest.fixture(autouse=True)
def db_tables(app):
    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


@pytest.fixture
def socket_client(app):
    client = socketio.test_client(app, namespace='/data_receive_space')
    yield client
    # some tests disconnect the client themselves to exercise the cleanup path
    if client.is_connected(namespace='/data_receive_space'):
        client.disconnect(namespace='/data_receive_space')
