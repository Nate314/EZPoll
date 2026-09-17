import io from 'socket.io-client';

// The socket connection must not be opened until `api_url` has actually
// been written to sessionStorage (App bootstraps that from config.json
// before the Vue app is mounted - see main.js). Opening it eagerly at
// module-evaluation time (which happens as soon as this file is imported,
// before any of that async config loading can run) meant the very first
// connection of a fresh tab/session read an empty api_url and fell back to
// connecting to the page's own origin instead of the socket server, which
// has no socket.io endpoint behind it (405s on the polling handshake). A
// later refresh "fixed" it only because sessionStorage.api_url was already
// populated by then. Lazily creating (and caching) the socket on first use
// guarantees api_url is present by the time it's read.
let socket;
function getSocket() {
    if (!socket) {
        socket = io(sessionStorage.getItem('api_url'));
    }
    return socket;
}

function safeCallback(callback) {
    return callback ? callback : () => undefined;
}

export function getUser(user_guid, callback) {
    getSocket().emit('user', user_guid, safeCallback(callback));
}

export function getQuestion(question_guid, callback) {
    getSocket().emit('question', question_guid, safeCallback(callback));
}

export function getAllQuestions(callback) {
    getQuestion('all', safeCallback(callback));
}

export function getSession(session_guid, callback) {
    getSocket().emit('session', session_guid, undefined, safeCallback(callback));
}

export function postCreateSession(user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid
    };
    getSocket().emit('session', 'new', body, safeCallback(callback));
}

export function postNextQuestion(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'next'
    };
    getSocket().emit('session', session_guid, body, safeCallback(callback));
}

export function postShowResults(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'reveal'
    };
    getSocket().emit('session', session_guid, body, safeCallback(callback));
}

export function getResultStats(callback) {
    getSocket().on('stats', resp => callback(resp));
}

export function postResult(session_guid, user_guid, answer_guid, result_guid, callback) {
    const body = {
        user_guid: user_guid,
        answer_guid: answer_guid,
        result_guid: result_guid
    };
    getSocket().emit('result', session_guid, body, safeCallback(callback));
}
