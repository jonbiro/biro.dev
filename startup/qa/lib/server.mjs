import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BASE_URL, DIST, PORT } from './config.mjs';

export const SERVE_SCRIPT = fileURLToPath(new URL('./serve.py', import.meta.url));

async function responds(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

// Serves DIST on 127.0.0.1:PORT and resolves to a stop function.
export async function startServer() {
  if (await responds(`${BASE_URL}/`)) {
    throw new Error(`Something is already serving ${BASE_URL}. Stop it or set QA_PORT so the toolkit cannot snapshot the wrong build.`);
  }
  const server = spawn('python3', [SERVE_SCRIPT, String(PORT), DIST], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await responds(`${BASE_URL}/`)) return () => server.kill();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill();
  throw new Error(`Static server did not start on ${BASE_URL}`);
}
