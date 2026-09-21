# EZPoll

Website to make live polls easy

## Running with Docker

No local Node/npm/Python/MySQL install required. From the repo root:

```shell
docker compose up --build
```

This works from a fresh clone with no configuration: every setting has a development default in `docker-compose.yml`. To run it next to other projects that also want port 8080, use the launcher described in "Running side by side / port selection" below. Before exposing it anywhere real, copy `.env.example` to `.env` and change the secrets.

| Service | URL | Notes |
|---|---|---|
| `client` (Vue 3 + Vite app) | http://localhost:8080 | built with `node:22-alpine`, served by unprivileged nginx with a CSP and security headers |
| `socket-server` | http://localhost:3000 | Socket.io 4 server, the only thing the browser talks to besides the client |
| `python-api` | http://127.0.0.1:5000 | Flask API behind gunicorn, internal: requires the `X-Internal-Secret` header |
| `mysql-db` | 127.0.0.1:3307 | MySQL 8.4, loopback only (3307 avoids clashing with a local MySQL on 3306) |
| `phpmyadmin` | http://127.0.0.1:8083 | login required, loopback only |

Wait for the containers to report healthy (`docker compose logs -f`), then open `http://localhost:8080`. Stop with `docker compose down` (add `-v` to also drop the MySQL data volume; the schema and users are only created on first start of an empty volume).

## Running side by side / port selection

Several projects default to host port 8080, so two of them cannot run at once with a plain `docker compose up`. Each of these repos ships a small launcher that picks free ports for you:

```
./run.sh          # macOS, Linux, Git Bash
.\run.ps1         # Windows PowerShell
```

What it does:

1. If no `.env` exists it creates one (with a header comment saying it was generated). An existing `.env` is never overwritten: only the port variables (`CLIENT_PORT`, `SOCKET_PORT`, `API_PORT`, `MYSQL_PORT`, `PHPMYADMIN_PORT`) are added or adjusted, and every other line and comment is kept.
2. For each port it starts at the default (or the value already in `.env`) and picks the first port that is free on this machine, scanning upward. A port counts as busy if anything, Docker or a native process, accepts a TCP connection on 127.0.0.1 (the PowerShell launcher also tries to bind it). Ports already picked in the same run are skipped.
3. If this project's stack is already running it leaves the ports alone and does not rebuild (rebuild with `./run.sh up --build -d`). If it is stopped, the ports in `.env` are re-checked and only busy ones are reassigned, so starting a second and third project back to back just works.
4. Runs `docker compose up --build -d` and prints the URLs using the ports it chose, for example `EZPoll client: http://localhost:8081`.

Any arguments are passed straight to `docker compose` after the `.env` step, for example `./run.sh down`, `./run.sh logs -f` or `.\run.ps1 ps`.

The browser-visible origins follow the chosen ports. The client reaches the socket server at `PUBLIC_SOCKET_URL` (also the CSP `connect-src`), and the API and socket server only accept the origins in `ALLOWED_ORIGINS`. `docker-compose.yml` derives both from `SOCKET_PORT` and `CLIENT_PORT` (for example `http://localhost:${SOCKET_PORT:-3000}`), so when the launcher moves a port the CORS, websocket origin check and CSP move with it. Nothing is loosened: there is no wildcard origin. If you set `ALLOWED_ORIGINS` or `PUBLIC_SOCKET_URL` in `.env` yourself they win, so keep them consistent with the ports (the launcher prints a reminder).

Plain `docker compose up --build` still works exactly as before with the 8080 defaults (fine for a single project). `docker compose` has no pre-run hook, so only the launcher generates `.env`.

To pin ports by hand, edit `.env` (see `.env.example`). To start over, run `./run.sh down` and delete `.env`; the next launcher run picks ports again. The launcher needs `docker compose` v2 and, on macOS and Linux, bash; it uses only POSIX tools (`sed`, `awk`, `grep`).

## Configuration (environment variables)

Set these in a `.env` file next to `docker-compose.yml` (see `.env.example`).

