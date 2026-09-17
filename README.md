
# EZPoll

Website to make live polls easy

## Running with Docker

No local Node/npm/Python/MySQL install required. From the repo root:

```shell
docker compose up --build
```

This builds and starts four services:

| Service | URL | Notes |
|---|---|---|
| `client` (Vue app) | http://localhost:8080 | built with `node:18-alpine`, served via nginx |
| `socket-server` | http://localhost:3000 | Socket.io server |
| `python-api` | http://localhost:5000 | Flask/Python API, backed by MySQL |
| `mysql-db` | localhost:3307 | MySQL 8, only exposed on 3307 to avoid clashing with a local MySQL on the default 3306; other services reach it internally at `mysql-db:3306` |

Wait for all four containers to report healthy/running (`docker compose logs -f` to watch), then open `http://localhost:8080`. Stop everything with `docker compose down` (add `-v` to also drop the MySQL data volume).
