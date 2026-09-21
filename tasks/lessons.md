# Lessons

- Brand the product as Optima end-to-end (packages, CLI, skills, docs).
- Prefer package-style install (`npm i -D optima-ai` / `npx optima …`) over curl|bash.
- Do not ship ATTRIBUTION marketing in the main docs; keep research links private/internal if needed.
- Soft agent policy + library APIs first; hook interceptors are a later package.
- Install docs: show package/CLI names only — no “name taken” explanations.
- README must lead with concrete before/after cost examples, prompts, and flows so impact is obvious on first read.
- Ship a structured debug protocol (hypothesize → rank → log → fix) as skill + `optima debug`; keep privacy claims explicit and accurate (local-only, no telemetry).
- CI must track bin path renames (`optima.js`, not stale `.mjs`).
- `packages/cli/skills` can go stale — `skillsRoot()` must require all SKILL.md files (including new skills), not just that the directory exists.
- Prefer **retrieve/index → spans** for source understanding; use **compress** for tool-log noise; never treat blind truncation as “same context.”
