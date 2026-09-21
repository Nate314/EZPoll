import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { takeCreationSlots } from '../support/rateBudget';
import { expect, test } from '../support/fixtures';

// Focus order is decided by the DOM, so pressing Tab a bounded number of times
// until the wanted element has focus is deterministic and needs no sleeps.
async function tabTo(page: Page, target: { text?: string; className?: string }, maxTabs = 20) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(({ text, className }) => {
      const el = document.activeElement;
      if (!el) return false;
      return (text !== undefined && (el.textContent || '').trim() === text) ||
        (className !== undefined && el.classList.contains(className));
    }, target);
    if (focused) return;
  }
  throw new Error(`nothing matching ${JSON.stringify(target)} received keyboard focus`);
}

test.describe('@a11y basic accessibility', () => {
  test('@smoke every button has an accessible name on each screen', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No/Maybe');
    const participant = await poll.join();
    const screens: [string, () => Promise<Page>][] = [
      ['question (host)', async () => poll.host.page],
      ['question (participant)', async () => participant.page],
    ];
    for (const [name, page] of screens) {
      const p = await page();
      const buttons = p.getByRole('button');
      const count = await buttons.count();
      expect(count, name).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) await expect(buttons.nth(i), `${name} button ${i}`).not.toHaveAccessibleName('');
    }
    await participant.answer('Yes');
    await poll.host.expectCounts(1, 2);
    await poll.host.showResults();
    await poll.host.expectResults([['Yes', 1], ['No', 0], ['Maybe', 0]]);
    const resultButtons = poll.host.page.getByRole('button');
    for (let i = 0; i < await resultButtons.count(); i++) await expect(resultButtons.nth(i)).not.toHaveAccessibleName('');
  });

  test('home and type list buttons have accessible names and the page has a language and title', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    await expect(actor.page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(actor.page).toHaveTitle(/\S/);
    await expect(actor.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
    await expect(actor.page.getByRole('button', { name: /Switch to (dark|light) mode/ })).toBeVisible();
    await actor.page.getByRole('button', { name: 'New Poll' }).click();
    await actor.questionTypeButtons().first().waitFor();
    for (const button of await actor.page.getByRole('button').all()) await expect(button).not.toHaveAccessibleName('');
  });

  test('@smoke the main flow works with the keyboard only: Tab and Enter to create a poll and answer', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    const page = actor.page;
    await tabTo(page, { text: 'New Poll' });
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/createquestion$/);
    await actor.questionTypeButtons().first().waitFor();

    await takeCreationSlots({ sessions: 1 });
    await tabTo(page, { text: 'Yes/No' });
    await page.keyboard.press('Enter');
    await actor.waitForQuestion();

    await expect(actor.status()).toBeVisible();
    await tabTo(page, { text: 'Yes' });
    await page.keyboard.press('Enter');
    await expect(page.locator('.option-list').getByRole('button', { name: 'Yes', exact: true })).toHaveClass(/btnselected/);
    await actor.expectCounts(1, 1);
    await tabTo(page, { text: 'Show Results' });
    await page.keyboard.press('Enter');
    await actor.expectResults([['Yes', 1], ['No', 0]]);
  });

  test('focused buttons show a visible focus indicator', async ({ newActor }) => {
    const actor = await newActor();
    await actor.openHome();
    await tabTo(actor.page, { text: 'New Poll' });
    const outline = await actor.page.evaluate(() => {
      const style = getComputedStyle(document.activeElement!);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });

  test('the theme toggle is reachable and operable with the keyboard', async ({ newActor }) => {
    const actor = await newActor({ colorScheme: 'light' });
    await actor.openHome();
    await tabTo(actor.page, { className: 'theme-toggle' });
    await actor.page.keyboard.press('Enter');
    await expect(actor.page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  for (const scheme of ['light', 'dark'] as const) {
    // Only critical violations fail the test. Everything else axe finds is attached
    // to the test report as "known issues" so it stays visible without blocking.
    test(`axe finds no critical violations in the ${scheme} theme`, async ({ createPoll }, testInfo) => {
      const poll = await createPoll('Yes/No', { colorScheme: scheme });
      const participant = await poll.join({ colorScheme: scheme });
      await participant.answer('Yes');
      await poll.host.expectCounts(1, 2);
      const scan = async (page: Page, screen: string) => {
        const { violations } = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`axe-${scheme}-${screen}`, {
          body: JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })), null, 2),
          contentType: 'application/json',
        });
        return violations.filter(v => v.impact === 'critical').map(v => `${screen}: ${v.id}`);
      };
      const critical = [
        ...await scan(poll.host.page, 'question'),
        ...await (async () => { await poll.host.showResults(); await poll.host.expectResults([['Yes', 1], ['No', 0]]); return scan(poll.host.page, 'results'); })(),
      ];
      expect(critical).toEqual([]);
    });
  }
});