| Variable | Default (dev only) | Purpose |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | dev value | MySQL root password. Root is only reachable inside the MySQL container. |
| `EZPOLL_DB_USER` / `EZPOLL_DB_PASSWORD` | `ezpoll_app` / dev value | Least-privilege user the API connects as: SELECT, INSERT, UPDATE, DELETE on the `EZPoll` schema only. Also the account for phpMyAdmin. |
| `INTERNAL_API_SECRET` | dev value | Shared secret the socket server sends to the API. The API refuses to start without one. |
| `ALLOWED_ORIGINS` | `http://localhost:${CLIENT_PORT},http://127.0.0.1:${CLIENT_PORT}` (8080 by default) | Comma separated client origins allowed by CORS on the API and socket server (and by the socket server's websocket Origin check). |
| `PUBLIC_SOCKET_URL` | `http://localhost:${SOCKET_PORT}` (3000 by default) | Browser-facing socket server origin. Written to the client `config.json` and used in the CSP `connect-src`. Both origin variables follow the ports unless you set them explicitly. |
| `CLIENT_PORT`, `SOCKET_PORT`, `API_PORT`, `MYSQL_PORT`, `PHPMYADMIN_PORT` | 8080, 3000, 5000, 3307, 8083 | Host ports. |

Generate real secrets with e.g. `openssl rand -hex 32`. The passwords are inserted into SQL by `db/initializeDB.sh` at first start, so changing them later requires `docker compose down -v` (or altering the user manually).

## Answer and question order

The order of questions and answers comes from the `SortOrder` column on the `Question` and `Answer` tables (set in `db/scripts/dml.sql`), never from GUID values. Every query that feeds the UI uses `ORDER BY SortOrder`. Databases created before this column existed do not have it: run `docker compose down -v` to drop the volume and re-seed.

## Security notes

- The browser only talks to the client (nginx) and the socket server. The Python API is internal, authenticated with `INTERNAL_API_SECRET`, and bound to loopback on the host.
- All SQL uses bound parameters; identifiers are checked against a strict pattern. All GUIDs from clients are validated with a strict UUID pattern, request bodies are validated (type, required fields), and errors are consistent JSON without stack traces. The API runs under gunicorn, never Flask debug mode.
- A socket is bound to a single user GUID; the host-only actions (next question, reveal) are checked server-side against the session's `HostGUID`. Answers must belong to the session's current question.
- GUIDs are bearer secrets: anyone who has a session GUID can join that session (that is the invite link), and anyone who has a user GUID can act as that user. There are no accounts.
- Basic abuse limits live in the socket server (per-socket event rate, per-address limits on creating users and sessions). They are in memory and per process; a reverse proxy rate limit is the proper next step if this is exposed publicly.
- Containers: client (nginx-unprivileged), socket server (`node`) and API (uid 10001) run as non-root with `no-new-privileges` and all capabilities dropped. MySQL runs `mysqld` as the `mysql` user. phpMyAdmin (Apache) is not run as non-root.
- `.env` is git ignored. Never commit real secrets.

## Development

- `ezpollclient/`: `npm install`, `npm run dev` (see its README).
- `ezpollsocketserver/`: `npm install`, `npm start` (set `INTERNAL_API_SECRET`, `API_URL`, `ALLOWED_ORIGINS`).
- `server/`: `pip install -r requirements.txt`, then run `gunicorn api:app` with the `DB_*` and `INTERNAL_API_SECRET` variables set.

## End-to-end tests (Playwright)

The `e2e/` folder is a standalone TypeScript Playwright suite with its own `package.json` and lockfile. It drives the running stack in real Chromium browsers (a host and participants in separate browser contexts) and also checks the client headers, the API and the socket server over plain HTTP and socket.io. It is not part of any Docker image.

Start the stack first (`./run.sh` or `.\run.ps1`), then run the suite. Ports are read from the git ignored `.env` that the launcher writes, so the launcher chosen ports work without any extra setup.

Git Bash:

```bash
cd e2e
npm ci
npx playwright install chromium
npm test                       # everything
npm run test:smoke             # only tests tagged @smoke
npx playwright test --grep @security
npm run test:headed            # watch the browsers
npm run report                 # open the last HTML report
```

PowerShell:

```powershell
cd e2e
npm ci
npx playwright install chromium
npm test
npm run test:smoke
npx playwright test --grep "@a11y"
npm run test:headed
npm run report
```

Other useful runs: `npx playwright test --workers=1` (serial), `npx playwright test tests/poll-flow.spec.ts` (one file), `npm run typecheck`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:$CLIENT_PORT` | Client origin. Must be one of the API and socket server allowed origins. |
| `SOCKET_URL` | `http://localhost:$SOCKET_PORT` | Socket server origin (also what the CSP `connect-src` must contain). |
| `API_URL` | `http://127.0.0.1:$API_PORT` | Python API, used directly for setup and the security tests. |
| `INTERNAL_API_SECRET` | value in `.env`, else the development default from `docker-compose.yml` | Sent as `X-Internal-Secret` to the API. |
| `CI` | unset | When set, failed tests are retried once. Local runs never retry. |

Tags: `@smoke` (fast core checks), `@security`, `@a11y`, `@responsive`. Every test creates its own users and sessions with random GUIDs and never assumes an empty database, so files and tests run in parallel and in any order.

Notes for people extending the suite:

- The socket server limits creating users and sessions to 20 per minute per address, and all browser contexts share one address. Most tests therefore create users and sessions through the API and only seed them into `sessionStorage`; tests that make the app create them through the UI reserve a slot first (`e2e/support/rateBudget.ts`), which is coordinated across workers.
- `a nested unknown path ends on /home` is marked `test.fail()` because of a known bug (see the pull request): `config.json` is fetched with a relative URL, so a path with two or more segments never mounts the app. The test turns red once that is fixed, which is the cue to remove `test.fail()`.
- The accessibility scan (`@axe-core/playwright`) fails only on critical violations and attaches everything else it finds to the test report.

### Running the e2e tests in Docker

Nothing but Docker is needed: the official Playwright image already contains Node and the browsers, so there is no `npm ci` or `npx playwright install` on the host. The image tag has to match the `@playwright/test` version in `e2e/package.json` (currently 1.63.0). Start the stack first (`./run.sh` or `.\run.ps1`).

The whole repository is mounted so the suite can read the launcher's `.env` (ports and the internal secret), which means no URLs need to be passed. The named volume keeps the container's Linux `node_modules` apart from any `node_modules` on the host.

PowerShell:

```powershell
docker run --rm --ipc=host --network host -v "${PWD}:/repo" -v ezpoll-e2e-node-modules:/repo/e2e/node_modules -w /repo/e2e mcr.microsoft.com/playwright:v1.63.0-noble sh -c "npm ci && npx playwright test"
```

Git Bash (`MSYS_NO_PATHCONV=1` stops Git Bash from rewriting the `/repo` paths into Windows paths):

```bash
MSYS_NO_PATHCONV=1 docker run --rm --ipc=host --network host -v "$PWD:/repo" -v ezpoll-e2e-node-modules:/repo/e2e/node_modules -w /repo/e2e mcr.microsoft.com/playwright:v1.63.0-noble sh -c "npm ci && npx playwright test"
```

macOS and Linux: the Git Bash command without `MSYS_NO_PATHCONV=1`.

- `--network host` is required here, not optional. The client, API and socket server only accept the stack's `localhost` origins (`ALLOWED_ORIGINS`, and the CSP `connect-src` names `localhost` and the socket port), so the browser in the container has to see the stack as `localhost`. Linux supports host networking out of the box. Docker Desktop needs "Enable host networking" (Settings, Resources, Network, Docker Desktop 4.34 or newer).
- Without host networking the run fails at start-up: the socket server answers the `host.docker.internal` origin with a 403.
- Add Playwright arguments after `npx playwright test`, for example `--grep @smoke`, `--workers=1` or `tests/poll-flow.spec.ts`. To override a setting from the table above, add `-e NAME=value` (for example `-e BASE_URL=http://localhost:8083`).
- Results are written to `e2e/test-results` and `e2e/playwright-report/index.html` in the repository (open the HTML file in a browser). On Linux those files are owned by root.
- Verified on Windows with Docker Desktop 4.41: all 149 tests pass in the container. macOS and Linux were not tested.
