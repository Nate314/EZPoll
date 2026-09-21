import { Actor } from '../support/actor';
import { ANSWERS, QuestionName, expect, test } from '../support/fixtures';

// Each participant answers with the label at the same index; null means "joined but did not answer".
interface Distribution {
  name: string;
  type: QuestionName;
  votes: (string | null)[];
}

const DISTRIBUTIONS: Distribution[] = [
  { name: '2 Yes and 1 No', type: 'Yes/No', votes: ['Yes', 'Yes', 'No'] },
  { name: '1 Yes, 1 No and 0 Maybe', type: 'Yes/No/Maybe', votes: ['Yes', 'No'] },
  { name: 'everyone picks the same star rating', type: 'Star Rating', votes: ['4', '4', '4'] },
  { name: 'a single response', type: 'Fibonacci', votes: ['13'] },
  { name: 'four participants with mixed answers', type: 'Yes/No/Maybe', votes: ['Yes', 'No', 'Maybe', 'Yes'] },
  { name: 'thirds that do not divide evenly', type: 'Yes/No/Maybe', votes: ['Yes', 'No', 'Maybe'] },
  { name: 'some participants never answer', type: 'Yes/No', votes: ['No', null, 'No', null] },
];

async function join(poll: { join: () => Promise<Actor> }, count: number) {
  const participants: Actor[] = [];
  for (let i = 0; i < count; i++) participants.push(await poll.join());
  return participants;
}

test.describe('full host and participant flow', () => {
  test('@smoke host and participant: join, answer, reveal, results on both screens', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    // The host counts as a participant of its own poll.
    await poll.host.expectCounts(0, 1);

    const participant = await poll.join();
    await poll.host.expectCounts(0, 2);
    await participant.expectCounts(0, 2);
    await expect(participant.showResultsButton()).toHaveCount(0);

    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await participant.expectCounts(1, 2);

    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 0]]);
    await participant.expectResults([['Yes', 1], ['No', 0]]);
    // Results replace the answer buttons.
    await expect(poll.host.answerButtons()).toHaveCount(0);
    await expect(participant.answerButtons()).toHaveCount(0);
    await expect(participant.nextQuestionButton()).toHaveCount(0);
    await expect(poll.host.nextQuestionButton()).toBeVisible();
  });

  for (const { name, type, votes } of DISTRIBUTIONS) {
    test(`results are exact for ${name}`, async ({ createPoll }) => {
      const poll = await createPoll(type);
      const participants = await join(poll, votes.length);
      await poll.host.expectCounts(0, votes.length + 1);

      let answered = 0;
      for (const [i, vote] of votes.entries()) {
        if (vote === null) continue;
        await participants[i].answer(vote);
        answered++;
        await poll.host.expectCounts(answered, votes.length + 1);
      }

      await poll.host.showResults();
      const expected = ANSWERS[type].map(label =>
        [label, votes.filter(v => v === label).length] as [string, number]);
      await poll.host.expectResults(expected);
      for (const participant of participants) await participant.expectResults(expected);
    });
  }

  test('a participant who changes their answer updates the counts instead of voting twice', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No/Maybe');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await participant.answer('No');
    await participant.answer('Maybe');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 0], ['Maybe', 1]]);
    await participant.expectResults([['Yes', 0], ['No', 0], ['Maybe', 1]]);
  });

  test('the host can answer their own poll', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await poll.host.answer('Yes');
    await participant.answer('No');
    await poll.host.expectCounts(2, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 1]]);
  });

  test('a participant who opens the invite after results were revealed sees the results', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const early = await poll.join();
    await early.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 0]]);
    const late = await poll.join();
    await late.expectResults([['Yes', 1], ['No', 0]]);
  });

  test('the invite link shown to the host contains the session GUID and opens the same session', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    expect(poll.inviteUrl).toMatch(/^https?:\/\/[^/]+\/[0-9a-f-]{36}$/);
    expect(poll.inviteUrl.endsWith(`/${poll.sessionGuid}`)).toBe(true);
    const participant = await poll.join();
    expect(await participant.sessionGuid()).toBe(poll.sessionGuid);
    expect(await participant.userGuid()).not.toBe(poll.hostGuid);
    await expect(participant.showResultsButton()).toHaveCount(0);
  });

  test('two independent polls do not see each other', async ({ createPoll }) => {
    const first = await createPoll('Yes/No');
    const second = await createPoll('Yes/No');
    const participant = await first.join();
    await participant.answer('Yes');
    await first.host.expectCounts(1, 2);
    await second.host.expectCounts(0, 1);
  });
});
