import { ApiClient } from '../support/api';
import { config } from '../support/config';
import { expect, test } from '../support/fixtures';

const GUID = '123e4567-e89b-42d3-a456-426614174000';
const INJECTIONS = [
  "' OR '1'='1",
  "x'; DROP TABLE Result;--",
  "1; DROP TABLE User; --",
  '" OR ""="',
  "' UNION SELECT SessionGUID FROM Session --",
];
const MALFORMED = [
  'not-a-guid',
  '123e4567-e89b-42d3-a456-42661417400',      // one character short
  '123e4567-e89b-42d3-a456-4266141740000',    // one character long
  '123e4567e89b42d3a456426614174000',         // no dashes
  '000000000000000000000000000000000000',     // the internal null sentinel, not a GUID
  `${GUID}%20`,
  `${GUID}%0a`,
  'g23e4567-e89b-42d3-a456-426614174000',     // non hex
  '..%2f..%2fetc%2fpasswd',
];

test.describe('@security API authentication', () => {
  const routes: [string, string][] = [
    ['GET', '/api/user/new'],
    ['GET', '/api/question/all'],
    ['GET', `/api/session/${GUID}`],
    ['GET', `/api/result/${GUID}`],
    ['POST', '/api/session/new'],
    ['POST', `/api/result/${GUID}`],
    ['DELETE', `/api/result/${GUID}`],
    ['GET', '/api/does-not-exist'],
  ];

  test('@smoke every route answers 401 without X-Internal-Secret', async ({ playwright }) => {
    const anonymous = await ApiClient.create(playwright, false);
    for (const [method, path] of routes) {
      const response = await anonymous.ctx.fetch(path, { method, data: method === 'GET' ? undefined : {} });
      expect(response.status(), `${method} ${path}`).toBe(401);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
    }
    await anonymous.dispose();
  });

  test('a wrong secret is rejected as well', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: config.apiUrl,
      extraHTTPHeaders: { 'X-Internal-Secret': `${config.internalSecret}x` },
    });
    expect((await ctx.get('/api/question/all')).status()).toBe(401);
    expect((await ctx.get('/api/question/all', { headers: { 'X-Internal-Secret': '' } })).status()).toBe(401);
    await ctx.dispose();
  });

  test('the internal DELETE result route needs the secret and works with it', async ({ api, playwright }) => {
    const anonymous = await ApiClient.create(playwright, false);
    const host = await api.newUser();
    const question = (await api.questionTypes())[1];
    const session = await api.createSession(host, question.QuestionGUID);
    const { answers } = await api.question(question.QuestionGUID);
    expect((await api.answer(session, host, answers[0].AnswerGUID)).status()).toBe(200);
    expect(await api.stats(session)).toMatchObject({ participant_count: 1, answers_count: 1 });

    const refused = await anonymous.ctx.delete(`/api/result/${session}`, { data: { user_guid: host } });
    expect(refused.status()).toBe(401);
    expect(await api.stats(session)).toMatchObject({ participant_count: 1, answers_count: 1 });

    const allowed = await api.ctx.delete(`/api/result/${session}`, { data: { user_guid: host } });
    expect(allowed.status()).toBe(200);
    expect(await api.stats(session)).toMatchObject({ participant_count: 0, answers_count: 0 });
    await anonymous.dispose();
  });
});

