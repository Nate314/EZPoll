import { test, expect } from '../support/fixtures';
import { takeCreationSlots } from '../support/rateBudget';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.describe('home page and navigation', () => {
  test('@smoke home page renders the title, subtitle and New Poll button', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    await expect(actor.page).toHaveTitle('EZPoll');
    await expect(actor.page.getByRole('heading', { level: 1, name: 'EZPoll' })).toBeVisible();
    await expect(actor.page.getByText('Create a live poll and share it with your audience')).toBeVisible();
    await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeEnabled();
    expect(await actor.userGuid()).toMatch(GUID);
  });

  test('@smoke New Poll opens the question type list', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    await actor.page.getByRole('button', { name: 'New Poll' }).click();
    await expect(actor.page).toHaveURL(/\/createquestion$/);
    await expect(actor.page.getByRole('heading', { name: 'Choose a Question Type' })).toBeVisible();
    await expect(actor.questionTypeButtons()).toHaveCount(5);
  });

  test('the root path shows a loading indicator, creates a user and lands on /home', async ({ newActor }) => {
    const actor = await newActor({ identity: 'none' });
    await actor.goto('/');
    await expect(actor.page.getByRole('heading', { level: 1 })).toContainText('loading');
    await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
    await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
    expect(await actor.waitForUser()).toMatch(GUID);
    expect(await actor.sessionGuid()).toBeNull();
  });

  test('the root path drops a previous session and user from sessionStorage', async ({ newActor, api, questions }) => {
    const userGuid = await api.newUser();
    const sessionGuid = await api.createSession(userGuid, questions['Yes/No'].QuestionGUID);
    const actor = await newActor({ identity: 'api', userGuid, sessionGuid });
    await actor.goto('/');
    await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
    expect(await actor.sessionGuid()).toBeNull();
  });

  for (const path of ['/notfound', '/not-a-guid', '/12345678-1234-1234-1234']) {
    test(`unknown or malformed path ${path} ends on /home without errors`, async ({ newActor }) => {
      const actor = await newActor();
      await actor.goto(path);
      await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
      await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
      expect(await actor.sessionGuid()).toBeNull();
    });
  }

  // config.json must be fetched with an absolute URL: a relative one resolves
  // to /some/unknown/config.json here, which nginx answers with index.html.
  test('a nested unknown path ends on /home', async ({ newActor }) => {
    const actor = await newActor();
    await actor.goto('/some/unknown/page');
    await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
    await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
  });

  test('a well formed invite link for a session that does not exist ends on /home', async ({ newActor }) => {
    const actor = await newActor();
    await actor.goto(`/${crypto.randomUUID()}`);
    await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
    expect(await actor.sessionGuid()).toBeNull();
  });

  test('unknown routes show the loading state while they redirect, never a 404 heading', async ({ newActor }) => {
    const actor = await newActor();
    await actor.goto('/definitely-missing');
    await expect(actor.page.getByRole('heading', { level: 1 })).toContainText('loading');
    await expect(actor.page.getByText('404', { exact: true })).toHaveCount(0);
  });

  test('deep link /question without a session redirects to /home', async ({ newActor }) => {
    const actor = await newActor();
    await actor.goto('/question');
    await expect(actor.page).toHaveURL(/\/home$/, { timeout: 10_000 });
  });

  test('deep link /createquestion with a known user lists the question types', async ({ newActor }) => {
    const actor = await newActor();
    await actor.goto('/createquestion');
    await expect(actor.questionTypeButtons()).toHaveCount(5);
  });

  for (const identity of ['none', 'stale'] as const) {
    test(`a question type clicked the moment it can be clicked creates the poll (stored user: ${identity})`, async ({ newActor }) => {
      await takeCreationSlots({ sessions: 1 });
      const actor = await newActor({ identity });
      // Clicks Yes/No as soon as it is rendered and enabled, without waiting for a valid user_guid.
      await actor.page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.option-list button'))
            .find(b => (b.textContent || '').trim() === 'Yes/No' && !b.disabled);
          if (!button) return;
          observer.disconnect();
          button.click();
        });
        observer.observe(document, { childList: true, subtree: true, attributes: true });
      });
      await actor.goto('/createquestion');
      await actor.waitForQuestion();
      expect(await actor.answerLabels()).toEqual(['Yes', 'No']);
    });
  }

  test('a hard reload on /question keeps the session and the host controls', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    await poll.host.expectCounts(0, 1);
    await poll.host.page.reload();
    await poll.host.waitForQuestion();
    expect(await poll.host.sessionGuid()).toBe(poll.sessionGuid);
    await poll.host.expectCounts(0, 1);
    await expect(poll.host.showResultsButton()).toBeVisible();
    expect(await poll.host.answerLabels()).toEqual(['Yes', 'No']);
  });

  test('a hard reload on /createquestion keeps listing the question types', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    await actor.page.getByRole('button', { name: 'New Poll' }).click();
    await expect(actor.questionTypeButtons()).toHaveCount(5);
    await actor.page.reload();
    await expect(actor.questionTypeButtons()).toHaveCount(5);
  });

  test('a stale user_guid in sessionStorage is replaced by a user the server knows', async ({ newActor, api }) => {
    const stale = crypto.randomUUID();
    const actor = await newActor({ identity: 'stale', userGuid: stale });
    await actor.goto('/home');
    await expect.poll(async () => {
      const current = await actor.userGuid();
      return !!current && current !== stale;
    }, { timeout: 15_000 }).toBe(true);
    const replacement = (await actor.userGuid())!;
    expect(replacement).toMatch(GUID);
    expect((await api.ctx.get(`/api/user/${replacement}`)).status()).toBe(200);
    expect((await api.ctx.get(`/api/user/${stale}`)).status()).toBe(404);
  });

  test('a stale user can still create a poll after recovery', async ({ newActor }) => {
    const stale = crypto.randomUUID();
    const actor = await newActor({ identity: 'stale', userGuid: stale });
    await actor.goto('/home');
    // Wait for the replacement first: a poll created with the stale user would be refused.
    await expect.poll(async () => {
      const current = await actor.userGuid();
      return !!current && current !== stale;
    }, { timeout: 15_000 }).toBe(true);
    await actor.createPollViaUi('Yes/No');
    expect(await actor.answerLabels()).toEqual(['Yes', 'No']);
  });
});
