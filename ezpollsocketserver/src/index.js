const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const ezpoll = require('./ezpoll.service');
const { allow } = require('./rateLimit');

const httpServer = http.createServer((req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"error":"Not found"}');
});

const io = new Server(httpServer, {
    cors: { origin: config.allowedOrigins, methods: ['GET', 'POST'] },
    // Non-browser clients send no Origin; browsers always do. Reject browser
    // connections (including websocket ones, which CORS does not cover) from
    // origins that are not allowed.
    allowRequest: (req, callback) => {
        const origin = req.headers.origin;
        callback(null, !origin || config.allowedOrigins.includes(origin));
    },
    maxHttpBufferSize: 10 * 1024
});

const EVENT_LIMIT = { max: 60, windowMs: 10 * 1000 };
const CREATE_LIMIT = { max: 20, windowMs: 60 * 1000 };
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const noop = () => undefined;

io.on('connection', socket => {
    let socketSessionID = '';
    let socketUserGUID = '';
    const address = socket.handshake.address;

    // Wraps a handler: acks are always callable, floods are dropped, and a
    // thrown error becomes a generic ack instead of crashing the process.
    function handle(name, fn) {
        socket.on(name, (...args) => {
            const ack = typeof args[args.length - 1] === 'function' ? args.pop() : noop;
            if (!allow(`ev:${socket.id}`, EVENT_LIMIT.max, EVENT_LIMIT.windowMs)) {
                return ack({ error: 'Too many requests' });
            }
            Promise.resolve(fn(...args, ack)).catch(e => {
                console.error(`Error handling '${name}':`, e);
                ack({ error: 'Internal error' });
            });
        });
    }

    // A socket acts as exactly one user. Once bound, other user GUIDs are refused.
    function bindUser(user_guid) {
        if (!ezpoll.isGuid(user_guid)) return false;
        if (socketUserGUID && socketUserGUID !== user_guid) return false;
        socketUserGUID = user_guid;
        return true;
    }

    function joinSession(session_id) {
        if (socketSessionID) socket.leave(socketSessionID);
        socketSessionID = session_id;
        socket.join(socketSessionID);
    }

    async function emitStatsAndAck(ack, session_guid, resp) {
        const stats = await ezpoll.getResultStats(session_guid);
        if (!stats.error) io.to(session_guid).emit('stats', stats);
        ack(resp);
    }

    handle('user', async (user_guid, ack) => {
        if (user_guid === 'new' && !allow(`newuser:${address}`, CREATE_LIMIT.max, CREATE_LIMIT.windowMs)) {
            return ack({ error: 'Too many requests' });
        }
        const user = await ezpoll.getUser(user_guid);
        if (user && user.UserGUID) bindUser(user.UserGUID);
        ack(user);
    });

    handle('session', async (session_guid, body, ack) => {
        if (!ezpoll.isGuid(session_guid) && session_guid !== 'new') return ack({ error: 'Invalid identifier' });
        if (body === undefined || body === null) {
            const session = await ezpoll.getSession(session_guid);
            if (session && session.SessionGUID) joinSession(session_guid);
            return ack(session);
        }
        if (!isPlainObject(body) || !bindUser(body.user_guid)) return ack({ error: 'Invalid request' });
        if (session_guid === 'new') {
            if (!allow(`newsession:${address}`, CREATE_LIMIT.max, CREATE_LIMIT.windowMs)) {
                return ack({ error: 'Too many requests' });
            }
            const created = await ezpoll.postSessionAction('new', body);
            if (created && created.SessionGUID) joinSession(created.SessionGUID);
            return ack(created);
        }
        const resp = await ezpoll.postSessionAction(session_guid, body);
        return emitStatsAndAck(ack, session_guid, resp);
    });

    handle('question', async (question_guid, ack) => {
        ack(await ezpoll.getQuestion(question_guid));
    });

    handle('result', async (session_guid, body, ack) => {
        if (!ezpoll.isGuid(session_guid) || !isPlainObject(body) || !bindUser(body.user_guid)) {
            return ack({ error: 'Invalid request' });
        }
        const resp = await ezpoll.postResult(session_guid, body);
        // Remember the session this user answered in, for disconnect cleanup.
        if (!(resp && resp.error) && socketSessionID !== session_guid) joinSession(session_guid);
        return emitStatsAndAck(ack, session_guid, resp);
    });

    // A closed tab fires a disconnect. Remove this user's result row for the
    // session they were in and broadcast the refreshed participant counts.
    socket.on('disconnect', async () => {
        if (!socketSessionID || !socketUserGUID) return;
        const resp = await ezpoll.deleteResult(socketSessionID, socketUserGUID);
        if (resp && !resp.error) io.to(socketSessionID).emit('stats', resp);
    });
});

httpServer.listen(config.port, () => {
    console.log(`Listening at :${config.port}...`);
});
