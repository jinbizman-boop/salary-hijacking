# scripts

Repository-local helper scripts for the Salary Hijacking platform.

These scripts are intentionally conservative:

- `dev/check-env.sh` checks required local tools and reports optional runtime gaps.
- `dev/bootstrap.sh` runs environment checks, dependency install, and baseline validation.
- `quality/lint-all.sh` runs script validation, format check, and workspace lint.
- `quality/test-all.sh` runs workspace typecheck and tests; native E2E is opt-in with `RUN_NATIVE_E2E=1`.
- `docs/generate-tree.sh` writes `docs/generated/repo-tree.txt`.
- `db/migrate.sh` and `db/seed.sh` require explicit confirmation environment variables before touching a database.
- `release/build-release.sh` creates a local build summary only; publishing remains a separate controlled operation.

On Windows, run these through Git Bash, WSL, or another Bash-compatible shell.
