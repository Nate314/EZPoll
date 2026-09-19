import { Page } from '@playwright/test';
import { Actor } from '../support/actor';
import { expect, test } from '../support/fixtures';

const MOBILE = { width: 400, height: 800 };
const NARROW = { width: 320, height: 640 };

interface Box { name: string; left: number; right: number; top: number; bottom: number }

/** Checks the current screen for horizontal overflow, clipped text and overlapping controls. */
async function expectCleanLayout(page: Page, viewportWidth: number) {
  const report = await page.evaluate(() => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const box = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      const label = (el.textContent || el.tagName).trim().slice(0, 30);
      return { name: `${el.tagName.toLowerCase()} "${label}"`, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const controls = Array.from(document.querySelectorAll('button, progress, input')).filter(visible);
    const scroller = document.querySelector('.router-view') as HTMLElement | null;
    // The document scrolls (the content area grows with its content); scroll both to be safe.
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
    const footer = document.querySelector('footer');
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      scrollerOverflowsX: scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : false,
      boxes: [...controls, ...Array.from(document.querySelectorAll('h1, h3, .app-title, #invite-link')).filter(visible)].map(box),
      clippedButtons: controls.filter(el => el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1).map(el => (el.textContent || '').trim()),
      buttons: controls.filter(el => el.tagName === 'BUTTON').map(box),
      footer: footer && visible(footer) ? box(footer) : null,
    };
  });

  expect(report.docScrollWidth, 'document scrollWidth').toBeLessThanOrEqual(viewportWidth);
  expect(report.bodyScrollWidth, 'body scrollWidth').toBeLessThanOrEqual(viewportWidth);
  expect(report.scrollerOverflowsX, 'content area scrolls horizontally').toBe(false);
  for (const b of report.boxes) {
    expect(b.left, `${b.name} left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(b.right, `${b.name} right edge`).toBeLessThanOrEqual(viewportWidth + 0.5);
  }
  expect(report.clippedButtons, 'buttons whose text is clipped').toEqual([]);

  const overlaps = (a: Box, b: Box) =>
    a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  for (let i = 0; i < report.buttons.length; i++) {
    for (let j = i + 1; j < report.buttons.length; j++) {
      expect(overlaps(report.buttons[i], report.buttons[j]), `${report.buttons[i].name} overlaps ${report.buttons[j].name}`).toBe(false);
    }
    if (report.footer) {
      expect(overlaps(report.buttons[i], report.footer), `${report.buttons[i].name} is covered by the footer`).toBe(false);
    }
  }
}

const THEMES = ['light', 'dark'] as const;

for (const scheme of THEMES) {
  test.describe(`@responsive 400px viewport, ${scheme} theme`, () => {
    test.use({ viewport: MOBILE });

    test(`home screen has no overflow or overlap`, async ({ newActor }) => {
      const actor = await newActor({ colorScheme: scheme, viewport: MOBILE });
      await actor.openHome();
      await expect(actor.page.locator('.theme-toggle')).toBeVisible();
      await expectCleanLayout(actor.page, MOBILE.width);
    });

    test(`question type list has no overflow or overlap`, async ({ newActor }) => {
      const actor = await newActor({ colorScheme: scheme, viewport: MOBILE });
      await actor.goto('/createquestion');
      await expect(actor.questionTypeButtons()).toHaveCount(5);
      await expectCleanLayout(actor.page, MOBILE.width);
    });

    test(`question screen with nine answers has no overflow or overlap`, async ({ createPoll }) => {
      const poll = await createPoll('Fibonacci', { colorScheme: scheme, viewport: MOBILE });
      await expect(poll.host.answerButtons()).toHaveCount(9);
      await poll.host.expectCounts(0, 1);
      await expectCleanLayout(poll.host.page, MOBILE.width);
    });

    test(`results screen has no overflow or overlap`, async ({ createPoll }) => {
      const poll = await createPoll('Fibonacci', { colorScheme: scheme, viewport: MOBILE });
      const participant = await poll.join({ colorScheme: scheme, viewport: MOBILE });
      await participant.answer('coffee break');
      await poll.host.expectCounts(1, 2);
      await poll.host.showResults();
      await poll.host.expectResults(
        ['0', '1', '2', '3', '5', '8', '13', '100', 'coffee break'].map(l => [l, l === 'coffee break' ? 1 : 0] as [string, number]));
      await expectCleanLayout(poll.host.page, MOBILE.width);
      await participant.results();
      await expectCleanLayout(participant.page, MOBILE.width);
    });
  });
}

test.describe('@responsive 320px viewport', () => {
  test('home and question screens still fit', async ({ createPoll, newActor }) => {
    const home: Actor = await newActor({ viewport: NARROW });
    await home.openHome();
    await expectCleanLayout(home.page, NARROW.width);
    const poll = await createPoll('Yes/No/Maybe', { viewport: NARROW });
    await expectCleanLayout(poll.host.page, NARROW.width);
  });
});

test.describe('@responsive desktop', () => {
  test('the question screen stays centered on a wide viewport', async ({ createPoll }) => {
    const poll = await createPoll('Yes/No', { viewport: { width: 1440, height: 900 } });
    const card = await poll.host.page.locator('.card').boundingBox();
    expect(card).not.toBeNull();
    const centre = card!.x + card!.width / 2;
    expect(Math.abs(centre - 720)).toBeLessThan(10);
    expect(card!.width).toBeLessThanOrEqual(600);
  });
});
