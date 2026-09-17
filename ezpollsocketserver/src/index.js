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
    let socketUserGUID = '';

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
        // The client's own postResult always sends its real user_guid,
        // including the initial null-answer "I've joined this question"
        // result created as soon as the question loads - so this is the
        // most reliable place to learn which user this socket belongs to.
        if (body && body.user_guid) {
            socketUserGUID = body.user_guid;
        }
        ezpoll.postResult(session_guid, body, resp => emitStatsAndAck(ack, session_guid, resp));
    }

    function onDisconnect() {
        // A closed tab/browser fires a socket disconnect (promptly once the
        // underlying transport - normally websocket after upgrade - is torn
        // down; worst case is bounded by socket.io's ping timeout). Remove
        // this user's result row for the session they were last in, if any,
        // and broadcast the refreshed participant/answer counts to whoever
        // is still in that session's room. Without this, participant_count
        // (derived from Result rows) never goes back down after someone
        // leaves - it only ever grows as people join/answer.
        if (socketSessionID && socketUserGUID) {
            ezpoll.deleteResult(socketSessionID, socketUserGUID, resp => {
                if (resp) {
                    socketio.to(socketSessionID).emit('stats', resp);
                }
            });
        }
    }

    socket.on('user', onUserCreate);
    socket.on('session', onSession);
    socket.on('question', onQuestion);
    socket.on('result', onResult);
    socket.on('disconnect', onDisconnect);
});

http.listen(3000, () => {
    console.log('Listening at :3000...');
});
