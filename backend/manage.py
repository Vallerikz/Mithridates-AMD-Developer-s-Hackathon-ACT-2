import os
from flask.cli import FlaskGroup
from core import create_app, db


app = create_app(os.environ.get('FLASK_CONFIG'))
cli = FlaskGroup(app)


@cli.command("create_db")
def create_db():
    db.drop_all()
    db.create_all()
    db.session.commit()


if __name__ == "__main__":
    cli()
