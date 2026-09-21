import { ANSWERS, QUESTION_NAMES, QuestionName, expect, test } from '../support/fixtures';
import { config, origin } from '../support/config';

test.describe('zero responses (NaN% regression)', () => {
  for (const type of QUESTION_NAMES) {
    test(`revealing "${type}" with nobody answering shows 0% (0/0) and no NaN or Infinity`, async ({ createPoll }) => {
      const poll = await createPoll(type);
      const participant = await poll.join();
      await poll.host.showResults();
      const expected = ANSWERS[type].map(label => [label, 0] as [string, number]);
      await poll.host.expectResults(expected);
      await participant.expectResults(expected);
      for (const row of await poll.host.results()) {
        expect(row.text).toMatch(/^0% \(0\/0\)$/);
        expect(row.progress).toBe(0);
      }
      for (const actor of [poll.host, participant]) {
        const everything = await actor.textAndAttributes();
        expect(everything).not.toMatch(/NaN|Infinity/i);
      }
    });
  }

  test('a host with no participants at all can reveal zero results', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 0]]);
    expect(await poll.host.textAndAttributes()).not.toMatch(/NaN|Infinity/i);
  });
});

test.describe('EMPTY question (null GUID sentinel regression)', () => {
  test('@smoke answering EMPTY increments the answered count', async ({ createPoll }) => {
    const poll = await createPoll('EMPTY');
    const participant = await poll.join();
    await poll.host.expectCounts(0, 2);
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await participant.expectCounts(1, 2);
  });

  test('EMPTY results count the answer and show 100%', async ({ createPoll }) => {
    const poll = await createPoll('EMPTY');
    const [a, b] = [await poll.join(), await poll.join()];
    await a.answer('Yes');
    await b.answer('Yes');
    await poll.host.expectCounts(2, 3);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 2]]);
    await a.expectResults([['Yes', 2]]);
  });

  test('the host answering EMPTY counts too', async ({ createPoll }) => {
    const poll = await createPoll('EMPTY');
    await poll.host.answer('Yes');
    await poll.host.expectCounts(1, 1);
  });
});

test.describe('participant count follows socket disconnects', () => {
  test('@smoke closing a participant page lowers the host count', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await poll.host.expectCounts(0, 2);
    await participant.page.close();
    await poll.host.expectCounts(0, 1);
  });

  test('closing a participant who answered lowers both the answered and participant counts', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const stays = await poll.join();
    const leaves = await poll.join();
    await stays.answer('Yes');
    await leaves.answer('No');
    await poll.host.expectCounts(2, 3);
    await leaves.page.close();
    await poll.host.expectCounts(1, 2);
    await stays.expectCounts(1, 2);
  });

  test('closing several participants one after another keeps the count accurate', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No/Maybe');
    const participants = [await poll.join(), await poll.join(), await poll.join()];
    await poll.host.expectCounts(0, 4);
    for (const [i, participant] of participants.entries()) {
      await participant.page.close();
      await poll.host.expectCounts(0, 3 - i);
    }
  });

  test('a participant who reloads is still counted once', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await poll.host.expectCounts(0, 2);
    await participant.page.reload();
    await participant.waitForQuestion();
    await participant.expectCounts(0, 2);
    await poll.host.expectCounts(0, 2);
  });

  test('a host who reloads is still counted once and keeps the host controls', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await poll.host.expectCounts(0, 2);
    await poll.host.page.reload();
    await poll.host.waitForQuestion();
    await poll.host.expectCounts(0, 2);
    await participant.expectCounts(0, 2);
    await expect(poll.host.showResultsButton()).toBeVisible();
  });

  test('a participant who answered and reloads keeps the answered count consistent', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await participant.page.reload();
    await participant.waitForQuestion();
    // The reload starts a fresh answer (nothing selected), so the answer is cleared, not doubled.
    await poll.host.expectCounts(0, 2);
  });

  test('closing the host page lowers the count seen by participants', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.expectCounts(0, 2);
    await poll.host.page.close();
    await participant.expectCounts(0, 1);
  });
});

test.describe('shared link in a fresh tab (socket.io 405 regression)', () => {
  test('@smoke the first load of an invite link works with no errors and no failed socket.io requests', async ({ createPoll, newActor }) => {
    const poll = await createPoll('Yes/No');
    // No pre-seeded user: this is exactly a brand new visitor with an empty sessionStorage.
    const visitor = await newActor({ identity: 'none' });
    await visitor.openInvite(poll.inviteUrl);
    expect(await visitor.answerLabels()).toEqual(['Yes', 'No']);
    await poll.host.expectCounts(0, 2);

    const { monitor } = visitor;
    expect(monitor.socketIoResponses.length, 'the polling handshake happened').toBeGreaterThan(0);
    for (const response of monitor.socketIoResponses) {
      expect(response.status, response.url).toBeLessThan(400);
      expect(response.url.startsWith(origin(config.socketUrl)), `socket.io traffic goes to the socket server: ${response.url}`).toBe(true);
    }
    expect(monitor.socketIoResponses.some(r => r.url.startsWith(config.baseUrl))).toBe(false);
    // config.json was read before the socket was created, so the very first connection used the socket url.
    expect(await visitor.session('api_url')).toBe(config.socketUrl);
    expect(monitor.problems()).toEqual([]);
  });
});

test.describe('answer order (SortOrder regression)', () => {
  const orders: [QuestionName, string[]][] = [
    ['Star Rating', ['0', '1', '2', '3', '4', '5']],
    ['Fibonacci', ['0', '1', '2', '3', '5', '8', '13', '100', 'coffee break']],
  ];
  for (const [type, expected] of orders) {
    test(`${type} answers and results keep the seeded order, not alphabetical or GUID order`, async ({ createPoll }) => {
      const poll = await createPoll(type);
      const participant = await poll.join();
      expect(await participant.answerLabels()).toEqual(expected);
      await participant.answer(expected[expected.length - 1]);
      await poll.host.showResults();
      const rows = await participant.results();
      expect(rows.map(r => r.label)).toEqual(expected);
    });
  }
});
