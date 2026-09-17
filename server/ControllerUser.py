from flask import Flask, request;
from flask_restful import Resource;
from StatusCodes import StatusCodes;
from Database import Database;
from guid import getGUID;

class ControllerUser(Resource):

    # initialize ControllerUser
    def __init__(self):
        self.DB = Database()

    # if user_guid == 'new', create a new user and return the new user's guid
    # otherwise return information about the queried user_guid
    def get(self, user_guid):
        if user_guid == 'new':
            return self.create_user(), StatusCodes.OK;
        elif len(user_guid) == 36:
            return self.get_user(user_guid), StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    # Every new user starts out assigned to this seeded placeholder session
    # (see db/scripts/dml.sql) until they create or join a real one.
    DEFAULT_SESSION_GUID = '3bb970e8-e8a1-479c-a1e3-0485567a3b33';

    def create_user(self):
        new_user = {
            'UserGUID': getGUID(),
            'Description': '',
            'SessionGUID': self.DEFAULT_SESSION_GUID
        };
        if self.DB.insertOne('User', ['UserGUID', 'Description', 'SessionGUID'], new_user):
            return new_user;
        else:
            return False;

    def get_user(self, user_guid):
        return self.DB.select(['UserGUID', 'Description', 'SessionGUID'], 'User', 'UserGUID = %s', [user_guid])[0].toJSON();
