from flask import Flask, request;
from flask_restful import Resource;
from StatusCodes import StatusCodes;
from Database import Database;
from guid import getGUID;

class ControllerSession(Resource):

    # initialize ControllerSession
    def __init__(self):
        self.DB = Database()

    # returns the current question guid for the session_guid passed
    def get(self, session_guid):
        if len(session_guid) == 36:
            return self.get_session(session_guid), StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    # if session_guid == 'new', create a new session and return the new session's guid
    # otherwise perform the requested action on the session_guid
    def post(self, session_guid):
        body = request.get_json();
        print('-----body-----');
        print(body);
        print('-----body-----');
        user_guid = body['user_guid'];
        question_guid = body['question_guid'];
        if session_guid == 'new':
            return self.create_session(user_guid, user_guid), StatusCodes.OK;
        elif len(session_guid) == 36:
            if body['action'] == 'next':
                return self.next_question(session_guid, user_guid, question_guid), StatusCodes.OK;
            elif body['action'] == 'reveal':
                return self.reveal_question(session_guid, user_guid, question_guid), StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    def get_session(self, session_guid):
        return self.DB.select(['SessionGUID', 'Description', 'QuestionGUID'], 'Session', 'SessionGUID = %s', [session_guid])[0].toJSON();

    def create_session(self, user_guid, question_guid):
        new_session = {
            'SessionGUID': getGUID(),
            'Description': '',
            'HostGUID': user_guid,
            'QuestionGUID': question_guid,
            'ShowResults': 0
        };
        if self.DB.insertOne('Session', ['SessionGUID', 'Description', 'HostGUID', 'QuestionGUID', 'ShowResults'], new_session):
            return new_session;
        else:
            return False;

    def next_question(self, session_guid, user_guid, question_guid):
        new_session = { 'QuestionGUID': question_guid, 'ShowResults': 0 };
        if self.DB.update('Session', ['QuestionGUID', 'ShowResults'], new_session, 'SessionGUID = %s AND HostGUID = %s', [session_guid, user_guid]):
            return new_session;
        else:
            return False;

    def reveal_question(self, session_guid, user_guid, question_guid):
        new_session = { 'ShowResults': 1 };
        if self.DB.update('Session', ['ShowResults'], new_session, 'SessionGUID = %s AND HostGUID = %s AND QuestionGUID = %s', [session_guid, user_guid, question_guid]):
            return new_session;
        else:
            return False;
