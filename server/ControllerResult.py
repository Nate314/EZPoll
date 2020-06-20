from flask import Flask, request;
from flask_restful import Resource;
from StatusCodes import StatusCodes;
from Database import Database;
from guid import getGUID, nullGUID;
import functools;

class ControllerResult(Resource):

    # initialize ControllerQuestion
    def __init__(self):
        self.DB = Database()

    # if session results are available, return results
    # otherwise return stats
    def get(self, session_guid):
        session_guid = session_guid.split('_')[0];
        if len(session_guid) == 36:
            session = self.get_session(session_guid);
            question_guid = session['QuestionGUID'];
            result = None;
            if session['ShowResults'] == '0':
                result = self.get_stats(session, session_guid, question_guid);
            elif session['ShowResults'] == '1':
                result = self.get_results(session_guid, question_guid);
            if result != None:
                result['question_guid'] = session['QuestionGUID'];
                return result, StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    # insert/update record for the given session/user/question/answer combo
    def post(self, session_guid):
        body = request.get_json();
        user_guid = body['user_guid'];
        is_new_result = body['result_guid'] == None;
        result_guid = getGUID() if is_new_result else body['result_guid'];
        answer_guid = nullGUID() if body['answer_guid'] == None else body['answer_guid'];
        if len(session_guid) == 36 and len(user_guid) == 36:
            session = self.get_session(session_guid);
            question_guid = session['QuestionGUID'];
            new_result = {
                'ResultGUID': result_guid,
                'SessionGUID': session_guid,
                'QuestionGUID': question_guid,
                'AnswerGUID': answer_guid,
                'UserGUID': user_guid
            };
            if session['ShowResults'] == '1':
                return False, StatusCodes.OK;
            elif is_new_result:
                result = self.get_result(new_result);
                if result == None:
                    return result_guid if self.insert_result(new_result) else False, StatusCodes.OK;
                else: return result['ResultGUID'], StatusCodes.OK;
            else:
                return result_guid if self.update_result(new_result) else False, StatusCodes.OK;
        else: return None, StatusCodes.NOT_FOUND;

    def get_result(self, new_result):
        rows = self.DB.select(['ResultGUID', 'SessionGUID', 'QuestionGUID', 'AnswerGUID', 'UserGUID'], 'Result',
            'SessionGUID = %s AND QuestionGUID = %s AND UserGUID = %s',
            [new_result['SessionGUID'], new_result['QuestionGUID'], new_result['UserGUID']]).getRows();
        return rows[0] if len(rows) > 0 else None;

    def insert_result(self, new_result):
        return self.DB.insertOne('Result', ['ResultGUID', 'SessionGUID', 'QuestionGUID', 'AnswerGUID', 'UserGUID'], new_result);

    def update_result(self, new_result):
        return self.DB.update('Result', ['AnswerGUID'], new_result,
            'SessionGUID = %s AND QuestionGUID = %s AND UserGUID = %s',
            [new_result['SessionGUID'], new_result['QuestionGUID'], new_result['UserGUID']]);

    def get_session(self, session_guid):
        return self.DB.select(['SessionGUID', 'Description', 'HostGUID', 'QuestionGUID', 'ShowResults'], 'Session', 'SessionGUID = %s', [session_guid])[0].toJSON();

    def get_stats(self, session, session_guid, question_guid):
        participant_count = self.DB.select(['COUNT(*) AS p_count FROM (SELECT COUNT(*)'], 'Result', 'SessionGUID = %s AND QuestionGUID = %s GROUP BY UserGUID) P', [session_guid, question_guid]).getRows()[0];
        answers_count = self.DB.select(['COUNT(*) AS a_count FROM (SELECT COUNT(*)'], 'Result', 'SessionGUID = %s AND QuestionGUID = %s AND AnswerGUID <> %s GROUP BY UserGUID) A', [session_guid, question_guid, nullGUID()]).getRows()[0];
        return {
            'participant_count': participant_count['p_count'],
            'answers_count': answers_count['a_count']
        };

    def get_results(self, session_guid, question_guid):
        datatable = self.DB.getDataTable("""SELECT Result.AnswerGUID, Answer.Description, COUNT(DISTINCT(Result.UserGUID)) AS AnswerCount
FROM Result
JOIN Answer ON Answer.AnswerGUID = Result.AnswerGUID
WHERE SessionGUID = %s AND Result.QuestionGUID = %s
GROUP BY Result.AnswerGUID, Result.UserGUID""", [session_guid, question_guid]);
        return {
            'results': list(map(lambda x: {
                'AnswerGUID': x['AnswerGUID'],
                'Description': x['Description'],
                'AnswerCount': int(x['AnswerCount'])
            }, datatable.getRows())),
            'responses': functools.reduce(lambda a, b: a + b, map(lambda x: x['AnswerCount'], datatable.getRows()), 0)
        };
