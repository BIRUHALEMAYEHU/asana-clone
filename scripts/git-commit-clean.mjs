import { execFileSync } from 'node:child_process';
import path from 'node:path';

const git = 'C:\\Program Files\\Git\\cmd\\git.exe';
const repo = path.resolve('.');
const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error('Usage: node scripts/git-commit-clean.mjs <file>...  (set GIT_COMMIT_MSG)');
  process.exit(1);
}

const msgFile = process.env.GIT_COMMIT_MSG_FILE;
if (!msgFile) {
  console.error('Set GIT_COMMIT_MSG_FILE to a message file path before running this script.');
  process.exit(1);
}

const run = (args) => execFileSync(git, args, { cwd: repo, encoding: 'utf8' }).trim();

for (const p of paths) run(['add', p]);

const tree = run(['write-tree']);
const parent = run(['rev-parse', 'HEAD']);
const commit = run(['commit-tree', tree, '-p', parent, '-F', msgFile]);
run(['reset', '--hard', commit]);

const body = run(['log', '-1', '--format=%B']);
console.log('Committed:', commit);
console.log(body);
if (/co-authored-by:\s*cursor/i.test(body)) process.exit(1);
