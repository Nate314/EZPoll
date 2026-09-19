import { request } from '@playwright/test';
import { config } from './config';

// Fail fast with a readable message when the stack is not up.
export default async function globalSetup() {
  const ctx = await request.newContext();
  const checks: [string, string, Record<string, string>?][] = [
    ['client', `${config.baseUrl}/config.json`],
    ['socket server', `${config.socketUrl}/socket.io/?EIO=4&transport=polling`, { Origin: config.baseUrl }],
    ['API', `${config.apiUrl}/api/question/all`, { 'X-Internal-Secret': config.internalSecret }],
  ];
  for (const [name, url, headers] of checks) {
    const response = await ctx.get(url, { headers, failOnStatusCode: false }).catch(error => {
      throw new Error(`EZPoll ${name} is not reachable at ${url} (${error.message}). Start the stack with run.ps1 / run.sh.`);
    });
    if (!response.ok()) {
      throw new Error(`EZPoll ${name} answered ${response.status()} at ${url}. Check BASE_URL, SOCKET_URL, API_URL and INTERNAL_API_SECRET.`);
    }
  }
  await ctx.dispose();
}
