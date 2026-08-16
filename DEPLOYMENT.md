# Deploying TeamFlow (Render + Supabase)

TeamFlow is a single Node process: Express serves `/api/*` and the built React
app from `dist/`. Data lives in **Supabase Postgres** via Prisma (not SQLite).

Live example: `https://asana-clone-1.onrender.com`

## 1. Push the code to GitHub

Deploy from the repo root (the folder with `package.json`). Confirm `.env` is
**not** committed (it is in `.gitignore`).

## 2. Supabase database

1. Create a Supabase project.
2. Open **Project → Connect** and copy the **pooler** connection strings.
3. Use:
   - **Transaction** pooler (port `6543`) as `DATABASE_URL` — append `?pgbouncer=true`
   - **Session** pooler (port `5432`) as `DIRECT_URL` (Prisma migrations)

Local `.env` should match `.env.example`. Never commit real passwords.

On first deploy, `npm start` runs `prisma migrate deploy`, which creates tables
in the empty Postgres database.

## 3. Render Web Service

1. **New → Web Service** → connect `BIRUHALEMAYEHU/asana-clone` (or your fork).
2. Settings:

| Field | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main` |
| Build Command | `npm install --include=dev; npm run build` |
| Start Command | `npm start` |
| Instance | Free (or paid) |

`--include=dev` is required so Vite/TypeScript install under `NODE_ENV=production`.

3. Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler URL (`…:6543/postgres?pgbouncer=true`) |
| `DIRECT_URL` | Supabase session pooler URL (`…:5432/postgres`) |
| `JWT_SECRET` | Long random string (required) |
| `FRONTEND_URL` | `https://<your-service>.onrender.com` (no trailing slash) |
| `NODE_ENV` | `production` |
| `PORT` | Leave unset (Render injects it) |

Remove any old SQLite value like `file:./dev.db`. You do **not** need a Render
disk volume for Postgres.

Optional SMTP vars (`SMTP_HOST`, etc.) — without them, invites still create a
link; email may use Ethereal preview only.

4. After the first green deploy, set `FRONTEND_URL` if you had not yet, then
   redeploy once.

## 4. What happens on each deploy

1. **Build** — install (with devDeps), `prisma generate`, `tsc`, `vite build`
2. **Start** — `prisma migrate deploy`, then `tsx server/index.ts`
3. Express serves API + `dist/`

## 5. After switching from SQLite

Production data on Render’s old SQLite file is **not** migrated automatically.
After pointing at Supabase you get an empty DB: sign up once as Super Admin.

`WIPE_DB` only targeted the old SQLite file path; ignore it on Postgres. To reset
data, use the Supabase SQL editor / Table Editor.

## 6. Common issues

- **Build fails on `@types/node` / `vite`** — Build Command missing `--include=dev`
- **Migrate fails** — `DIRECT_URL` missing or wrong; password special chars need URL-encoding
- **Cold start** — free Render sleeps after idle; first request can take ~30–60s
- **Invite links wrong** — `FRONTEND_URL` must be the public `.onrender.com` URL
