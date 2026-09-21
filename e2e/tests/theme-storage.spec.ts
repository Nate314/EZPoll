import { Page } from '@playwright/test';
import { Actor } from '../support/actor';
import { expect, test } from '../support/fixtures';

const DARK_SURFACE = 'rgb(30, 41, 59)';
const LIGHT_SURFACE = 'rgb(255, 255, 255)';

const dataTheme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const cardBackground = (page: Page) =>
  page.locator('.card').first().evaluate(el => getComputedStyle(el).backgroundColor);
const surfaceVariable = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim());
const localStorageKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage));
const sessionStorageKeys = (page: Page) => page.evaluate(() => Object.keys(sessionStorage).sort());
const toggle = (actor: Actor) => actor.page.locator('.theme-toggle');

test.describe('theme follows the system and can be toggled', () => {
  test('@smoke a dark system with no stored choice renders the dark theme', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'dark' });
    await actor.openHome();
    expect(await dataTheme(actor.page)).toBe('dark');
    expect(await surfaceVariable(actor.page)).toBe('#1e293b');
    expect(await cardBackground(actor.page)).toBe(DARK_SURFACE);
    await expect(toggle(actor)).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(await localStorageKeys(actor.page)).toEqual([]);
  });

  test('@smoke a light system with no stored choice renders the light theme', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    expect(await dataTheme(actor.page)).toBe('light');
    expect(await surfaceVariable(actor.page)).toBe('#ffffff');
    expect(await cardBackground(actor.page)).toBe(LIGHT_SURFACE);
    await expect(toggle(actor)).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(await localStorageKeys(actor.page)).toEqual([]);
  });

  test('the toggle switches the whole UI, not just the attribute', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    const lightBackground = await actor.page.evaluate(() => getComputedStyle(document.documentElement).backgroundImage);
    const lightHeader = await actor.page.locator('.app-header').evaluate(el => getComputedStyle(el).backgroundColor);
    const lightText = await actor.page.locator('h1').first().evaluate(el => getComputedStyle(el).color);

    await toggle(actor).click();
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await cardBackground(actor.page)).toBe(DARK_SURFACE);
    expect(await actor.page.evaluate(() => getComputedStyle(document.documentElement).backgroundImage)).not.toBe(lightBackground);
    expect(await actor.page.locator('.app-header').evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(lightHeader);
    expect(await actor.page.locator('h1').first().evaluate(el => getComputedStyle(el).color)).not.toBe(lightText);
    await expect(toggle(actor)).toHaveAttribute('aria-label', 'Switch to light mode');

    await toggle(actor).click();
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await cardBackground(actor.page)).toBe(LIGHT_SURFACE);
  });

  test('the toggle also restyles the question and results screens', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No', { colorScheme: 'light' });
    const lightCard = await cardBackground(poll.host.page);
    await toggle(poll.host).click();
    await expect(poll.host.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await cardBackground(poll.host.page)).not.toBe(lightCard);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 0], ['No', 0]]);
    expect(await cardBackground(poll.host.page)).toBe(DARK_SURFACE);
  });

  test('an explicit choice persists across a reload, even against the system preference', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    await toggle(actor).click();
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await actor.page.reload();
    await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
    expect(await dataTheme(actor.page)).toBe('dark');
    expect(await cardBackground(actor.page)).toBe(DARK_SURFACE);
    expect(await actor.page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('a stored preference survives in a new page of the same context', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    await toggle(actor).click();
    const second = await actor.context.newPage();
    await second.goto(`${actor.baseUrl}/home`);
    await expect(second.getByRole('button', { name: 'New Poll' })).toBeVisible();
    expect(await dataTheme(second)).toBe('dark');
  });

  test('following the system changes live while there is no explicit choice', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    expect(await dataTheme(actor.page)).toBe('light');
    await actor.page.emulateMedia({ colorScheme: 'dark' });
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await cardBackground(actor.page)).toBe(DARK_SURFACE);
    await actor.page.emulateMedia({ colorScheme: 'light' });
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await localStorageKeys(actor.page)).toEqual([]);
  });

  test('after an explicit choice the system preference no longer changes the theme', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    await toggle(actor).click();
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await actor.page.emulateMedia({ colorScheme: 'light' });
    await actor.page.emulateMedia({ colorScheme: 'dark' });
    await actor.page.emulateMedia({ colorScheme: 'light' });
    // No timing assumption: a fresh read after the media changes must still say dark.
    await expect.poll(() => dataTheme(actor.page), { timeout: 1_000 }).toBe('dark');
    expect(await cardBackground(actor.page)).toBe(DARK_SURFACE);
  });
});

test.describe('browser storage', () => {
  test('@smoke localStorage holds exactly the theme key after a full poll flow', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 0]]);
    for (const actor of [poll.host, participant]) {
      expect(await localStorageKeys(actor.page)).toEqual([]);
      await toggle(actor).click();
      expect(await localStorageKeys(actor.page)).toEqual(['theme']);
      expect(await actor.page.evaluate(() => localStorage.getItem('theme'))).toMatch(/^(light|dark)$/);
    }
  });

  test('sessionStorage holds the app keys and never the theme', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    expect(await sessionStorageKeys(poll.host.page)).toEqual(['api_url', 'session_guid', 'user_guid']);
    await toggle(poll.host).click();
    expect(await sessionStorageKeys(poll.host.page)).toEqual(['api_url', 'session_guid', 'user_guid']);
  });

  test('an invite visitor ends up with the three app keys and the invited session', async ({ createPoll, newActor }) => {
    const poll = await createPoll('Yes/No');
    const visitor = await newActor({ identity: 'none' });
    await visitor.openInvite(poll.inviteUrl);
    expect(await sessionStorageKeys(visitor.page)).toEqual(['api_url', 'session_guid', 'user_guid']);
    expect(await visitor.session('session_guid')).toBe(poll.sessionGuid);
  });

  test('sessionStorage values are per context: host and participant have different users', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No');
    const participant = await poll.join();
    expect(await poll.host.userGuid()).not.toBe(await participant.userGuid());
    expect(await poll.host.session('api_url')).toBe(await participant.session('api_url'));
    expect(await poll.host.sessionGuid()).toBe(await participant.sessionGuid());
  });
});
