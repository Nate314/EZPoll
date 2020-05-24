from flask import Flask, request;
from flask_restful import Resource;
from StatusCodes import StatusCodes;
from Database import Database;
from guid import getGUID;

# This is another controller for a slightly different endpoint
class ControllerQuestion(Resource):

    # initialize AddBatchMultiController
    def __init__(self):
        self.DB = Database()
    
    # example get method passing an number
    def get(self, question_guid):
        if question_guid == 'all':
            return self.get_question_list(), StatusCodes.OK;
        elif len(question_guid) == 36:
            return {
                'question_guid': question_guid,
                'uuid': getGUID()
            }, StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;
    
    # example get method passing an number
    def post(self, entity):
        success = True;
        body = request.get_json();
        return success, StatusCodes.INTERNAL_SERVER_ERROR;
    
    def get_question_list(self):
        return self.DB.select(['QuestionGUID', 'Description'], 'Question', '1 = 1').toJSON();
