# Compliance

- **License:** MIT ([LICENSE](../LICENSE))
- **Attribution:** [ATTRIBUTION.md](../ATTRIBUTION.md)
- **Not redistributed:** token-goat (PolyForm Noncommercial), token-diet (no license)
- **Data residency:** analyze/doctor operate locally; no SaaS backend in v1
- **SBOM:** generate with your org standard (`pnpm` lockfile is the dependency source of truth)

## Enterprise checklist

- [ ] Legal review of MIT + attribution
- [ ] Pin package versions
- [ ] Commit generated rules (change control)
- [ ] Define org diet level + ignore allowlists
- [ ] Wire `TokenMeter` hard limits on billable workloads
