from flask import request
from flask_restful import abort
from guid import isGUID

# consistent JSON error: {"message": "..."} with the given status code
def fail(status, message):
    abort(status, message = message)

# returns the JSON request body, which must be a JSON object
def json_body():
    body = request.get_json(silent = True)
    if not isinstance(body, dict):
        fail(400, 'Request body must be a JSON object')
    return body

# returns body[key], which must be a valid GUID (or None when nullable)
def guid_field(body, key, nullable = False):
    value = body.get(key)
    if value is None and nullable:
        return None
    if not isGUID(value):
        fail(400, key + ' must be a valid GUID')
    return value

# validates a GUID taken from the URL
def guid_param(value):
    if not isGUID(value):
        fail(404, 'Not found')
    return value
