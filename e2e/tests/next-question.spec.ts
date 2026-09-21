import { ANSWERS, expect, test } from '../support/fixtures';

test.describe('next question flow', () => {
  test('@smoke the host moves on: results clear and everyone sees the new question', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 0]]);

    await poll.host.nextQuestion('Star Rating');

    for (const actor of [poll.host, participant]) {
      await expect(actor.heading()).toHaveText('Star Rating ?');
      expect(await actor.answerLabels()).toEqual(ANSWERS['Star Rating']);
      await expect(actor.resultRows()).toHaveCount(0);
      await expect(actor.page.locator('.btnselected')).toHaveCount(0);
    }
    // Both are counted again for the new question, nobody has answered yet.
    await poll.host.expectCounts(0, 2);
    await participant.expectCounts(0, 2);
  });

  test('old answers do not leak into the next question results', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('No');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 1]]);
    await poll.host.nextQuestion('Yes/No');
    await poll.host.expectCounts(0, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 0]]);
    await participant.expectResults([['Yes', 0], ['No', 0]]);
  });

  test('a second round can be answered and revealed with correct results', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.nextQuestion('Yes/No/Maybe');
    await participant.answer('Maybe');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 0], ['Maybe', 1]]);
    await participant.expectResults([['Yes', 0], ['No', 0], ['Maybe', 1]]);
  });

  test('the invite link and session stay the same across questions', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    await poll.host.showResults();
    await poll.host.nextQuestion('Fibonacci');
    expect(await poll.host.sessionGuid()).toBe(poll.sessionGuid);
    expect(await poll.host.inviteUrl()).toBe(poll.inviteUrl);
  });

  test('a participant joining after the host moved on sees the current question', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    await poll.host.showResults();
    await poll.host.nextQuestion('Fibonacci');
    const late = await poll.join();
    await expect(late.heading()).toHaveText('Fibonacci ?');
    expect(await late.answerLabels()).toEqual(ANSWERS.Fibonacci);
    await late.expectCounts(0, 2);
  });

  test('host-only controls are not offered to participants', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await expect(participant.showResultsButton()).toHaveCount(0);
    await poll.host.showResults();
    await participant.expectResults([['Yes', 1], ['No', 0]]);
    await expect(participant.nextQuestionButton()).toHaveCount(0);
    await expect(participant.page.getByRole('button', { name: /show results|nextquestion/i })).toHaveCount(0);
    await expect(poll.host.nextQuestionButton()).toBeVisible();
  });
});
