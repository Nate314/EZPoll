function safeCallback(callback, arg) {
    if (callback) {
        callback(arg);
    }
}

function getApiUrl() {
    return localStorage.getItem('api_url');
}

function get(path, callback) {
    return fetch(`${getApiUrl()}${path}`).then(x => x.json()).then(x => safeCallback(callback, x));
}

function post(path, body, callback) {
    const headers = { 'Content-Type': 'application/json' };
    const options = { method: 'post', headers: headers, body: JSON.stringify(body) };
    return fetch(`${getApiUrl()}${path}`, options).then(x => x.json()).then(x => safeCallback(callback, x));
}

export function getQuestion(question_guid, callback) {
    return get(`/question/${question_guid}`, callback);
}

export function getAllQuestions(callback) {
    return get(`/question/all`, callback);
}

export function getSession(session_guid, callback) {
    return get(`/session/${session_guid}`, callback);
}

export function postCreateSession(user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid
    };
    return post(`/session/new`, body, callback);
}

export function postNextQuestion(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'next'
    };
    return post(`/session/${session_guid}`, body, callback);
}

export function getResultStats(session_guid, user_guid, callback) {
    return get(`/result/${session_guid}_${user_guid}`, callback);
}

export function postResult(session_guid, user_guid, answer_guid, result_guid, callback) {
    const body = {
        user_guid: user_guid,
        answer_guid: answer_guid,
        result_guid: result_guid
    };
    return post(`/result/${session_guid}`, body, callback);
}

export function postShowResults(session_guid, user_guid, question_guid, callback) {
    const body = {
        user_guid: user_guid,
        question_guid: question_guid,
        action: 'reveal'
    };
    return post(`/session/${session_guid}`, body, callback);
}
