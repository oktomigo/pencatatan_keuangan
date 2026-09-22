from flask import jsonify


def ok(data, status=200, meta=None):
    payload = {'success': True, 'data': data}
    if meta is not None:
        payload['meta'] = meta
    return jsonify(payload), status


def fail(code, message, fields=None, data=None, status=400):
    error = {'code': code, 'message': message}
    if fields is not None:
        error['fields'] = fields
    if data is not None:
        error['data'] = data
    return jsonify({'success': False, 'error': error}), status