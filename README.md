# LibraryCraft

Home library SaaS by Aakasa Digital: scan ISBNs to catalogue books, manage shelves, and track lending. Live at librarycraft.aakasa.dev (planned).

## Getting started with Claude Code

1. Install Node.js (LTS), pnpm and Docker Desktop.
2. Copy `.env.example` to `.env` and fill in what you have (the database URL works as-is locally).
3. Move `docs/claude-commands/next-phase.md` into `.claude/commands/`, then open this folder in Claude Code and run `/next-phase`, or paste the Phase 1 prompt from `docs/PROMPTS.md`.

## Docs

- `CLAUDE.md`: rules and conventions Claude Code follows
- `docs/SPEC.md`: product spec
- `docs/PROMPTS.md`: phase-by-phase build prompts
- `docs/PROGRESS.md`: build status and decisions
- `prisma/schema.prisma`: draft data model
