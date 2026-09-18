from flask_restful import Resource
from StatusCodes import StatusCodes
from Database import Database
from Lookups import require_question
from Validation import guid_param

class ControllerQuestion(Resource):

    # initialize ControllerQuestion
    def __init__(self):
        self.DB = Database()

    # if question_guid == 'all', return a list of all question options
    # otherwise return the question and it's associated answer choices
    def get(self, question_guid):
        if question_guid == 'all':
            return self.get_question_list(), StatusCodes.OK
        return self.get_question_with_answers(guid_param(question_guid)), StatusCodes.OK

    def get_question_list(self):
        return self.DB.select(['QuestionGUID', 'Description'], 'Question').toJSON()

    def get_question_with_answers(self, questionGUID):
        question = require_question(questionGUID)
        answers = self.DB.select(['AnswerGUID', 'Description'], 'Answer', 'QuestionGUID = %s', [questionGUID]).toJSON()
        return { 'question': question, 'answers': answers }
