# Ficio Programs

Task management dashboard for the Ficio team. Built with Next.js + Supabase.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project" → Import your repo
3. Click "Deploy" (no config needed — Vercel auto-detects Next.js)
4. Share the URL with your team

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database

Using Supabase with two tables:
- `tasks` — main tasks + subtasks (via `parent_id`)
- `updates` — progress comments per task
