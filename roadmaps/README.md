# Platform-Engineering-to-AI-Engineering

## AI Engineering Roadmap

A beginner-to-advanced roadmap for building AI applications and running the models behind them, with progress tracking. The app lives in `roadmap/web` and is deployed to Cloudflare Pages; progress is stored in D1 through the Pages Function in `functions/api/state.js`.

- `roadmap/web/data/*.js` — the roadmap content, one file per stage. Edit these to change the roadmap.
- `roadmap/web/app.js`, `styles.css`, `index.html` — the app. Plain JavaScript, no libraries, no build step.
- `roadmap/server.py` — local preview server (Python standard library only).
- `JDs/` — job postings the roadmap is checked against. `JDs/2026-10/SKILLS-MATRIX.md` maps skills to modules.
- `roadmap-tracker/` — the original 30-day roadmaps, no longer deployed.

### Preview locally

```bash
python3 roadmap/server.py        # http://localhost:8090, progress in roadmap/state.db
```

Or, with Node installed, `npm run dev` runs the real Pages Function against a local D1 database.

### Deploy

```bash
npm run deploy
```

This uploads `roadmap/web` and the functions to the `roadmap-tracker` Pages project. The D1 database and its schema already exist; `npm run d1:create` and `npm run d1:migrate:remote` are only needed when setting up a new Cloudflare account.
