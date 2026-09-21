import fs from 'fs';
import path from 'path';

// Values come from the process environment first, then the repo's git-ignored
// .env written by run.sh / run.ps1 (which holds the launcher-chosen ports),
// then the defaults from docker-compose.yml.
function readDotEnv(): Record<string, string> {
  const file = path.resolve(__dirname, '..', '..', '.env');
  const values: Record<string, string> = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !line.trim().startsWith('#')) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const dotEnv = readDotEnv();
const setting = (name: string, fallback: string): string =>
  process.env[name] || dotEnv[name] || fallback;

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const config = {
  baseUrl: trimSlash(process.env.BASE_URL || `http://localhost:${setting('CLIENT_PORT', '8080')}`),
  socketUrl: trimSlash(process.env.SOCKET_URL || `http://localhost:${setting('SOCKET_PORT', '3000')}`),
  apiUrl: trimSlash(process.env.API_URL || `http://127.0.0.1:${setting('API_PORT', '5000')}`),
  // Development default from docker-compose.yml when nothing is configured.
  internalSecret: setting('INTERNAL_API_SECRET', 'dev-only-internal-secret-change-me'),
};

export const origin = (url: string) => new URL(url).origin;
