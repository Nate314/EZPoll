from flask_restful import Resource
from StatusCodes import StatusCodes
from Database import Database
from Lookups import require_user, require_session, require_question
from Validation import fail, json_body, guid_field, guid_param
from guid import getGUID

class ControllerSession(Resource):

    # initialize ControllerSession
    def __init__(self):
        self.DB = Database()

    # returns the session for the session_guid passed
    def get(self, session_guid):
        return require_session(guid_param(session_guid)), StatusCodes.OK

    # if session_guid == 'new', create a new session and return the new session
    # otherwise perform the requested action ('next' or 'reveal') on the session
    def post(self, session_guid):
        body = json_body()
        user_guid = guid_field(body, 'user_guid')
        question_guid = guid_field(body, 'question_guid')
        require_user(user_guid)
        require_question(question_guid)
        if session_guid == 'new':
            return self.create_session(user_guid, question_guid), StatusCodes.OK
        session = require_session(guid_param(session_guid))
        # host-only actions: enforced here in addition to the SQL host check
        if session['HostGUID'] != user_guid:
            fail(403, 'Only the host can do that')
        if body.get('action') == 'next':
            return self.next_question(session_guid, user_guid, question_guid), StatusCodes.OK
        elif body.get('action') == 'reveal':
            if session['QuestionGUID'] != question_guid:
                fail(409, 'Question is not the current question')
            return self.reveal_question(session_guid, user_guid, question_guid), StatusCodes.OK
        fail(400, 'action must be next or reveal')

    def create_session(self, user_guid, question_guid):
        new_session = {
            'SessionGUID': getGUID(),
            'Description': '',
            'HostGUID': user_guid,
            'QuestionGUID': question_guid,
            'ShowResults': 0
        }
        if self.DB.insertOne('Session', ['SessionGUID', 'Description', 'HostGUID', 'QuestionGUID', 'ShowResults'], new_session):
            return new_session
        fail(500, 'Could not create session')

    def next_question(self, session_guid, user_guid, question_guid):
        new_session = { 'QuestionGUID': question_guid, 'ShowResults': 0 }
        if self.DB.update('Session', ['QuestionGUID', 'ShowResults'], new_session, 'SessionGUID = %s AND HostGUID = %s', [session_guid, user_guid]):
            if self.DB.delete('Result', 'SessionGUID = %s', [session_guid]) is not False:
                return new_session
        fail(500, 'Could not change question')

    def reveal_question(self, session_guid, user_guid, question_guid):
        new_session = { 'ShowResults': 1 }
        if self.DB.update('Session', ['ShowResults'], new_session, 'SessionGUID = %s AND HostGUID = %s AND QuestionGUID = %s', [session_guid, user_guid, question_guid]):
            return new_session
        fail(500, 'Could not reveal results')
