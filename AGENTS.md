<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Notes & Obsidian Vault Workflow
Project notes live in docs/ (an Obsidian vault). At the start of each task, read docs/Plan.md and docs/Bugs.md. At the end, update the phase status in Plan.md, add new bugs to Bugs.md, and log important choices in Decisions.md. Never put keys or personal data in notes.

## Builder Task Protocol
Builder: read `docs/Executor-Rules.md` before any task. Task packets live in `docs/tasks/T-###-name.md`. Architecture reference is in `docs/Architecture.md`.
