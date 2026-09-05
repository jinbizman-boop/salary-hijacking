# Upload Security Report

UPLOAD_SECURITY=PARTIAL_CONTRACT_TESTED_R2_STAGING_PENDING

Current contract evidence shows upload lifecycle separation: prepare/direct/finalize/scan/attach/download/content. Real R2 staging execution and content scanning were not executed because no staging runtime configuration was available in the shell.

Required next runtime checks:
- MIME allowlist and extension mismatch.
- Max size and object ownership.
- Signed URL lifetime.
- Idempotent finalize.
- Orphan cleanup.
- Moderation/malware scan extension point.

No raw upload object keys, secrets, or signed URLs are stored in this evidence.
