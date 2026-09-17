# Architecture

## System context

```mermaid
flowchart TB
  subgraph hosts [Agent_Hosts]
    Cursor[Cursor]
    Claude[Claude_Code]
    Codex[Codex]
  end

  subgraph optimaStack [Optima]
    Skills[skills_and_templates]
    CLI["@optima/cli"]
    Analyze["@optima/analyze"]
    Core["@optima/core"]
    Classify["@optima/classify"]
    Compress["@optima/compress"]
    Cache["@optima/cache"]
  end

  Apps[Node_APIs]
  Transcripts[Cursor_transcripts]

  Cursor --> Skills
  Claude --> Skills
  Codex --> Skills
  CLI --> Skills
  CLI --> Analyze
  Analyze --> Transcripts
  Analyze --> Classify
  Apps --> Core
  Apps --> Cache
  Apps --> Compress
  Classify --> Core
```

## Install flow

```mermaid
sequenceDiagram
  participant Dev
  participant CLI as ai_opt_cli
  participant FS as Project_FS
  Dev->>CLI: optima init --host all
  CLI->>FS: write ignore templates
  CLI->>FS: write .cursor/rules/optima.mdc
  CLI->>FS: upsert AGENTS.md / CLAUDE.md
  CLI->>FS: copy skills + OPTIMA_RUNTIME.md
  Dev->>CLI: optima doctor
  CLI->>FS: verify presence
```

## Analyze loop

```mermaid
flowchart LR
  jsonl[agent_transcripts_jsonl] --> parse[parseTranscriptJsonl]
  parse --> score[analyzeSession]
  score --> report[AnalysisReport]
  report --> rules[tailored_mdc_rules]
  report --> classify[classify_playbook]
```

## Package dependency DAG

```mermaid
flowchart BT
  core["core"]
  classify["classify"] --> core
  compress["compress"] --> core
  cache["cache"] --> core
  analyze["analyze"] --> core
  analyze --> classify
  cli["cli"] --> analyze
  cli --> cache
  cli --> compress
  cli --> classify
  cli --> core
```

## Design principles

1. **Libraries first** — measurable APIs before soft policy.
2. **Sacred quality floor** — never trade correctness for tokens.
3. **Honest evidence** — mark techniques measured vs behavioral vs estimated.
4. **Local-by-default** — analyze transcripts on disk; no telemetry.
5. **Clean-room legality** — MIT only; no vendoring of Noncommercial upstream.
