# Vercel Deployment — SourceForge Landing Page

## Project

| Key | Value |
|-----|-------|
| **Project Name** | `source-forge` |
| **Team** | `radiance-s-projects1` |
| **Framework** | Next.js 16 (auto-detected) |
| **Root Directory** | `landing/` |
| **Production URL** | `https://landing-gules-eight-11.vercel.app` |

## Deploy

```bash
cd landing
vercel --prod --scope radiance-s-projects1
```

Environment: `VERCEL_TOKEN` in `.env.local` at project root.

## Manual step after first deploy

Disable Deployment Protection:
[Vercel Dashboard → source-forge → Settings → Deployment Protection](https://vercel.com/radiance-s-projects1/source-forge/settings)
→ Set "Vercel Authentication" to **Disabled**

## GitHub Integration (optional)

Connect the repo at `github.com/trac41799/agent-control-center` to auto-deploy on push:
1. Vercel Dashboard → source-forge → Settings → Git
2. Connect `trac41799/agent-control-center`
3. Set Root Directory to `landing`
4. Framework: Next.js (auto-detected)
