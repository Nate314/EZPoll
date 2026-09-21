import { config, origin } from '../support/config';
import { expect, test } from '../support/fixtures';

const socketOrigin = origin(config.socketUrl);
const websocketOrigin = socketOrigin.replace(/^http/, 'ws');

test.describe('@security client response headers', () => {
  let indexHtml = '';
  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    indexHtml = await (await ctx.get(`${config.baseUrl}/`)).text();
    await ctx.dispose();
  });

  const assetPath = () => /src="(\/assets\/[^"]+\.js)"/.exec(indexHtml)?.[1] ?? '/index.html';

  for (const path of ['/', '/index.html', '/config.json', '/home', '/some/unknown/page', '__asset__']) {
    test(`@smoke security headers are present on ${path === '__asset__' ? 'the JS bundle' : path}`, async ({ request }) => {
      const response = await request.get(`${config.baseUrl}${path === '__asset__' ? assetPath() : path}`);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('no-referrer');
      expect(headers['permissions-policy']).toMatch(/camera=\(\)/);
      expect(headers['permissions-policy']).toMatch(/microphone=\(\)/);
      expect(headers['permissions-policy']).toMatch(/geolocation=\(\)/);
      expect(headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(headers['content-security-policy']).toBeTruthy();
    });
  }

  test('the CSP is strict and its connect-src allows exactly the configured socket origin', async ({ request }) => {
    const csp = (await request.get(`${config.baseUrl}/`)).headers()['content-security-policy'];
    const directives = Object.fromEntries(csp.split(';').map(x => x.trim()).filter(Boolean).map(x => {
      const [name, ...values] = x.split(/\s+/);
      return [name, values];
    }));
    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['script-src']).toEqual(["'self'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['connect-src']).toEqual(["'self'", socketOrigin, websocketOrigin]);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  });

  test('config.json advertises the socket server that the CSP allows', async ({ request }) => {
    const response = await request.get(`${config.baseUrl}/config.json`);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ api_url: config.socketUrl });
  });

  test('the server does not leak its version', async ({ request }) => {
    for (const path of ['/', '/missing-file.js', '/assets/nope.css']) {
      const response = await request.get(`${config.baseUrl}${path}`, { failOnStatusCode: false });
      const server = response.headers()['server'] ?? '';
      expect(server, `Server header on ${path}`).not.toMatch(/\d+\.\d+/);
      expect(response.headers()['x-powered-by']).toBeUndefined();
    }
  });

  test('index.html is revalidated on every load', async ({ request }) => {
    const response = await request.get(`${config.baseUrl}/index.html`);
    expect(response.headers()['cache-control']).toBe('no-cache');
  });

  test('the app refuses to be framed by another page', async ({ newActor }) => {
    const actor = await newActor({ allowConsoleErrors: true });
    await actor.page.setContent(`<iframe src="${config.baseUrl}/home"></iframe>`);
    // X-Frame-Options / frame-ancestors turn the framed navigation into an error page.
    await expect.poll(() => actor.page.frames().some(f => f.url().startsWith('chrome-error://')), { timeout: 10_000 }).toBe(true);
    expect(actor.page.frames().some(f => f.url().startsWith(config.baseUrl))).toBe(false);
  });
});

test.describe('@security no browser errors on the happy path', () => {
  test('@smoke a full flow raises no console errors, CSP violations, CORS errors or failed requests', async ({ newActor }) => {
    const violations: string[] = [];
    const track = async (page: import('@playwright/test').Page) => {
      await page.exposeFunction('reportCspViolation', (text: string) => violations.push(text));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', e =>
          (window as any).reportCspViolation(`${e.violatedDirective} ${e.blockedURI}`));
      });
    };

    const host = await newActor({ identity: 'none' });
    await track(host.page);
    await host.createPollViaUi('Fibonacci');
    const inviteUrl = await host.inviteUrl();

    const participants = [];
    for (let i = 0; i < 2; i++) {
      const participant = await newActor({ identity: 'none' });
      await track(participant.page);
      await participant.openInvite(inviteUrl);
      participants.push(participant);
    }
    await host.expectCounts(0, 3);
    await participants[0].answer('coffee break');
    await participants[1].answer('13');
    await host.expectCounts(2, 3);
    await host.showResults();
    await host.expectResults(
      ['0', '1', '2', '3', '5', '8', '13', '100', 'coffee break'].map(l => [l, l === '13' || l === 'coffee break' ? 1 : 0] as [string, number]));
    await participants[0].expectResults(
      ['0', '1', '2', '3', '5', '8', '13', '100', 'coffee break'].map(l => [l, l === '13' || l === 'coffee break' ? 1 : 0] as [string, number]));
    await host.nextQuestion('Yes/No');
    await participants[0].answer('Yes');
    await host.expectCounts(1, 3);

    expect(violations).toEqual([]);
    for (const actor of [host, ...participants]) expect(actor.monitor.problems()).toEqual([]);
  });
});
