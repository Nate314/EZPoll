import { Browser, expect, test as base } from '@playwright/test';
import { Actor } from './actor';
import { ApiClient, QuestionType } from './api';
import { config } from './config';
import { Monitor } from './monitor';
import { takeCreationSlots } from './rateBudget';

export const QUESTION_NAMES = ['EMPTY', 'Yes/No', 'Yes/No/Maybe', 'Star Rating', 'Fibonacci'] as const;
export type QuestionName = typeof QUESTION_NAMES[number];

/** Answer labels the seed data defines for each question type, in order. */
export const ANSWERS: Record<QuestionName, string[]> = {
  EMPTY: ['Yes'],
  'Yes/No': ['Yes', 'No'],
  'Yes/No/Maybe': ['Yes', 'No', 'Maybe'],
  'Star Rating': ['0', '1', '2', '3', '4', '5'],
  Fibonacci: ['0', '1', '2', '3', '5', '8', '13', '100', 'coffee break'],
};

export interface ActorOptions {
  /**
   * api: a user created through the API is pre-seeded into sessionStorage (no
   * UI user creation, so the socket server's rate limit is not consumed).
   * none: a fresh browser context, the app creates its own user.
   * stale: sessionStorage holds a user GUID the server does not know.
   */
  identity?: 'api' | 'none' | 'stale';
  sessionGuid?: string;
  userGuid?: string;
  colorScheme?: 'light' | 'dark' | 'no-preference';
  viewport?: { width: number; height: number };
  /** Skip the automatic "no console errors" check at teardown. */
  allowConsoleErrors?: boolean;
}

export interface Poll {
  host: Actor;
  hostGuid: string;
  sessionGuid: string;
  inviteUrl: string;
  type: QuestionName;
  /** A participant in a brand-new context opens the invite link. */
  join(options?: ActorOptions): Promise<Actor>;
}

interface Fixtures {
  newActor: (options?: ActorOptions) => Promise<Actor>;
  createPoll: (type: QuestionName, options?: { via?: 'api' | 'ui' } & ActorOptions) => Promise<Poll>;
}

interface WorkerFixtures {
  api: ApiClient;
  questions: Record<string, QuestionType>;
}

const randomGuid = () => crypto.randomUUID();

async function makeActor(browser: Browser, api: ApiClient, options: ActorOptions): Promise<Actor> {
  const { identity = 'api' } = options;
  const context = await browser.newContext({
    baseURL: config.baseUrl,
    colorScheme: options.colorScheme,
    viewport: options.viewport,
  });
  const seed: Record<string, string> = {};
  if (identity === 'api') seed.user_guid = options.userGuid ?? await api.newUser();
  if (identity === 'stale') seed.user_guid = options.userGuid ?? randomGuid();
  if (options.sessionGuid) seed.session_guid = options.sessionGuid;
  if (identity !== 'api') await takeCreationSlots({ users: 1 }); // the app will create a user itself
  // Only seeds keys that are missing, so reloads keep whatever the app stored since.
  await context.addInitScript(values => {
    try {
      for (const [key, value] of Object.entries(values)) {
        if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, value as string);
      }
    } catch { /* storage unavailable */ }
  }, seed);
  const page = await context.newPage();
  const monitor = new Monitor();
  monitor.attach(page);
  return new Actor(context, page, monitor, config.baseUrl);
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  api: [async ({ playwright }, use) => {
    const api = await ApiClient.create(playwright);
    await use(api);
    await api.dispose();
  }, { scope: 'worker' }],

  questions: [async ({ api }, use) => {
    const list = await api.questionTypes();
    await use(Object.fromEntries(list.map(q => [q.Description, q])));
  }, { scope: 'worker' }],

  newActor: async ({ browser, api }, use) => {
    const actors: { actor: Actor; allowConsoleErrors: boolean }[] = [];
    await use(async (options = {}) => {
      const actor = await makeActor(browser, api, options);
      actors.push({ actor, allowConsoleErrors: !!options.allowConsoleErrors });
      return actor;
    });
    const problems = actors
      .filter(x => !x.allowConsoleErrors)
      .flatMap(x => [...x.actor.monitor.consoleErrors, ...x.actor.monitor.pageErrors]);
    for (const { actor } of actors) await actor.close().catch(() => undefined);
    expect(problems, 'console errors or uncaught page errors during the test').toEqual([]);
  },

  createPoll: async ({ newActor, api, questions }, use) => {
    await use(async (type, options = {}) => {
      const { via = 'api', ...actorOptions } = options;
      const question = questions[type];
      if (!question) throw new Error(`question type ${type} is not seeded`);
      let host: Actor;
      let hostGuid: string;
      if (via === 'ui') {
        host = await newActor({ ...actorOptions, identity: 'api' });
        await host.createPollViaUi(type);
        hostGuid = (await host.userGuid())!;
      } else {
        hostGuid = await api.newUser();
        const sessionGuid = await api.createSession(hostGuid, question.QuestionGUID);
        host = await newActor({ ...actorOptions, identity: 'api', userGuid: hostGuid, sessionGuid });
        await host.openQuestion();
      }
      const inviteUrl = await host.inviteUrl();
      const sessionGuid = (await host.sessionGuid())!;
      return {
        host, hostGuid, sessionGuid, inviteUrl, type,
        join: async (joinOptions = {}) => {
          const participant = await newActor(joinOptions);
          await participant.openInvite(inviteUrl);
          return participant;
        },
      };
    });
  },
});

export { expect };
