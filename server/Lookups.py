from Database import Database
from Validation import fail

# shared "load it or respond 404" helpers used by the controllers

def _require(table, columns, key, guid, label):
    row = Database().select(columns, table, key + ' = %s', [guid]).first()
    if row is None:
        fail(404, label + ' not found')
    return row.toJSON()

def require_user(user_guid):
    return _require('User', ['UserGUID', 'Description', 'SessionGUID'], 'UserGUID', user_guid, 'User')

def require_session(session_guid):
    return _require('Session', ['SessionGUID', 'Description', 'HostGUID', 'QuestionGUID', 'ShowResults'],
        'SessionGUID', session_guid, 'Session')

def require_question(question_guid):
    return _require('Question', ['QuestionGUID', 'Description'], 'QuestionGUID', question_guid, 'Question')
