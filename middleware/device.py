import re
import uuid
from datetime import datetime, timezone

from flask import g, request
from pymongo.errors import PyMongoError

from db import get_db
from utils_api import fail

DEVICE_PATTERN = re.compile(r'^[A-Za-z0-9_-]{16,64}$')


def is_valid_device_id(value):
    if not isinstance(value, str) or not value:
        return False
    try:
        parsed = uuid.UUID(value)
        return parsed.version == 4
    except ValueError:
        return bool(DEVICE_PATTERN.fullmatch(value))


def register_device_middleware(app):
    @app.before_request
    def require_device_id():
        if not request_is_api(app) or request_path_is_public():
            return None

        device_id = request.headers.get('X-Device-ID', '').strip()
        if not is_valid_device_id(device_id):
            return fail('DEVICE_REQUIRED', 'Perangkat belum dikenali.', status=401)

        g.device_id = device_id
        try:
            get_db().devices.update_one(
                {'device_id': device_id},
                {'$set': {'last_seen_at': datetime.now(timezone.utc).isoformat()}},
            )
        except PyMongoError:
            # Tracking last_seen must never block an otherwise valid API request.
            pass
        return None


def request_is_api(app):
    return request.path.startswith('/api/')


def request_path_is_public():
    return request.path in {'/api/health', '/api/init'}
