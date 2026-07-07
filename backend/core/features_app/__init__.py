from flask import Blueprint

bp = Blueprint('features_app', __name__)

from core.features_app import routes
