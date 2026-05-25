# 📝 AI Commit Writer

Paste a git diff. Get 3 clean conventional commit messages in 2 seconds. Powered by **Xiaomi MiMo**.

**Live demo:** https://ai-commit-writer.vercel.app

![Powered by MiMo](https://img.shields.io/badge/Powered%20by-Xiaomi%20MiMo-58a6ff)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## What it does

Stop typing "update stuff." Paste your `git diff --staged` output → MiMo reads the change → outputs 3 ranked **conventional commit** candidates (feat / fix / docs / refactor / perf / etc.).

- 🎯 **Spec-compliant**: follows Conventional Commits 1.0.0 — type, scope, imperative subject, optional body
- ⚡ **3 candidates**: ranked best to worst, pick what fits, copy in one click
- 🔒 **No login**: no signup, no telemetry, diff never stored
- 🧠 **Context-aware**: detects feat vs fix vs refactor from actual diff content

## How it works

```
git diff → AI Commit Writer
              ↓
         MiMo (system prompt: conventional commits expert)
              ↓
       3 ranked candidates
              ↓
        Copy → git commit
```

1. Paste a unified diff
2. Pick style (short / normal / verbose) and optional scope
3. Click Generate → MiMo returns 3 candidates
4. Copy raw message OR copy as `git commit -m "..."` ready-to-paste command

## Tech stack

- **Frontend**: vanilla HTML/CSS/JS (no framework, instant load)
- **Backend**: Vercel serverless function (Node.js 20, native fetch)
- **AI**: Xiaomi MiMo `mimo-chat`
- **Zero dependencies**: native fetch, no axios, no node_modules to install

## Local dev

```bash
git clone https://github.com/aphoneshimada-cpu/ai-commit-writer
cd ai-commit-writer
cp .env.example .env
# Fill MIMO_API_KEY in .env
vercel dev
```

Open `http://localhost:3000`.

## Endpoints

### `GET /api/health`
Health check.
```json
{ "status": "ok", "service": "ai-commit-writer", "powered_by": "Xiaomi MiMo" }
```

### `POST /api/commit`
Generate commit messages.

**Request:**
```bash
curl -X POST https://ai-commit-writer.vercel.app/api/commit \
  -H 'Content-Type: application/json' \
  -d '{
    "diff": "diff --git a/src/auth.js b/src/auth.js\n@@ -1,3 +1,5 @@\n+if (!user) throw new Error(\"required\");\n function login(user) {",
    "style": "normal",
    "scope": "auth"
  }'
```

**Response:**
```json
{
  "candidates": [
    "fix(auth): validate user before login query",
    "feat(auth): add input validation to login",
    "refactor(auth): guard against missing user input"
  ],
  "mode": "mimo",
  "powered_by": "Xiaomi MiMo"
}
```

**Params:**
- `diff` (required, string, 10-12000 chars) — unified diff
- `style` (optional) — `short` | `normal` | `verbose` (default: `normal`)
- `scope` (optional) — alphanumeric, max 30 chars

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aphoneshimada-cpu/ai-commit-writer)

Set env vars in Vercel dashboard:
- `MIMO_API_KEY` — your Xiaomi MiMo API key
- `MIMO_API_URL` — `https://api.xiaomimimo.com`

## License

MIT — fork it, ship better commits.

## Credits

Built by [@aphoneshimada-cpu](https://github.com/aphoneshimada-cpu) for the [Xiaomi MiMo 100T](https://100t.xiaomimimo.com) program.
