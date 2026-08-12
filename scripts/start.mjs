// Production entrypoint (`npm start`). Kept in Node rather than inline shell so
// the same script runs under cmd.exe on Windows and /bin/sh on Railway/Render.
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const resolveSqlitePath = () => {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return null;
  const filePath = url.slice('file:'.length);
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
};

// Set WIPE_DB=true once in the host's env vars to delete the SQLite file on boot,
// then remove that variable after a successful restart so data is not wiped again.
const wipeDatabaseIfRequested = () => {
  if (process.env.WIPE_DB !== 'true') return;

  const filePath = resolveSqlitePath();
  if (!filePath) {
    console.warn('[start] WIPE_DB=true but DATABASE_URL is not a file: SQLite path — nothing deleted');
    return;
  }

  for (const candidate of [filePath, `${filePath}-journal`, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) {
      unlinkSync(candidate);
      console.log(`[start] WIPE_DB=true — deleted ${candidate}`);
    }
  }
};

// Railway/Render may mount a volume; SQLite will not create a missing directory.
const ensureDatabaseDir = () => {
  if (process.platform === 'win32') return;

  const filePath = resolveSqlitePath();
  if (!filePath || !path.isAbsolute(filePath)) return;

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
  } catch (error) {
    console.warn(`[start] could not create database directory: ${error.message}`);
  }
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    // shell:true so npm's node_modules/.bin PATH injection resolves the
    // .cmd shims on Windows as well as the symlinks on Linux.
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) return reject(new Error(`${command} terminated with ${signal}`));
      if (code !== 0) return reject(new Error(`${command} exited with code ${code}`));
      resolve();
    });
  });

const startServer = () => {
  const child = spawn('tsx', ['server/index.ts'], { stdio: 'inherit', shell: true });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('exit', code => process.exit(code ?? 1));
};

wipeDatabaseIfRequested();
ensureDatabaseDir();
run('prisma', ['db', 'push'])
  .then(startServer)
  .catch(error => {
    console.error(`[start] ${error.message}`);
    process.exit(1);
  });
