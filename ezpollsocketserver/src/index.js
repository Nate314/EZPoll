const express = require('express')();
const http = require('http').Server(express);
const socketio = require('socket.io')(http);
const ezpoll = require('./ezpoll.service');

var sessions = {
    '': { }
};

// http://blog.logrocket.com/how-to-create-a-2d-multiplayer-game-with-vue-js-and-socket-io-174ef2818e65/
// https://socket.io/docs/rooms-and-namespaces/
socketio.on('connection', socket => {
    let socketSessionID = '';

    function joinSession(session_id, ack) {
        socket.leave(socketSessionID, () => {
            socketSessionID = session_id;
            socket.join(socketSessionID);
            if (sessions[socketSessionID]) {
                console.log(`Joining '${socketSessionID}'`);
            } else {
                console.log(`Creating '${socketSessionID}'`);
                sessions[socketSessionID] = { };
            }
            ack();
        });
    }

    function emitStatsAndAck(ack, session_guid, resp) {
        ezpoll.getResultStats(session_guid, stats => {
            socketio.to(session_guid).emit('stats', stats);
            ack(resp);
        });
    }

    function onUserCreate(user_guid, ack) {
        ezpoll.getUser(user_guid, ack);
    }

    function onSession(session_guid, body, ack) {
        if (body) {
            ezpoll.postSessionAction(session_guid, body, resp => {
                if (session_guid === 'new') {
                    joinSession(resp.SessionGUID, () => ack(resp));
                } else {
                    console.table([session_guid, body, ack]);
                    emitStatsAndAck(ack, session_guid, resp);
                }
            });
        } else {
            ezpoll.getSession(session_guid, resp => joinSession(session_guid, () => ack(resp)));
        }
    }

    function onQuestion(question_guid, ack) {
        ezpoll.getQuestion(question_guid, ack);
    }

    function onResult(session_guid, body, ack) {
        ezpoll.postResult(session_guid, body, resp => emitStatsAndAck(ack, session_guid, resp));
    }

    socket.on('user', onUserCreate);
    socket.on('session', onSession);
    socket.on('question', onQuestion);
    socket.on('result', onResult);
});

http.listen(3000, () => {
    console.log('Listening at :3000...');
});
