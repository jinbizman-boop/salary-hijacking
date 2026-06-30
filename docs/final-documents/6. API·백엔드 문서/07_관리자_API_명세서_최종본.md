---
프로젝트: 급여납치(Salary Hijacking) 모바일 플랫폼
문서등급: 최종본
적용범위: API·백엔드 문서
기준일: 2026-06-15
상태: 문서상·이론상 최종 완료본
작성기준: 기존 최상위 기획문서, 사용자·시장·전략문서, UX/UI 기획문서, 기능 기획문서, 데이터·DB 문서, 급여납치 화면 및 기능 설계 기획안.html
배포환경: 모바일 애플리케이션 / GitHub / Cloudflare / Neon DB(PostgreSQL)
공통원칙: 본 문서는 추가 기획 없이 백엔드 구현·검수·운영 기준으로 사용할 수 있도록 API 계약, 보안, 예외, 권한, 데이터 연결 기준을 완결한다.
---

# 07. 관리자 API 명세서 최종본

## 1. 문서 목적

본 문서는 급여납치 플랫폼 운영자가 사용자, 게시글, 신고, 공지, 배너, 광고 캠페인, 제재, 감사로그를 관리하기 위한 관리자 API를 최종 확정한다. 관리자 API는 일반 사용자 API와 분리된 URL, 권한, 감사로그, 보안 정책을 적용한다.

## 2. 관리자 역할

| Role        | 설명               | 주요 권한                                               |
| ----------- | ------------------ | ------------------------------------------------------- |
| OPERATOR    | 게시판/신고 운영자 | 신고 조회, 게시글 숨김, 댓글 숨김, 공지 조회            |
| ADMIN       | 서비스 관리자      | 사용자 제재, 공지 작성, 배너/광고 관리, 이벤트 관리     |
| SUPER_ADMIN | 최고관리자         | 관리자 계정 관리, 권한 부여, 감사로그 조회, 시스템 설정 |

## 3. 관리자 공통 정책

1. 모든 관리자 API는 `/admin/api/v1` prefix를 사용한다.
2. 관리자 로그인은 일반 사용자 세션과 분리한다.
3. 관리자 계정은 2단계 인증을 필수로 한다.
4. 모든 변경 API는 `X-Admin-Reason` 헤더 또는 body의 `reason` 필드를 필수로 한다.
5. 모든 조회/변경은 `admin_audit_logs`에 기록한다.
6. 급여/지출/저축 원문 열람은 원칙적으로 금지하며 고객 문의 처리 시 마스킹 또는 집계값만 제공한다.

## 4. 관리자 인증 API

| Method | Endpoint                 | 설명               | 권한  |
| ------ | ------------------------ | ------------------ | ----- |
| POST   | `/admin/auth/login`      | 관리자 로그인      | 공개  |
| POST   | `/admin/auth/verify-otp` | 2단계 인증 확인    | 공개  |
| POST   | `/admin/auth/refresh`    | 관리자 토큰 재발급 | ADMIN |
| POST   | `/admin/auth/logout`     | 로그아웃           | ADMIN |

## 5. 사용자 관리 API

| Method | Endpoint                                        | 설명             | 권한     |
| ------ | ----------------------------------------------- | ---------------- | -------- |
| GET    | `/admin/api/v1/users`                           | 사용자 목록/검색 | ADMIN    |
| GET    | `/admin/api/v1/users/{userId}`                  | 사용자 상세      | ADMIN    |
| POST   | `/admin/api/v1/users/{userId}/suspend`          | 사용자 정지      | ADMIN    |
| POST   | `/admin/api/v1/users/{userId}/restore`          | 정지 해제        | ADMIN    |
| POST   | `/admin/api/v1/users/{userId}/force-logout`     | 전체 세션 폐기   | ADMIN    |
| GET    | `/admin/api/v1/users/{userId}/activity-summary` | 활동 요약        | OPERATOR |

사용자 정지 Request

```json
{
  "reason": "커뮤니티 운영 정책 반복 위반",
  "durationDays": 7,
  "notifyUser": true
}
```

## 6. 커뮤니티/신고 관리 API

| Method | Endpoint                                         | 설명             | 권한     |
| ------ | ------------------------------------------------ | ---------------- | -------- |
| GET    | `/admin/api/v1/community/posts`                  | 게시글 목록 검색 | OPERATOR |
| GET    | `/admin/api/v1/community/posts/{postId}`         | 게시글 상세      | OPERATOR |
| POST   | `/admin/api/v1/community/posts/{postId}/hide`    | 게시글 숨김      | OPERATOR |
| POST   | `/admin/api/v1/community/posts/{postId}/restore` | 게시글 복구      | OPERATOR |
| DELETE | `/admin/api/v1/community/posts/{postId}`         | 게시글 운영 삭제 | ADMIN    |
| GET    | `/admin/api/v1/reports`                          | 신고 목록        | OPERATOR |
| POST   | `/admin/api/v1/reports/{reportId}/resolve`       | 신고 처리        | OPERATOR |

신고 처리 Request

