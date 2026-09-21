import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { Monitor } from './monitor';
import { takeCreationSlots } from './rateBudget';

export interface ResultRow { label: string; text: string; progress: number }

const STATUS_PATTERN = /(\d+)\s*\/\s*(\d+)\s+participants/;

/** One browser context (own sessionStorage) acting as a host or participant. */
export class Actor {
  constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    readonly monitor: Monitor,
    readonly baseUrl: string,
  ) {}

  // ---- navigation -------------------------------------------------------

  async goto(path: string) { await this.page.goto(`${this.baseUrl}${path}`); }

  /** Opens /home and waits until the app has a user (created or validated). */
  async openHome() {
    await this.goto('/home');
    await expect(this.page.getByRole('button', { name: 'New Poll' })).toBeVisible();
    await this.waitForUser();
  }

  /** Opens an existing seeded session's question page. */
  async openQuestion() {
    await this.goto('/question');
    await this.waitForQuestion();
  }

  /** Opens a shared invite link the way a participant would. */
  async openInvite(url: string) {
    await this.page.goto(url);
    await this.waitForQuestion();
  }

  // ---- storage ----------------------------------------------------------

  session(key: string): Promise<string | null> {
    return this.page.evaluate(k => sessionStorage.getItem(k), key);
  }

  async waitForUser(): Promise<string> {
    await expect.poll(() => this.session('user_guid'), { timeout: 15_000 }).toBeTruthy();
    return (await this.session('user_guid'))!;
  }

  userGuid() { return this.session('user_guid'); }
  sessionGuid() { return this.session('session_guid'); }

  // ---- poll creation through the UI -------------------------------------

  questionTypeButtons(): Locator { return this.page.locator('.option-list button'); }

  /** Home -> New Poll -> choose a question type. Costs one session creation. */
  async createPollViaUi(type: string) {
    await takeCreationSlots({ sessions: 1 });
    await this.openHome();
    await this.page.getByRole('button', { name: 'New Poll' }).click();
    await expect(this.page).toHaveURL(/\/createquestion$/);
    await this.questionTypeButtons().first().waitFor();
    await this.page.getByRole('button', { name: type, exact: true }).click();
    await this.waitForQuestion();
  }

  // ---- question page ----------------------------------------------------

  answerButtons(): Locator { return this.page.locator('.option-list button'); }
  heading(): Locator { return this.page.locator('.question-view h1'); }
  status(): Locator { return this.page.locator('.status-block h3'); }
  showResultsButton(): Locator { return this.page.getByRole('button', { name: 'Show Results' }); }
  nextQuestionButton(): Locator { return this.page.getByRole('button', { name: 'NextQuestion' }); }

  async waitForQuestion() {
    await expect(this.page).toHaveURL(/\/question$/, { timeout: 20_000 });
    await expect(this.heading()).toBeVisible({ timeout: 15_000 });
  }

  async questionTitle(): Promise<string> {
    return ((await this.heading().innerText()).replace(/\s*\?\s*$/, '')).trim();
  }

  async answerLabels(): Promise<string[]> {
    await expect(this.answerButtons().first()).toBeVisible();
    return (await this.answerButtons().allInnerTexts()).map(x => x.trim());
  }

  async answer(label: string) {
    // The app registers the visitor with a placeholder answer as soon as the
    // question loads; an answer clicked before that round trip finishes is
    // dropped by the server (reported as a known issue in the pull request). The status
    // block only renders once the visitor is counted, so wait for it.
    await expect(this.status()).toBeVisible();
    const button = this.page.locator('.option-list').getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toHaveClass(/btnselected/);
  }

  async expectCounts(answered: number, participants: number) {
    await expect(this.status()).toHaveText(
      new RegExp(`^\\s*${answered}\\s*/\\s*${participants}\\s+participants have answered`), { timeout: 15_000 });
  }

  async counts(): Promise<{ answered: number; participants: number }> {
    const match = STATUS_PATTERN.exec(await this.status().innerText());
    if (!match) throw new Error('status text not found');
    return { answered: Number(match[1]), participants: Number(match[2]) };
  }

  async inviteUrl(): Promise<string> {
    const link = this.page.locator('#invite-link');
    await expect(link).toHaveText(/\/[0-9a-f-]{36}$/i, { timeout: 10_000 });
    return (await link.innerText()).trim();
  }

  async showResults() { await this.showResultsButton().click(); }

  // ---- results ----------------------------------------------------------

  resultRows(): Locator { return this.page.locator('.result-row'); }

  async results(): Promise<ResultRow[]> {
    await expect(this.resultRows().first()).toBeVisible({ timeout: 15_000 });
    return this.resultRows().evaluateAll(rows => rows.map(row => ({
      label: (row.querySelector('button')!.textContent || '').trim(),
      text: (row.querySelector('.result-percent')!.textContent || '').trim(),
      progress: (row.querySelector('progress') as HTMLProgressElement).value,
    })));
  }

  /**
   * Asserts the revealed results: labels in order, "N% (count/total)" text and
   * the exact progress value for each answer.
   */
  async expectResults(expected: [label: string, count: number][]) {
    const total = expected.reduce((sum, [, count]) => sum + count, 0);
    const wanted = expected.map(([label, count]) => {
      const percent = total > 0 ? (100 * count) / total : 0;
      return { label, text: `${Math.round(percent)}% (${count}/${total})`, progress: percent };
    });
    await expect.poll(async () => {
      const rows = await this.results().catch(() => []);
      return rows.map(({ label, text }) => ({ label, text }));
    }, { timeout: 15_000 }).toEqual(wanted.map(({ label, text }) => ({ label, text })));
    const rows = await this.results();
    rows.forEach((row, i) => expect(row.progress).toBeCloseTo(wanted[i].progress, 6));
  }

  /** Host: NextQuestion -> choose the next question type. */
  async nextQuestion(type: string) {
    await this.nextQuestionButton().click();
    await expect(this.page).toHaveURL(/\/createquestion$/);
    await this.page.getByRole('button', { name: type, exact: true }).click();
    await this.waitForQuestion();
  }

  /** Page text plus every attribute value, for "NaN"/"Infinity" sweeps. */
  async textAndAttributes(): Promise<string> {
    return this.page.evaluate(() => {
      const parts: string[] = [document.body.innerText];
      document.querySelectorAll('*').forEach(el => {
        for (const attr of Array.from(el.attributes)) parts.push(`${attr.name}=${attr.value}`);
        if (el instanceof HTMLProgressElement) parts.push(`value=${el.value}`);
      });
      return parts.join('\n');
    });
  }

  async close() { await this.context.close(); }
}
