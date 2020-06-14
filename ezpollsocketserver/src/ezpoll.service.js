import * as config from '../config.json';
import fetch from 'node-fetch';

function safeCallback(callback, arg) {
    callback ? callback(arg) : undefined;
}

function get(path, callback) {
    return fetch(`${config.api_url}${path}`).then(x => x.json()).then(x => safeCallback(callback, x)).catch(e => console.log(e));
}

function post(path, body, callback) {
    const headers = { 'Content-Type': 'application/json' };
    const options = { method: 'post', headers: headers, body: JSON.stringify(body) };
    return fetch(`${config.api_url}${path}`, options).then(x => x.json()).then(x => safeCallback(callback, x));
}

export function getUser(user_guid, callback) {
    return get(`/user/${user_guid}`, callback);
}

export function getQuestion(question_guid, callback) {
    return get(`/question/${question_guid}`, callback);
}

export function getSession(session_guid, callback) {
    return get(`/session/${session_guid}`, callback);
}

export function postSessionAction(session_guid, body, callback) {
    return post(`/session/${session_guid}`, body, callback);
}

export function getResultStats(session_guid, callback) {
    return get(`/result/${session_guid}`, callback);
}

export function postResult(session_guid, body, callback) {
    return post(`/result/${session_guid}`, body, callback);
}
