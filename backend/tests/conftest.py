import pytest

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
    client.disconnect(namespace='/data_receive_space')
