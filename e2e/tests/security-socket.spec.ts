import { Socket } from 'socket.io-client';
import { config, origin } from '../support/config';
import { connected, connectionRefused, connectSocket, emitAck } from '../support/socket';
import { expect, test } from '../support/fixtures';

const clientOrigin = origin(config.baseUrl);
const GUID = '123e4567-e89b-42d3-a456-426614174000';
const INJECTION = "x'; DROP TABLE Result;--";

const open: Socket[] = [];
const client = (options?: Parameters<typeof connectSocket>[0]) => {
  const socket = connectSocket(options);
  open.push(socket);
  return socket;
};
test.afterEach(() => { while (open.length) open.pop()!.close(); });

test.describe('@security socket.io origin handling', () => {
  test('@smoke a foreign Origin gets 403 on the polling handshake', async ({ request }) => {
    for (const evil of ['https://evil.example', 'http://localhost:1', 'null']) {
      const response = await request.get(`${config.socketUrl}/socket.io/?EIO=4&transport=polling`, {
        headers: { Origin: evil }, failOnStatusCode: false,
      });
      expect(response.status(), evil).toBe(403);
      expect(response.headers()['access-control-allow-origin'], evil).toBeUndefined();
    }
  });

  test('@smoke the real client origin completes the polling handshake', async ({ request }) => {
    const response = await request.get(`${config.socketUrl}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: clientOrigin },
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/^0\{"sid":"/);
    expect(response.headers()['access-control-allow-origin']).toBe(clientOrigin);
  });

  test('a websocket connection from a foreign origin is refused', async () => {
    const socket = client({ origin: 'https://evil.example', transport: 'websocket' });
    await connectionRefused(socket);
  });

  test('a polling connection from a foreign origin is refused by the client library too', async () => {
    const socket = client({ origin: 'https://evil.example', transport: 'polling' });
    await connectionRefused(socket);
  });

  test('the real client origin connects over both transports', async () => {
    for (const transport of ['polling', 'websocket'] as const) {
      const socket = client({ origin: clientOrigin, transport });
      await connected(socket);
      const list = await emitAck(socket, 'question', 'all');
      expect(list.map((q: any) => q.Description).slice(0, 5)).toEqual(['EMPTY', 'Yes/No', 'Yes/No/Maybe', 'Star Rating', 'Fibonacci']);
    }
  });

  test('a non-socket.io path on the socket server is a JSON 404', async ({ request }) => {
    const response = await request.get(`${config.socketUrl}/anything`, { failOnStatusCode: false });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });
});

test.describe('@security socket.io identity and authorization', () => {
  test('a socket bound to one user cannot act as another user', async ({ api, questions }) => {
    const alice = await api.newUser();
    const bob = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const bobSession = await api.createSession(bob, yesNo);
    const { answers } = await api.question(yesNo);
    const asBob = { user_guid: bob, answer_guid: answers[0].AnswerGUID, result_guid: null };

    const socket = client({ origin: clientOrigin });
    await connected(socket);
    expect((await emitAck(socket, 'user', alice)).UserGUID).toBe(alice);

    // Every event that carries a user_guid is refused for any user other than the bound one.
    expect(await emitAck(socket, 'result', bobSession, asBob)).toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'session', 'new', { user_guid: bob, question_guid: yesNo }))
      .toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'session', bobSession, { user_guid: bob, question_guid: questions['Fibonacci'].QuestionGUID, action: 'next' }))
      .toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'session', bobSession, { user_guid: bob, question_guid: yesNo, action: 'reveal' }))
      .toEqual({ error: 'Invalid request' });
    // Asking for another user through the user event does not rebind the socket either.
    await emitAck(socket, 'user', bob);
    expect(await emitAck(socket, 'result', bobSession, asBob)).toEqual({ error: 'Invalid request' });

    // Nothing changed on the server.
    expect(await api.stats(bobSession)).toMatchObject({ participant_count: 0, answers_count: 0, question_guid: yesNo });
    expect(await (await api.session(bobSession)).json()).toMatchObject({ HostGUID: bob, ShowResults: '0', QuestionGUID: yesNo });

    // The bound user still works as themselves.
    const own = await emitAck(socket, 'result', bobSession, { user_guid: alice, answer_guid: answers[0].AnswerGUID, result_guid: null });
    expect(typeof own).toBe('string');
    expect(await api.stats(bobSession)).toMatchObject({ participant_count: 1, answers_count: 1 });
  });

  test('@smoke a participant socket cannot move a session on or reveal it, and results stay intact', async ({ api, questions }) => {
    const host = await api.newUser();
    const guest = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const { answers } = await api.question(yesNo);

    const socket = client({ origin: clientOrigin });
    await connected(socket);
    await emitAck(socket, 'user', guest);
    const answered = await emitAck(socket, 'result', session, { user_guid: guest, answer_guid: answers[0].AnswerGUID, result_guid: null });
    expect(typeof answered).toBe('string');

    const next = await emitAck(socket, 'session', session, { user_guid: guest, question_guid: questions['Fibonacci'].QuestionGUID, action: 'next' });
    const reveal = await emitAck(socket, 'session', session, { user_guid: guest, question_guid: yesNo, action: 'reveal' });
    expect(next).toEqual({ error: 'Only the host can do that' });
    expect(reveal).toEqual({ error: 'Only the host can do that' });
    expect(await (await api.session(session)).json()).toMatchObject({ ShowResults: '0', QuestionGUID: yesNo });
    expect(await api.stats(session)).toMatchObject({ participant_count: 1, answers_count: 1 });
  });

  test('the host socket can reveal and the stats reach a listening participant', async ({ api, questions }) => {
    const host = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const listener = client({ origin: clientOrigin });
    const hostSocket = client({ origin: clientOrigin });
    await Promise.all([connected(listener), connected(hostSocket)]);
    await emitAck(listener, 'session', session, null);
    const stats = new Promise<any>(resolve => listener.once('stats', resolve));
    await emitAck(hostSocket, 'user', host);
    const reveal = await emitAck(hostSocket, 'session', session, { user_guid: host, question_guid: yesNo, action: 'reveal' });
    expect(reveal).toEqual({ ShowResults: 1 });
    expect((await stats).results.map((r: any) => r.Description)).toEqual(['Yes', 'No']);
  });

  test('malformed identifiers and payloads get error acknowledgements and never crash the server', async ({ api }) => {
    const user = await api.newUser();
    const socket = client({ origin: clientOrigin });
    await connected(socket);
    expect(await emitAck(socket, 'session', INJECTION, null)).toEqual({ error: 'Invalid identifier' });
    expect(await emitAck(socket, 'session', 'not-a-guid', { user_guid: user })).toEqual({ error: 'Invalid identifier' });
    expect(await emitAck(socket, 'question', INJECTION)).toEqual({ error: 'Invalid identifier' });
    expect(await emitAck(socket, 'user', INJECTION)).toEqual({ error: 'Invalid identifier' });
    expect(await emitAck(socket, 'result', INJECTION, { user_guid: user })).toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'result', GUID, [user])).toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'result', GUID, 'text')).toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'session', 'new', 42)).toEqual({ error: 'Invalid request' });
    expect(await emitAck(socket, 'session', 'new', { user_guid: INJECTION })).toEqual({ error: 'Invalid request' });
    // Still healthy, and the data is intact.
    expect(await emitAck(socket, 'question', 'all')).toHaveLength(5);
    expect((await emitAck(socket, 'user', user)).UserGUID).toBe(user);
  });

  test('an oversized payload drops the connection instead of being processed', async ({ api }) => {
    const user = await api.newUser();
    const socket = client({ origin: clientOrigin });
    await connected(socket);
    const closed = new Promise<string>(resolve => socket.once('disconnect', reason => resolve(reason)));
    socket.emit('result', GUID, { user_guid: user, padding: 'x'.repeat(50_000) });
    expect(await closed).toBeTruthy();
    expect(socket.connected).toBe(false);
  });

  test('a flood of events on one socket is rate limited without affecting other sockets', async () => {
    const flooder = client({ origin: clientOrigin });
    const bystander = client({ origin: clientOrigin });
    await Promise.all([connected(flooder), connected(bystander)]);
    const replies = await Promise.all(Array.from({ length: 90 }, () => emitAck(flooder, 'question', 'all')));
    expect(replies.filter(r => r && r.error === 'Too many requests').length).toBeGreaterThan(0);
    expect(replies.filter(r => Array.isArray(r)).length).toBeLessThanOrEqual(60);
    expect(await emitAck(bystander, 'question', 'all')).toHaveLength(5);
  });
});
