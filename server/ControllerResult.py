import functools
from flask_restful import Resource
from StatusCodes import StatusCodes
from Database import Database
from Lookups import require_user, require_session
from Validation import fail, json_body, guid_field, guid_param
from guid import getGUID, nullGUID

class ControllerResult(Resource):

    # initialize ControllerResult
    def __init__(self):
        self.DB = Database()

    # if session results are available, return results
    # otherwise return stats
    def get(self, session_guid):
        session = require_session(guid_param(session_guid))
        question_guid = session['QuestionGUID']
        if session['ShowResults'] == '1':
            result = self.get_results(session_guid, question_guid)
        else:
            result = self.get_stats(session_guid, question_guid)
        result['question_guid'] = question_guid
        return result, StatusCodes.OK

    # insert/update record for the given session/user/question/answer combo
    def post(self, session_guid):
        session_guid = guid_param(session_guid)
        body = json_body()
        user_guid = guid_field(body, 'user_guid')
        requested_result_guid = guid_field(body, 'result_guid', nullable = True)
        answer_guid = guid_field(body, 'answer_guid', nullable = True)
        require_user(user_guid)
        session = require_session(session_guid)
        question_guid = session['QuestionGUID']
        if answer_guid is not None and not self.answer_belongs_to_question(answer_guid, question_guid):
            fail(400, 'answer_guid is not an answer to the current question')
        is_new_result = requested_result_guid is None
        result_guid = getGUID() if is_new_result else requested_result_guid
        new_result = {
            'ResultGUID': result_guid,
            'SessionGUID': session_guid,
            'QuestionGUID': question_guid,
            'AnswerGUID': nullGUID() if answer_guid is None else answer_guid,
            'UserGUID': user_guid
        }
        if session['ShowResults'] == '1':
            return False, StatusCodes.OK
        elif is_new_result:
            result = self.get_result(new_result)
            if result == None:
                return result_guid if self.insert_result(new_result) else False, StatusCodes.OK
            else: return result['ResultGUID'], StatusCodes.OK
        else:
            return result_guid if self.update_result(new_result) else False, StatusCodes.OK

    # remove the given user's result row (if any) for the session's current
    # question, then return refreshed stats. Used when a user's socket
    # disconnects (e.g. they closed their tab) so the participant/answer
    # counts shown to everyone still in the session reflect who's actually
    # still around. Only the socket server (X-Internal-Secret) can reach this.
    def delete(self, session_guid):
        session_guid = guid_param(session_guid)
        user_guid = guid_field(json_body(), 'user_guid')
        require_user(user_guid)
        session = require_session(session_guid)
        question_guid = session['QuestionGUID']
        self.DB.delete('Result', 'SessionGUID = %s AND QuestionGUID = %s AND UserGUID = %s',
            [session_guid, question_guid, user_guid])
        result = self.get_stats(session_guid, question_guid)
        result['question_guid'] = question_guid
        return result, StatusCodes.OK

    def answer_belongs_to_question(self, answer_guid, question_guid):
        return self.DB.select(['AnswerGUID'], 'Answer', 'AnswerGUID = %s AND QuestionGUID = %s',
            [answer_guid, question_guid]).first() is not None

    def get_result(self, new_result):
        return self.DB.select(['ResultGUID', 'SessionGUID', 'QuestionGUID', 'AnswerGUID', 'UserGUID'], 'Result',
            'SessionGUID = %s AND QuestionGUID = %s AND UserGUID = %s',
            [new_result['SessionGUID'], new_result['QuestionGUID'], new_result['UserGUID']]).first()

    def insert_result(self, new_result):
        return self.DB.insertOne('Result', ['ResultGUID', 'SessionGUID', 'QuestionGUID', 'AnswerGUID', 'UserGUID'], new_result)

    def update_result(self, new_result):
        return self.DB.update('Result', ['AnswerGUID'], new_result,
            'SessionGUID = %s AND QuestionGUID = %s AND UserGUID = %s',
            [new_result['SessionGUID'], new_result['QuestionGUID'], new_result['UserGUID']])

    def get_stats(self, session_guid, question_guid):
        participant_count = self.DB.getDataTable(
            'SELECT COUNT(DISTINCT UserGUID) AS p_count FROM Result WHERE SessionGUID = %s AND QuestionGUID = %s',
            [session_guid, question_guid])[0]
        answers_count = self.DB.getDataTable(
            'SELECT COUNT(DISTINCT UserGUID) AS a_count FROM Result WHERE SessionGUID = %s AND QuestionGUID = %s AND AnswerGUID <> %s',
            [session_guid, question_guid, nullGUID()])[0]
        return {
            'participant_count': participant_count['p_count'],
            'answers_count': answers_count['a_count']
        }

    def get_results(self, session_guid, question_guid):
        datatable = self.DB.getDataTable("""SELECT Result.AnswerGUID, Answer.Description, COUNT(DISTINCT(Result.UserGUID)) AS AnswerCount
FROM Result
JOIN Answer ON Answer.AnswerGUID = Result.AnswerGUID
WHERE SessionGUID = %s AND Result.QuestionGUID = %s
GROUP BY Result.AnswerGUID, Result.UserGUID""", [session_guid, question_guid])
        return {
            'results': list(map(lambda x: {
                'AnswerGUID': x['AnswerGUID'],
                'Description': x['Description'],
                'AnswerCount': int(x['AnswerCount'])
            }, datatable.getRows())),
            'responses': functools.reduce(lambda a, b: a + b, map(lambda x: x['AnswerCount'], datatable.getRows()), 0)
        }
