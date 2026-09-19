import { Page } from '@playwright/test';

// Collects everything that would show up as a problem in the browser: console
// errors (which include CSP violations and CORS failures), uncaught page
// errors, failed requests and HTTP error responses.
export class Monitor {
  readonly consoleErrors: string[] = [];
  readonly pageErrors: string[] = [];
  readonly failedRequests: string[] = [];
  readonly errorResponses: { url: string; status: number }[] = [];
  readonly socketIoResponses: { url: string; status: number }[] = [];

  attach(page: Page) {
    page.on('console', message => {
      if (message.type() === 'error') this.consoleErrors.push(`${message.text()} @ ${message.location().url}`);
    });
    page.on('pageerror', error => this.pageErrors.push(String(error)));
    page.on('requestfailed', request =>
      this.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
    page.on('response', response => {
      const entry = { url: response.url(), status: response.status() };
      if (entry.url.includes('/socket.io/')) this.socketIoResponses.push(entry);
      if (entry.status >= 400) this.errorResponses.push(entry);
    });
  }

  /** Every problem seen so far, as readable lines (empty when clean). */
  problems(): string[] {
    return [
      ...this.consoleErrors.map(x => `console.error: ${x}`),
      ...this.pageErrors.map(x => `pageerror: ${x}`),
      ...this.failedRequests.map(x => `requestfailed: ${x}`),
      ...this.errorResponses.map(x => `HTTP ${x.status}: ${x.url}`),
    ];
  }
}
