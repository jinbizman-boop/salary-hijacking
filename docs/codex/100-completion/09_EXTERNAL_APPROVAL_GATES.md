# External Approval Gates

| Gate                       | Current Approval | Status  | Allowed Now                        |
| -------------------------- | ---------------: | ------- | ---------------------------------- |
| Production infra deploy    |               NO | BLOCKED | dry-run/static validation only     |
| Production DB migration    |               NO | BLOCKED | validate/dry-run only              |
| Production AAB build       |               NO | BLOCKED | preview/local debug APK only       |
| Play internal track upload |               NO | BLOCKED | prepare metadata and commands only |
| Play closed track upload   |               NO | BLOCKED | prepare metadata and commands only |
| Play production submit     |               NO | BLOCKED | prepare metadata and commands only |
| New EAS project            |               NO | BLOCKED | use existing project only          |
| New keystore creation      |               NO | BLOCKED | use existing credentials only      |
| Secret rotation            |               NO | BLOCKED | presence checks only               |
| Destructive DB change      |               NO | BLOCKED | non-destructive validation only    |
| Force push/rebase          |               NO | BLOCKED | normal commits only if requested   |