test.describe('@security API input validation', () => {
  for (const payload of INJECTIONS) {
    test(`injection payload ${JSON.stringify(payload)} in path segments is a 404`, async ({ api }) => {
      const encoded = encodeURIComponent(payload);
      for (const route of ['user', 'session', 'question', 'result']) {
        const response = await api.ctx.get(`/api/${route}/${encoded}`);
        expect(response.status(), `GET /api/${route}/`).toBe(404);
        expect(await response.json()).toEqual({ message: 'Not found' });
      }
      const post = await api.ctx.post(`/api/result/${encoded}`, { data: {} });
      expect(post.status()).toBe(404);
    });

    test(`injection payload ${JSON.stringify(payload)} in body fields is a 400`, async ({ api, questions }) => {
      const user = await api.newUser();
      const question = questions['Yes/No'].QuestionGUID;
      const session = await api.createSession(user, question);
      const bodies: [string, object][] = [
        [`/api/session/new`, { user_guid: payload, question_guid: question }],
        [`/api/session/new`, { user_guid: user, question_guid: payload }],
        [`/api/session/${session}`, { user_guid: user, question_guid: question, action: payload }],
        [`/api/result/${session}`, { user_guid: payload, answer_guid: null, result_guid: null }],
        [`/api/result/${session}`, { user_guid: user, answer_guid: payload, result_guid: null }],
        [`/api/result/${session}`, { user_guid: user, answer_guid: null, result_guid: payload }],
      ];
      for (const [path, data] of bodies) {
        const response = await api.ctx.post(path, { data });
        expect(response.status(), `${path} ${JSON.stringify(data)}`).toBe(400);
      }
      const del = await api.ctx.delete(`/api/result/${session}`, { data: { user_guid: payload } });
      expect(del.status()).toBe(400);
    });
  }

  for (const value of MALFORMED) {
    test(`malformed GUID ${value} is rejected in the path`, async ({ api }) => {
      for (const route of ['user', 'session', 'question', 'result']) {
        const response = await api.ctx.get(`/api/${route}/${value}`);
        expect([404], `GET /api/${route}/${value}`).toContain(response.status());
      }
    });
  }

  test('malformed bodies are rejected with 400', async ({ api, questions }) => {
    const user = await api.newUser();
    const question = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(user, question);
    const bad: unknown[] = [
      {}, [], 'text', 42, null,
      { user_guid: 42, question_guid: question },
      { user_guid: [user], question_guid: question },
      { user_guid: user },
      { user_guid: user, question_guid: { $ne: null } },
    ];
    for (const data of bad) {
      const response = await api.ctx.post('/api/session/new', { data: data as object });
      expect(response.status(), JSON.stringify(data)).toBe(400);
    }
    const notJson = await api.ctx.post('/api/session/new', { headers: { 'Content-Type': 'application/json' }, data: '{not json' });
    expect(notJson.status()).toBe(400);
    const unknownAction = await api.sessionAction(session, { user_guid: user, question_guid: question, action: 'delete' });
    expect(unknownAction.status()).toBe(400);
  });

  test('unknown but well formed identifiers are 404, not 500', async ({ api, questions }) => {
    const user = await api.newUser();
    expect((await api.ctx.get(`/api/user/${GUID}`)).status()).toBe(404);
    expect((await api.ctx.get(`/api/session/${GUID}`)).status()).toBe(404);
    expect((await api.ctx.get(`/api/question/${GUID}`)).status()).toBe(404);
    expect((await api.ctx.get(`/api/result/${GUID}`)).status()).toBe(404);
    const unknownUser = await api.ctx.post('/api/session/new', { data: { user_guid: GUID, question_guid: questions['Yes/No'].QuestionGUID } });
    expect(unknownUser.status()).toBe(404);
    const unknownQuestion = await api.ctx.post('/api/session/new', { data: { user_guid: user, question_guid: GUID } });
    expect(unknownQuestion.status()).toBe(404);
  });

  test('an answer that belongs to another question is refused', async ({ api, questions }) => {
    const user = await api.newUser();
    const session = await api.createSession(user, questions['Yes/No'].QuestionGUID);
    const other = await api.question(questions['Fibonacci'].QuestionGUID);
    const response = await api.answer(session, user, other.answers[0].AnswerGUID);
    expect(response.status()).toBe(400);
    expect(await api.stats(session)).toMatchObject({ participant_count: 0, answers_count: 0 });
  });

  test('an oversized request body gets 413', async ({ api }) => {
    const response = await api.ctx.post('/api/session/new', { data: { user_guid: 'x'.repeat(40_000), question_guid: GUID } });
    expect(response.status()).toBe(413);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.text()).not.toMatch(/Traceback|File "/);
  });

  test('an unknown route is a JSON 404 without a stack trace or route hints', async ({ api }) => {
    const response = await api.ctx.get('/api/nothing/here');
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    const text = await response.text();
    expect(JSON.parse(text)).toHaveProperty('message');
    expect(text).not.toMatch(/Traceback|File "|werkzeug|flask|Did you mean/i);
  });

  test('a method that is not allowed is a JSON 405 without a stack trace', async ({ api }) => {
    const response = await api.ctx.delete('/api/question/all');
    expect(response.status()).toBe(405);
    const text = await response.text();
    expect(JSON.parse(text)).toHaveProperty('message');
    expect(text).not.toMatch(/Traceback|File "/);
  });

  test('the database is unharmed after the injection attempts: a normal flow still works', async ({ api, questions }) => {
    for (const payload of INJECTIONS) {
      await api.ctx.get(`/api/user/${encodeURIComponent(payload)}`);
      await api.ctx.post('/api/session/new', { data: { user_guid: payload, question_guid: payload } });
    }
    const types = await api.questionTypes();
    expect(types.slice(0, 5).map(t => t.Description)).toEqual(['EMPTY', 'Yes/No', 'Yes/No/Maybe', 'Star Rating', 'Fibonacci']);

    const host = await api.newUser();
    const guest = await api.newUser();
    const session = await api.createSession(host, questions['Yes/No'].QuestionGUID);
    const { answers } = await api.question(questions['Yes/No'].QuestionGUID);
    expect(answers.map(a => a.Description)).toEqual(['Yes', 'No']);
    expect((await api.answer(session, guest, answers[1].AnswerGUID)).status()).toBe(200);
    expect(await api.stats(session)).toMatchObject({ participant_count: 1, answers_count: 1 });
    const reveal = await api.sessionAction(session, { user_guid: host, question_guid: questions['Yes/No'].QuestionGUID, action: 'reveal' });
    expect(reveal.status()).toBe(200);
    const results = await api.stats(session);
    expect(results.results.map((r: any) => [r.Description, r.AnswerCount])).toEqual([['Yes', 0], ['No', 1]]);
    expect(results.responses).toBe(1);
  });
});

test.describe('@security API authorization', () => {
  test('@smoke a non-host cannot advance or reveal, and the results stay intact', async ({ api, questions }) => {
    const host = await api.newUser();
    const intruder = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const { answers } = await api.question(yesNo);
    await api.answer(session, intruder, answers[0].AnswerGUID);

    const next = await api.sessionAction(session, { user_guid: intruder, question_guid: questions['Fibonacci'].QuestionGUID, action: 'next' });
    expect(next.status()).toBe(403);
    const reveal = await api.sessionAction(session, { user_guid: intruder, question_guid: yesNo, action: 'reveal' });
    expect(reveal.status()).toBe(403);

    const after = await (await api.session(session)).json();
    expect(after).toMatchObject({ HostGUID: host, QuestionGUID: yesNo, ShowResults: '0' });
    expect(await api.stats(session)).toMatchObject({ participant_count: 1, answers_count: 1, question_guid: yesNo });
  });

  test('a non-host cannot wipe revealed results by moving to the next question', async ({ api, questions }) => {
    const host = await api.newUser();
    const intruder = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const { answers } = await api.question(yesNo);
    await api.answer(session, intruder, answers[0].AnswerGUID);
    await api.sessionAction(session, { user_guid: host, question_guid: yesNo, action: 'reveal' });

    const next = await api.sessionAction(session, { user_guid: intruder, question_guid: questions['Star Rating'].QuestionGUID, action: 'next' });
    expect(next.status()).toBe(403);
    const results = await api.stats(session);
    expect(results.responses).toBe(1);
    expect(results.results[0]).toMatchObject({ Description: 'Yes', AnswerCount: 1 });
  });

  test('the host can move on, which clears results, and reveal only works for the current question', async ({ api, questions }) => {
    const host = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const { answers } = await api.question(yesNo);
    await api.answer(session, host, answers[0].AnswerGUID);

    const stale = await api.sessionAction(session, { user_guid: host, question_guid: questions['Fibonacci'].QuestionGUID, action: 'reveal' });
    expect(stale.status()).toBe(409);

    const next = await api.sessionAction(session, { user_guid: host, question_guid: questions['Fibonacci'].QuestionGUID, action: 'next' });
    expect(next.status()).toBe(200);
    expect(await api.stats(session)).toMatchObject({ participant_count: 0, answers_count: 0, question_guid: questions['Fibonacci'].QuestionGUID });
  });

  test('answers are ignored once results are revealed', async ({ api, questions }) => {
    const host = await api.newUser();
    const guest = await api.newUser();
    const yesNo = questions['Yes/No'].QuestionGUID;
    const session = await api.createSession(host, yesNo);
    const { answers } = await api.question(yesNo);
    await api.sessionAction(session, { user_guid: host, question_guid: yesNo, action: 'reveal' });
    const late = await api.answer(session, guest, answers[0].AnswerGUID);
    expect(await late.json()).toBe(false);
    expect((await api.stats(session)).responses).toBe(0);
  });
});

test.describe('@security API CORS', () => {
  test('a foreign Origin gets no Access-Control-Allow-Origin header', async ({ api }) => {
    for (const evil of ['https://evil.example', 'http://localhost:1', 'null']) {
      const simple = await api.ctx.get('/api/question/all', { headers: { Origin: evil } });
      expect(simple.headers()['access-control-allow-origin'], evil).toBeUndefined();
      const preflight = await api.ctx.fetch('/api/session/new', {
        method: 'OPTIONS',
        headers: { Origin: evil, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      });
      expect(preflight.headers()['access-control-allow-origin'], `preflight ${evil}`).toBeUndefined();
    }
  });

  test('the real client origin is allowed', async ({ api }) => {
    const clientOrigin = new URL(config.baseUrl).origin;
    const response = await api.ctx.get('/api/question/all', { headers: { Origin: clientOrigin } });
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBe(clientOrigin);
  });
});
