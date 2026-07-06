from flask import Blueprint

bp = Blueprint('process_app', __name__)

from core.process_app import routes
from core.process_app import events
