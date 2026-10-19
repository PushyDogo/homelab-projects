# Projects

Monorepo for my personal projects. Each top-level directory is a self-contained project with its own tooling and README.

| Project | Description |
|---|---|
| [finance-tracker](finance-tracker/) | Personal finance tracker (Python): SMS transaction parsing, budgets, investments, net worth UI |
| [roadmaps](roadmaps/) | Platform Engineering → AI Engineering learning roadmap and progress tracker (Cloudflare Pages + D1) |

## Conventions

- One directory per project; no cross-project imports.
- Commit messages are scoped by project, e.g. `feat(finance-tracker): ...`, `fix(roadmaps): ...`.
- Never commit secrets. `.env`, `.dev.vars` and similar files are ignored repo-wide.
