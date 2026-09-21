import { APIRequestContext, APIResponse, PlaywrightWorkerArgs } from '@playwright/test';
import { config } from './config';

export interface QuestionType { QuestionGUID: string; Description: string }
export interface Answer { AnswerGUID: string; Description: string }

// Thin client for the internal Flask API, used to set up users and sessions
// quickly and to exercise the API directly in the security tests.
export class ApiClient {
  private constructor(readonly ctx: APIRequestContext) {}

  static async create(playwright: PlaywrightWorkerArgs['playwright'], withSecret = true): Promise<ApiClient> {
    const ctx = await playwright.request.newContext({
      baseURL: config.apiUrl,
      extraHTTPHeaders: withSecret ? { 'X-Internal-Secret': config.internalSecret } : {},
    });
    return new ApiClient(ctx);
  }

  dispose() { return this.ctx.dispose(); }

  private async json<T>(response: APIResponse): Promise<T> {
    if (!response.ok()) throw new Error(`API ${response.url()} -> ${response.status()}`);
    return response.json();
  }

  async newUser(): Promise<string> {
    return (await this.json<{ UserGUID: string }>(await this.ctx.get('/api/user/new'))).UserGUID;
  }

  async questionTypes(): Promise<QuestionType[]> {
    return this.json(await this.ctx.get('/api/question/all'));
  }

  async question(guid: string): Promise<{ question: QuestionType; answers: Answer[] }> {
    return this.json(await this.ctx.get(`/api/question/${guid}`));
  }

  async createSession(userGuid: string, questionGuid: string): Promise<string> {
    const response = await this.ctx.post('/api/session/new', { data: { user_guid: userGuid, question_guid: questionGuid } });
    return (await this.json<{ SessionGUID: string }>(response)).SessionGUID;
  }

  session(guid: string) { return this.ctx.get(`/api/session/${guid}`); }

  async sessionAction(sessionGuid: string, body: object) {
    return this.ctx.post(`/api/session/${sessionGuid}`, { data: body });
  }

  async answer(sessionGuid: string, userGuid: string, answerGuid: string | null, resultGuid: string | null = null) {
    return this.ctx.post(`/api/result/${sessionGuid}`, {
      data: { user_guid: userGuid, answer_guid: answerGuid, result_guid: resultGuid },
    });
  }

  async stats(sessionGuid: string): Promise<Record<string, any>> {
    return this.json(await this.ctx.get(`/api/result/${sessionGuid}`));
  }
}
