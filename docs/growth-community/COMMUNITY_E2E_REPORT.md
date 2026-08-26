# Community E2E Report

COMMUNITY_E2E=PARTIAL_LOCAL_CONTRACT_STAGING_PENDING

Validated locally:
- Community post cursor-mode repository path.
- Mobile community route contract for cursor/limit query propagation.
- Comment-created notification event carries recipient target without exposing owner IDs in the client response.
- Self-notification suppression in the Phase 6 producer.

Not validated:
- Full staging create/read/update/delete/report/moderation/direct-ID matrix.
- Broad block/mute/report auto-hide behavior.
- Staging community pagination over 100+ records.
