import { ANSWERS, QUESTION_NAMES, expect, test } from '../support/fixtures';

test.describe('question types', () => {
  test('@smoke the type list shows every seeded type in the intended order', async ({ newActor, api }) => {
    const actor = await newActor();
    await actor.goto('/createquestion');
    await expect(actor.questionTypeButtons()).toHaveCount(QUESTION_NAMES.length);
    expect((await actor.questionTypeButtons().allInnerTexts()).map(x => x.trim())).toEqual([...QUESTION_NAMES]);
    const fromApi = (await api.questionTypes()).map(q => q.Description);
    expect(fromApi.slice(0, QUESTION_NAMES.length)).toEqual([...QUESTION_NAMES]);
  });

  for (const type of QUESTION_NAMES) {
    test(`@smoke creating a "${type}" poll through the UI shows its answers in order`, async ({ createPoll, api, questions }) => {
      const poll = await createPoll(type, { via: 'ui' });
      await expect(poll.host.heading()).toHaveText(`${type} ?`);
      const labels = await poll.host.answerLabels();
      expect(labels).toEqual(ANSWERS[type]);
      expect(labels).not.toContain('None');
      await expect(poll.host.answerButtons()).toHaveCount(ANSWERS[type].length);
      // The API agrees with what the UI rendered.
      const { answers } = await api.question(questions[type].QuestionGUID);
      expect(answers.map(a => a.Description)).toEqual(ANSWERS[type]);
      expect(poll.inviteUrl).toMatch(new RegExp(`/${poll.sessionGuid}$`));
    });
  }

  test('the placeholder None answer never shows as a choice or a result', async ({ createPoll }) => {
    const poll = await createPoll('EMPTY');
    const participant = await poll.join();
    await expect(participant.answerButtons()).toHaveText(['Yes']);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0]]);
    await expect(poll.host.page.getByText('None', { exact: true })).toHaveCount(0);
    await expect(participant.resultRows()).toHaveCount(1);
  });
});
