# Phase 6 Current Implementation Inventory

timestamp=2026-08-26T14:43:02.552Z
branch=codex/payroll-reminder-launch-ready-100-20260714
CURRENT_REPOSITORY_HEAD=32c14766de791212862d6567b835e4a245ed6495
REMOTE_HEAD=32c14766de791212862d6567b835e4a245ed6495
APPLICATION_RC_SOURCE_SHA=80cc5cdfb0758478791b19196e2812e7fa6d671f

## Growth API Surface

- `GET /api/v1/growth/profile`
- `GET /api/v1/growth/dashboard`
- `GET /api/v1/growth/summary`
- `GET /api/v1/growth/recommendations`
- `GET /api/v1/growth/badges`
- `GET /api/v1/growth/leaderboard`
- `GET /api/v1/growth/tasks`
- `GET /api/v1/growth/tasks/{taskId}`
- `POST /api/v1/growth/tasks`
- `POST /api/v1/growth/tasks/{taskId}/progress`
- `GET /api/v1/growth/challenges`
- `POST /api/v1/growth/challenges/join`
- `POST /api/v1/growth/challenges/{challengeId}/join`
- `POST /api/v1/growth/challenges/{challengeId}/leave`
- `POST /api/v1/growth/challenges/{challengeId}/complete`
- `GET /api/v1/growth/contents`
- `POST /api/v1/growth/contents/complete`
- `POST /api/v1/growth/contents/{contentId}/complete`

## Community API Surface

- `GET /api/v1/community/boards`
- `GET /api/v1/community/posts`
- `GET /api/v1/community/posts/{postId}`
- `POST /api/v1/community/posts`
- `PATCH /api/v1/community/posts/{postId}`
- `DELETE /api/v1/community/posts/{postId}`
- `POST /api/v1/community/posts/{postId}/like`
- `DELETE /api/v1/community/posts/{postId}/like`
- `GET /api/v1/community/posts/{postId}/comments`
- `POST /api/v1/community/posts/{postId}/comments`
- `PATCH /api/v1/community/comments/{commentId}`
- `DELETE /api/v1/community/comments/{commentId}`
- `POST /api/v1/community/comments/{commentId}/like`
- `DELETE /api/v1/community/comments/{commentId}/like`
- `POST /api/v1/community/bookmarks`
- `POST /api/v1/community/shares`
- `POST /api/v1/community/posts/{postId}/report`
- `POST /api/v1/community/comments/{commentId}/report`
- `GET /api/v1/community/reports`
- `GET /api/v1/community/me/posts`
- `GET /api/v1/community/me/comments`

Community post/comment listing now has a cursor-mode repository path using stable keyset ordering. Staging direct-ID and moderation runtime are still pending.

## Upload API Surface

- `GET /api/v1/uploads`
- `GET /api/v1/uploads/quota`
- `POST /api/v1/uploads/prepare`
- `POST /api/v1/uploads/direct`
- `GET /api/v1/uploads/{attachmentId}`
- `PATCH /api/v1/uploads/{attachmentId}`
- `DELETE /api/v1/uploads/{attachmentId}`
- `POST /api/v1/uploads/{attachmentId}/finalize`
- `POST /api/v1/uploads/{attachmentId}/scan`
- `POST /api/v1/uploads/{attachmentId}/attach`
- `GET /api/v1/uploads/{attachmentId}/download`
- `GET /api/v1/uploads/{attachmentId}/content`

## Focused Evidence

- Focused local test suite: 10 files, 48 tests PASS.
- Typecheck: `@salary-hijacking/api` PASS after Phase 6 code changes.
- Staging/API/DB runtime variables were not present in the current shell by name, so full staging E2E was not executed.
