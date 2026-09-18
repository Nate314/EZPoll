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
.un.ps1         # Windows PowerShell
```

What it does:

1. If no `.env` exists it creates one (with a header comment saying it was generated). An existing `.env` is never overwritten: only the port variables (`CLIENT_PORT`, `SOCKET_PORT`, `API_PORT`, `MYSQL_PORT`, `PHPMYADMIN_PORT`) are added or adjusted, and every other line and comment is kept.
2. For each port it starts at the default (or the value already in `.env`) and picks the first port that is free on this machine, scanning upward. A port counts as busy if anything, Docker or a native process, accepts a TCP connection on 127.0.0.1 (the PowerShell launcher also tries to bind it). Ports already picked in the same run are skipped.
3. If this project's stack is already running it leaves the ports alone and does not rebuild (rebuild with `./run.sh up --build -d`). If it is stopped, the ports in `.env` are re-checked and only busy ones are reassigned, so starting a second and third project back to back just works.
4. Runs `docker compose up --build -d` and prints the URLs using the ports it chose, for example `EZPoll client: http://localhost:8081`.

Any arguments are passed straight to `docker compose` after the `.env` step, for example `./run.sh down`, `./run.sh logs -f` or `.un.ps1 ps`.

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
