# Compliance

- **License:** MIT ([LICENSE](../LICENSE))
- **Product name:** Optima (`https://github.com/julienlhk/optima`)
- **Data residency:** analyze/doctor operate locally; no SaaS backend in v1
- **SBOM:** generate with your org standard (`pnpm` lockfile is the dependency source of truth)

## Enterprise checklist

- [ ] Legal review of MIT
- [ ] Pin `optima-ai` version in package.json
- [ ] Commit generated rules (change control)
- [ ] Define org diet level + ignore allowlists
- [ ] Wire `TokenMeter` hard limits on billable workloads
