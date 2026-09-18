# EZPoll

Website to make live polls easy

## Running with Docker

No local Node/npm/Python/MySQL install required. From the repo root:

```shell
docker compose up --build
```

This works from a fresh clone with no configuration: every setting has a development default in `docker-compose.yml`. Before exposing it anywhere real, copy `.env.example` to `.env` and change the secrets.

| Service | URL | Notes |
|---|---|---|
| `client` (Vue 3 + Vite app) | http://localhost:8080 | built with `node:22-alpine`, served by unprivileged nginx with a CSP and security headers |
| `socket-server` | http://localhost:3000 | Socket.io 4 server, the only thing the browser talks to besides the client |
| `python-api` | http://127.0.0.1:5000 | Flask API behind gunicorn, internal: requires the `X-Internal-Secret` header |
| `mysql-db` | 127.0.0.1:3307 | MySQL 8.4, loopback only (3307 avoids clashing with a local MySQL on 3306) |
| `phpmyadmin` | http://127.0.0.1:8083 | login required, loopback only |

Wait for the containers to report healthy (`docker compose logs -f`), then open `http://localhost:8080`. Stop with `docker compose down` (add `-v` to also drop the MySQL data volume; the schema and users are only created on first start of an empty volume).

## Configuration (environment variables)

Set these in a `.env` file next to `docker-compose.yml` (see `.env.example`).

| Variable | Default (dev only) | Purpose |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | dev value | MySQL root password. Root is only reachable inside the MySQL container. |
| `EZPOLL_DB_USER` / `EZPOLL_DB_PASSWORD` | `ezpoll_app` / dev value | Least-privilege user the API connects as: SELECT, INSERT, UPDATE, DELETE on the `EZPoll` schema only. Also the account for phpMyAdmin. |
| `INTERNAL_API_SECRET` | dev value | Shared secret the socket server sends to the API. The API refuses to start without one. |
| `ALLOWED_ORIGINS` | `http://localhost:8080,http://127.0.0.1:8080` | Comma separated client origins allowed by CORS on the API and socket server (and by the socket server's websocket Origin check). |
| `PUBLIC_SOCKET_URL` | `http://localhost:3000` | Browser-facing socket server origin. Written to the client `config.json` and used in the CSP `connect-src`. |
| `CLIENT_PORT`, `SOCKET_PORT`, `API_PORT`, `MYSQL_PORT`, `PHPMYADMIN_PORT` | 8080, 3000, 5000, 3307, 8083 | Host ports. |

Generate real secrets with e.g. `openssl rand -hex 32`. The passwords are inserted into SQL by `db/initializeDB.sh` at first start, so changing them later requires `docker compose down -v` (or altering the user manually).

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
