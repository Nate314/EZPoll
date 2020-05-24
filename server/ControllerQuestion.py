from flask import Flask, request;
from flask_restful import Resource;
from StatusCodes import StatusCodes;
from Database import Database;
from guid import getGUID;

class ControllerQuestion(Resource):

    # initialize ControllerQuestion
    def __init__(self):
        self.DB = Database()

    # if question_guid == 'all', return a list of all question options
    # otherwise return the question and it's associated answer choices
    def get(self, question_guid):
        if question_guid == 'all':
            return self.get_question_list(), StatusCodes.OK;
        elif len(question_guid) == 36:
            return self.get_question_with_answers(question_guid), StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    # example get method passing an number
    def post(self, question_guid):
        success = True;
        body = request.get_json();
        return success, StatusCodes.INTERNAL_SERVER_ERROR;

    def get_question_list(self):
        return self.DB.select(['QuestionGUID', 'Description'], 'Question', '1 = 1').toJSON();

    def get_question_with_answers(self, questionGUID):
        question = self.DB.select(['QuestionGUID', 'Description'], 'Question', 'QuestionGUID = %s', [questionGUID])[0].toJSON();
        answers = self.DB.select(['AnswerGUID', 'Description'], 'Answer', 'QuestionGUID = %s', [questionGUID]).toJSON();
        return { 'question': question, 'answers': answers };
