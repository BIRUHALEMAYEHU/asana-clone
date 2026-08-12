// Production entrypoint (`npm start`). Kept in Node rather than inline shell so
// the same script runs under cmd.exe on Windows and /bin/sh on Railway.
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

// Railway mounts its volume at /data, and SQLite will not create a missing
// directory for itself. Derive the directory from DATABASE_URL so the mount
// point exists before `prisma db push` runs.
const ensureDatabaseDir = () => {
  if (process.platform === 'win32') return;

  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return;

  const filePath = url.slice('file:'.length);
  if (!path.isAbsolute(filePath)) return;

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

ensureDatabaseDir();
run('prisma', ['db', 'push'])
  .then(startServer)
  .catch(error => {
    console.error(`[start] ${error.message}`);
    process.exit(1);
  });
