import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function safeCallback(callback) {
    return callback ? callback : () => undefined;
}

export function getUser(user_guid, callback) {
    socket.emit('user', user_guid, safeCallback(callback));
}

export function getQuestion(question_guid, callback) {
    socket.emit('question', question_guid, safeCallback(callback));
}

export function getAllQuestions(callback) {
    getQuestion('all', safeCallback(callback));
}

export function getSession(session_guid, callback) {
    socket.emit('session', session_guid, undefined, safeCallback(callback));
}

export function postCreateSession(user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid
    };
    socket.emit('session', 'new', body, safeCallback(callback));
}

export function postNextQuestion(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'next'
    };
    socket.emit('session', session_guid, body, safeCallback(callback));
}

export function postShowResults(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'reveal'
    };
    socket.emit('session', session_guid, body, safeCallback(callback));
}

export function getResultStats(callback) {
    socket.on('stats', resp => callback(resp));
}

export function postResult(session_guid, user_guid, answer_guid, result_guid, callback) {
    const body = {
        user_guid: user_guid,
        answer_guid: answer_guid,
        result_guid: result_guid
    };
    socket.emit('result', session_guid, body, safeCallback(callback));
}
