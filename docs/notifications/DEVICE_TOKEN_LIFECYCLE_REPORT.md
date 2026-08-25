# Device Token Lifecycle Report

DEVICE_TOKEN_LIFECYCLE=PASS_CORE_STAGING_RUNTIME
INVALID_TOKEN_CLEANUP=PASS_INTERNAL_FCM_EXTERNAL_BLOCKER

Staging evidence verifies register/list/revoke for synthetic Android device tokens. The API stores token hashes and evidence stores only a device hash. Notification worker invalid-token cleanup policy is covered by local unit tests and uses permanent provider error classification; a real valid/invalid FCM token runtime sample remains external.
