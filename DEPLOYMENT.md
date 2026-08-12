# Deploying TeamFlow to Railway

TeamFlow is a single Node process: Express serves the `/api/*` routes **and** the
built React frontend from `dist/`. Data lives in a SQLite file managed by Prisma.
That means you need a host that runs a long-lived Node server with a writable
disk — Railway's free tier works well.

## 1. Push the code to GitHub

Railway deploys from a GitHub repository. The project root (the folder containing
`package.json`) must be the repository root, or you must set Railway's **Root
Directory** to that subfolder.

Before pushing, confirm `.env` is not part of the commit — it is now listed in
`.gitignore`. If `git status` still shows `.env`, it was committed earlier and you
must untrack it and rotate `JWT_SECRET`:

```bash
git rm --cached .env
git commit -m "Stop tracking .env"
```

## 2. Create the Railway project

1. Railway dashboard → **New Project** → **Deploy from GitHub repo**.
2. Pick the repository and let Railway detect the Node app.
3. Railway reads `railway.json`, which pins the builder to Nixpacks, the build
   command to `npm run build`, and the start command to `npm start`.
4. Under **Settings → Networking**, click **Generate Domain**. Copy that URL —
   you need it for `FRONTEND_URL`.

## 3. Attach a volume for the database

Without this, the SQLite file is wiped on every deploy, because each deploy
replaces the application directory.

1. Project canvas → your service → **Variables/Settings → Volumes → New Volume**.
2. Set the **mount path** to `/data`.
3. Set `DATABASE_URL=file:/data/dev.db` (see the next step).

`npm start` runs `scripts/start.mjs`, which creates the directory named in
`DATABASE_URL` before `prisma db push` runs, so `/data` exists even before the
volume is populated. Two notes:

- The script is plain Node rather than a shell one-liner, so the same
  `npm start` works on Windows and on the Linux host. For local development you
  still normally want `npm run dev` (Vite) plus your server command.
- Keep `DATABASE_URL=file:./dev.db` locally — that is what `.env.example` ships.
  The directory step is skipped on Windows and for relative paths.

## 4. Set the environment variables

Railway → service → **Variables**. Copy the names from `.env.example`:

| Variable | Value on Railway | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:/data/dev.db` | Must point inside the mounted volume. |
| `JWT_SECRET` | long random string | **Required.** Signs login and invitation tokens. |
| `FRONTEND_URL` | `https://<your-app>.up.railway.app` | **Required.** Used to build invitation links. |
| `NODE_ENV` | `production` | npm turns this into `omit=dev`, so everything `npm start` needs (`prisma`, `tsx`) is a regular dependency. |
| `PORT` | *(leave unset)* | Railway injects it; the server reads `process.env.PORT`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | your mail provider | Optional. |

Two of these bite people:

- **`JWT_SECRET`** falls back to a hardcoded `'fallback-secret-key'` in the code
  if unset, which lets anyone forge a login token. Generate a real one:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **`FRONTEND_URL`** is the base of every invitation link
  (`<FRONTEND_URL>/#/signup?...`). If it points at `localhost`, invited users get
  a dead link.

If `SMTP_HOST` is unset the server falls back to Ethereal, a fake SMTP service:
invitations are created and a preview URL is logged, but no real email is sent.
Set the SMTP variables once you have a mail provider.

## 5. What happens on each deploy

1. **Build** — Nixpacks installs OpenSSL and `pkg-config` (from `nixpacks.toml`,
   which Prisma needs), runs `npm ci`, then `npm run build`:
   `prisma generate` → `tsc -b` → `vite build`, producing `dist/`.
   `nixpacks.toml` also sets `NPM_CONFIG_PRODUCTION=false`, which is what keeps
   the build-only tools (`vite`, `typescript`) installed despite
   `NODE_ENV=production`.
2. **Start** — `npm start` creates `/data`, runs `prisma db push` to sync the
   schema to the SQLite file, then boots Express with `tsx server/index.ts`.
3. Express serves `/api/*` and everything else falls through to
   `dist/index.html`, so the HashRouter frontend and the API share one domain and
   one origin (no CORS setup needed).

Check `https://<your-app>.up.railway.app/api/health` — it should return
`{"status":"ok"}`.

## 6. Schema changes: `db push` now, `migrate deploy` later

`npm start` currently runs `prisma db push`. That is fine for a prototype but is
not how you want to run production:

- `db push` diffs the live database against `schema.prisma` and mutates it. There
  is no history, no review, and no way to roll back.
- If a change is not automatically applicable (a new required column, a narrowed
  type), `db push` stops and asks — and in a container it just fails the boot.
  The old script hid this with `--accept-data-loss`, which **silently deleted
  data**. That flag has been removed.

Switch to migrations as soon as the schema settles:

1. Locally, with the schema final: `npx prisma migrate dev --name init`. This
   creates `prisma/migrations/<timestamp>_init/migration.sql`.
2. Commit the `prisma/migrations/` folder. It is the source of truth.
3. Change the `start` script to use `prisma migrate deploy` instead of
   `prisma db push`. `migrate deploy` only applies committed migration files, never
   invents changes, and never drops data.
4. For every later schema edit, run `prisma migrate dev` locally and commit the
   generated migration.

Migrations were deliberately **not** generated yet, because `schema.prisma` is
still being edited; a migration created now would be stale immediately.

## 7. Why Vercel alone cannot host this app

Vercel is great for the React half and useless for this backend as written:

- **Serverless functions, not a server.** `server/index.ts` calls
  `app.listen(...)` and expects a process that stays alive. Vercel invokes a
  handler per request and freezes it afterwards.
- **Read-only filesystem.** SQLite needs to write to a file. On Vercel only
  `/tmp` is writable, it is per-instance, and it disappears — every deploy and
  most cold starts would reset your data.
- **No volumes.** There is no equivalent of the `/data` mount.

To use Vercel you would have to: move the database to a hosted Postgres (Neon,
Supabase, Railway Postgres) and change the Prisma datasource provider; convert
the Express app into Vercel serverless functions (or keep Express on a Node host
and deploy only the frontend to Vercel); and if the API lives on another domain,
give the frontend an absolute API base URL and enable CORS for it.

Sticking with one Railway service is simpler and is what this repo is configured
for.

## Troubleshooting

- **Data disappeared after a deploy** — the volume is missing or `DATABASE_URL`
  does not start with `file:/data/`.
- **Build fails on Prisma** — confirm `prisma` and `@prisma/client` are on the
  same major version in `package.json`. Scripts call the locally installed
  `prisma` binary (not `npx prisma`) precisely so the build cannot pick up a
  different major version.
- **`sh: tsx: not found` or `prisma: not found` at startup** — the install ran
  without devDependencies *and* a runtime tool slipped back into
  `devDependencies`. `prisma` and `tsx` must stay in `dependencies`, because
  `npm start` runs them after the build.
- **Invitation links point to localhost** — `FRONTEND_URL` is wrong.
- **Blank page but `/api/health` works** — `dist/` was not built; check the build
  logs for the `vite build` step.
