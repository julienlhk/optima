# ADR-002: Soft agent policy + library APIs before hooks

## Status

Accepted

## Context

Always-on harness hooks are powerful but host-specific, high-maintenance, and often license-encumbered.

## Decision

v1 ships skills/rules templates, analyzers, and importable SDKs. Hook packages may follow as a separate ADR.

## Consequences

Savings from skills are behavioral (soft). Apps needing hard guarantees use `TokenMeter` budgets and compressors at the API boundary.
