# Install Optima

Optima is meant to feel like a normal package: install it, and your project’s AI agents get the skillset.

> **Why not `npm install optima`?**  
> The bare npm name [`optima`](https://www.npmjs.com/package/optima) is already taken (unrelated 2017 stub).  
> Our registry name is **`optima-ai`**. The CLI binary is still **`optima`**.

---

## Channels

| Channel | Command | What happens |
|---------|---------|----------------|
| **npm / pnpm / yarn** | `npm i -D optima-ai` | Package in `node_modules` + **postinstall** copies skills/rules into the project |
| **npx (no dependency)** | `npx optima-ai init` | One-shot wiring, nothing added to package.json |
| **GitHub (no registry)** | `npx github:julienlhk/optima init` | Same installer, from git |
| **Skills CLI** | `npx skills add julienlhk/optima` | Agent-skills format install |
| **Global CLI** | `npm i -g optima-ai` then `optima init` | Binary on PATH |
| **Brew** | `brew install julienlhk/tap/optima` *(after tap publish)* | Wraps the same Node CLI |
| **From source** | clone → `pnpm i && pnpm build` → `optima init` | Full monorepo + libraries |

```mermaid
flowchart TD
  user[You] --> npm["npm i -D optima-ai"]
  user --> npx["npx optima-ai init"]
  user --> git["npx github:julienlhk/optima init"]
  user --> skills["npx skills add julienlhk/optima"]
  npm --> post[postinstall]
  post --> wire[Write_skills_rules_ignores]
  npx --> wire
  git --> wire
  skills --> wire
  wire --> agents[Cursor_Claude_Codex]
```

---

## Recommended: npm dependency

```bash
cd your-app
npm install -D optima-ai
# or:  pnpm add -D optima-ai
# or:  yarn add -D optima-ai
```

On install, Optima’s `postinstall` writes into **your project** (not into a venv):

| Path | Role |
|------|------|
| `.cursor/rules/optima.mdc` | Always-on agent rules |
| `.cursor/skills/optima/` | Cursor skill |
| `.claude/skills/optima/` | Claude skill |
| `AGENTS.md` / `CLAUDE.md` | Host instructions |
| `.cursorignore` … | Context boundaries |
| `OPTIMA_RUNTIME.md` | Full protocol |

Commit those files so the whole team shares the same agent FinOps.

### Skip / customize postinstall

```bash
OPTIMA_SKIP_POSTINSTALL=1 npm i -D optima-ai   # install package only
OPTIMA_HOST=cursor npm i -D optima-ai           # Cursor-only wiring
npx optima init --host all                      # run wiring manually
```

---

## Why not a Python venv?

Agent skills live in **project config folders** (`.cursor/`, `.claude/`, `AGENTS.md`).  
They are not Python modules, so they don’t go into a venv.

For **Python LLM apps** that call models in code, use the TypeScript libraries from Node, or call `optima estimate` / meters from a small Node sidecar. A future `pip install optima-ai` could wrap the same meters — not required for agent skill install.

---

## Publishing status

| Artifact | Status |
|----------|--------|
| GitHub repo | Live — https://github.com/julienlhk/optima |
| npm `optima-ai` | Publish with `npm publish` (needs npm login + build) |
| Homebrew tap | Formula stub in `packaging/homebrew/optima.rb` |
| npm bare `optima` | **Unavailable** (taken) |

### Publish to npm (maintainers)

```bash
pnpm install && pnpm build
npm publish --access public
# package name: optima-ai
```

### After publish, users run

```bash
npm i -D optima-ai
```
