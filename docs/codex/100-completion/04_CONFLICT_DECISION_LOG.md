# Conflict Decision Log

Initial conflict log. Detailed file-by-file merge archive classification is pending.

| Conflict ID  | Document A              | Document B              | Conflict                                                            | Selected Basis                                     | Reason                                                                    | Affected Code | Affected Tests    | Final Decision                                                                 |
| ------------ | ----------------------- | ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------ |
| CONFLICT-001 | `salary-hijacking-work` | `salary-hijacking-main` | Two historical work folders existed and both had overlapping files. | `salary-hijacking-platform` consolidated workspace | User explicitly required one workspace and platform root verified by git. | all           | baseline evidence | PASS: platform is sole active root; archived conflicts require classification. |
