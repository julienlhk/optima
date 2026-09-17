# Install Optima

**Package:** `optima-ai` · **CLI:** `optima`

```bash
npm install -D optima-ai
```

Postinstall wires skills/rules into your project. Then use:

```bash
npx optima doctor
npx optima debug [--problem "..."] [--write]
npx optima analyze
npx optima classify README.md
npx optima estimate --file README.md --model claude-sonnet-4
npx optima bench
npx optima taxonomy
npx optima help
```

Same with pnpm / yarn:

```bash
pnpm add -D optima-ai
yarn add -D optima-ai
```

Global:

```bash
npm i -g optima-ai
optima doctor
```

### Skip auto-wiring

```bash
OPTIMA_SKIP_POSTINSTALL=1 npm i -D optima-ai
npx optima init --host all
```

### What lands in your project

| Path | Role |
|------|------|
| `.cursor/rules/optima.mdc` | Always-on agent rules |
| `.cursor/skills/optima/` | Cursor skill |
| `.claude/skills/optima/` | Claude skill |
| `AGENTS.md` / `CLAUDE.md` | Host instructions |
| `.cursorignore` … | Context boundaries |
| `OPTIMA_RUNTIME.md` | Full protocol |

Commit those files so the team shares the same setup.
