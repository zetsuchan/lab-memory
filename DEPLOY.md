# Lab Memory — deploy to GitHub + Vercel

Stack: **Next.js 16 · React 19 · Vercel AI SDK 7 · Anthropic (Claude)**.
Storage: **local file store** in dev (`.data/`), **Vercel Postgres (Neon)** in prod.

## 0. Prerequisites
- A GitHub account and the `gh` CLI (`brew install gh && gh auth login`), or use github.com.
- A Vercel account (vercel.com) — free Hobby tier is fine.
- Your Anthropic API key with credit (console.anthropic.com). **Rotate the key that was
  shared in chat.**

## 1. Create the GitHub repo
From this `web/` directory:

```bash
cd "web"
git init
git add -A
git commit -m "Lab Memory: Next.js + Claude"
# with gh CLI:
gh repo create lab-memory --private --source=. --push
# …or manually: create an empty repo on github.com, then:
#   git remote add origin https://github.com/<you>/lab-memory.git
#   git branch -M main && git push -u origin main
```

`.gitignore` already excludes `.env.local`, `node_modules`, `.next`, and `.data` — your key
and secrets will **not** be committed.

## 2. Import into Vercel
1. Go to **vercel.com/new** → import the `lab-memory` repo. Vercel auto-detects Next.js
   (build `next build`, output handled automatically). No config needed.
2. Don't deploy yet — set up storage + env first (below), or deploy once and redeploy after.

## 3. Add the database (Vercel Postgres / Neon)
1. In the project → **Storage** tab → **Create Database** → **Postgres (Neon)** → create it
   in the same region as your functions.
2. Vercel automatically injects `POSTGRES_URL` (and friends) into the project's env vars.
   The app auto-switches to the Postgres backend whenever `POSTGRES_URL` is present and
   creates its `sessions` table on first use — no migration step needed.

## 4. Add the API key
Project → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (your rotated key) | Production, Preview, Development |
| `LLM_MODEL` | `claude-sonnet-5` (optional; this is the default) | all |

## 5. Deploy
Push to `main` (or click **Deploy**). Vercel builds and deploys. Every push = a new
deployment; PRs get preview URLs.

- **Fluid Compute** is on by default — efficient for the I/O-bound Claude calls.
- `maxDuration = 60` is set on the `ask` route so long reasoning calls don't time out.

## Local development
```bash
cp .env.example .env.local     # then paste your ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3000   (use localhost, not 127.0.0.1)
```
Without `POSTGRES_URL`, sessions persist to `.data/` on disk. To test the Postgres path
locally, pull the prod env: `vercel env pull .env.local`.

## Notes
- Uploaded files are stored inside the session record (these corpora are small). For very
  large files, switch file bodies to **Vercel Blob** (`@vercel/blob`) and store only the
  Blob URL in the session — the ingestion layer is already isolated in `lib/ingest.ts`.