```json
{
  "action": "HIDE_POST",
  "reason": "개인정보 노출 신고 확인",
  "penaltyUser": true,
  "notifyReporter": true,
  "notifyTargetUser": true
}
```

## 7. 공지사항 API

| Method | Endpoint                                     | 설명      | 권한     |
| ------ | -------------------------------------------- | --------- | -------- |
| GET    | `/admin/api/v1/notices`                      | 공지 목록 | OPERATOR |
| POST   | `/admin/api/v1/notices`                      | 공지 작성 | ADMIN    |
| PATCH  | `/admin/api/v1/notices/{noticeId}`           | 공지 수정 | ADMIN    |
| POST   | `/admin/api/v1/notices/{noticeId}/publish`   | 공지 발행 | ADMIN    |
| POST   | `/admin/api/v1/notices/{noticeId}/unpublish` | 공지 내림 | ADMIN    |
| DELETE | `/admin/api/v1/notices/{noticeId}`           | 공지 삭제 | ADMIN    |

공지 작성 Request

```json
{
  "title": "서비스 점검 안내",
  "body": "2026년 6월 20일 02:00~03:00 서비스 점검이 진행됩니다.",
  "noticeType": "MAINTENANCE",
  "visibleFrom": "2026-06-18T00:00:00Z",
  "visibleTo": "2026-06-21T00:00:00Z",
  "sendPush": true,
  "attachmentIds": []
}
```

## 8. 배너/광고 관리 API

| Method | Endpoint                                            | 설명            | 권한  |
| ------ | --------------------------------------------------- | --------------- | ----- |
| GET    | `/admin/api/v1/ads/campaigns`                       | 캠페인 목록     | ADMIN |
| POST   | `/admin/api/v1/ads/campaigns`                       | 캠페인 생성     | ADMIN |
| PATCH  | `/admin/api/v1/ads/campaigns/{campaignId}`          | 캠페인 수정     | ADMIN |
| POST   | `/admin/api/v1/ads/campaigns/{campaignId}/activate` | 캠페인 활성화   | ADMIN |
| POST   | `/admin/api/v1/ads/campaigns/{campaignId}/pause`    | 캠페인 일시중지 | ADMIN |
| GET    | `/admin/api/v1/ads/reports`                         | 광고 성과 조회  | ADMIN |

## 9. 레벨업 콘텐츠 관리 API

| Method | Endpoint                                      | 설명      | 권한  |
| ------ | --------------------------------------------- | --------- | ----- |
| GET    | `/admin/api/v1/growth/tasks`                  | 미션 목록 | ADMIN |
| POST   | `/admin/api/v1/growth/tasks`                  | 미션 생성 | ADMIN |
| PATCH  | `/admin/api/v1/growth/tasks/{taskId}`         | 미션 수정 | ADMIN |
| POST   | `/admin/api/v1/growth/tasks/{taskId}/publish` | 미션 공개 | ADMIN |
| POST   | `/admin/api/v1/growth/tasks/{taskId}/archive` | 미션 보관 | ADMIN |

## 10. 감사로그 API

| Method | Endpoint                                | 설명          | 권한        |
| ------ | --------------------------------------- | ------------- | ----------- |
| GET    | `/admin/api/v1/audit-logs`              | 감사로그 검색 | SUPER_ADMIN |
| GET    | `/admin/api/v1/audit-logs/{auditLogId}` | 감사로그 상세 | SUPER_ADMIN |

감사로그 필드

| 필드       | 설명                                    |
| ---------- | --------------------------------------- |
| auditLogId | 로그 ID                                 |
| adminId    | 수행 관리자                             |
| action     | 수행 작업                               |
| targetType | USER, POST, COMMENT, NOTICE, AD, SYSTEM |
| targetId   | 대상 ID                                 |
| reason     | 처리 사유                               |
| beforeJson | 변경 전 값                              |
| afterJson  | 변경 후 값                              |
| ipAddress  | 관리자 IP                               |
| userAgent  | 관리자 브라우저/앱                      |
| createdAt  | 수행 시각                               |

## 11. 관리자 오류 코드

| 코드                     | HTTP | 상황                           |
| ------------------------ | ---: | ------------------------------ |
| ADMIN_PERMISSION_DENIED  |  403 | 관리자 권한 부족               |
| ADMIN_OTP_REQUIRED       |  401 | 2단계 인증 필요                |
| ADMIN_REASON_REQUIRED    |  400 | 변경 사유 누락                 |
| ADMIN_TARGET_NOT_FOUND   |  404 | 처리 대상 없음                 |
| ADMIN_ACTION_CONFLICT    |  409 | 이미 처리된 신고/상태 충돌     |
| ADMIN_AUDIT_LOG_REQUIRED |  500 | 감사로그 기록 실패로 변경 중단 |

## 12. 완료 판정

본 문서는 신고 처리, 공지 등록, 배너 관리, 사용자 제재, 레벨업 콘텐츠 운영, 감사로그까지 포함하므로 관리자 API 구현의 최종본으로 확정한다.
