---
프로젝트: 급여납치(Salary Hijacking) 모바일 플랫폼
문서상태: 최종본(Final)
완성기준: 문서상·이론상 추가 작업 없음 / 수행 대기 항목 없음 / 기능·기술·정책 반영 완료
기준일: 2026-06-15
적용범위: 직장인·아르바이트생 대상 급여관리·가계부·자기계발·커뮤니티 모바일 앱
기준환경: 모바일 앱, API 서버, Neon DB(PostgreSQL), Cloudflare, GitHub Actions
---

# 04. API 테스트 문서 최종본

## 1. 문서 목적

본 문서는 급여납치 API의 정상 응답, 오류 응답, 인증 실패, 권한 실패, 입력값 검증, 페이지네이션, 멱등성, 보안 경계 테스트 기준을 확정한다.

## 2. 공통 API 테스트 기준

| 항목         | 기준                                                           |
| ------------ | -------------------------------------------------------------- |
| Content-Type | `application/json; charset=utf-8`                              |
| 인증 헤더    | `Authorization: Bearer {accessToken}`                          |
| 요청 ID      | `X-Request-Id` 지원                                            |
| 시간대       | Asia/Seoul 기준 표시, 서버 저장은 UTC 권장                     |
| 금액 단위    | 원(KRW), 정수                                                  |
| 성공 응답    | `success=true`, `data`, `meta` 포함                            |
| 실패 응답    | `success=false`, `error.code`, `error.message`, `traceId` 포함 |
| 페이지네이션 | `page`, `limit`, `total`, `hasNext` 또는 cursor 방식           |

## 3. 공통 오류 코드 테스트

| 코드             | HTTP | 테스트 조건           | 기대결과                  |
| ---------------- | ---: | --------------------- | ------------------------- |
| AUTH_REQUIRED    |  401 | 토큰 없음             | 인증 필요 오류            |
| TOKEN_EXPIRED    |  401 | access token 만료     | 재발급 또는 재로그인 안내 |
| FORBIDDEN        |  403 | 권한 없음             | 데이터 미노출             |
| NOT_FOUND        |  404 | 리소스 없음           | 존재하지 않음 응답        |
| VALIDATION_ERROR |  400 | 필수값 누락/형식 오류 | 필드별 오류 반환          |
| CONFLICT         |  409 | 중복 요청/중복 데이터 | 충돌 오류                 |
| RATE_LIMITED     |  429 | 과도한 요청           | 재시도 가능 시간 반환     |
| INTERNAL_ERROR   |  500 | 서버 예외             | 민감정보 없는 오류 반환   |

## 4. 인증 API 테스트

| ID           | Method | Endpoint               | 테스트               | 기대결과             |
| ------------ | ------ | ---------------------- | -------------------- | -------------------- |
| API-AUTH-001 | POST   | `/api/v1/auth/login`   | 정상 이메일/비밀번호 | 토큰 발급            |
| API-AUTH-002 | POST   | `/api/v1/auth/login`   | 틀린 비밀번호        | 401, 토큰 미발급     |
| API-AUTH-003 | POST   | `/api/v1/auth/refresh` | 정상 refresh token   | 새 access token 발급 |
| API-AUTH-004 | POST   | `/api/v1/auth/logout`  | 로그인 상태 로그아웃 | refresh token 폐기   |
| API-AUTH-005 | GET    | `/api/v1/users/me`     | 정상 토큰            | 내 프로필 반환       |
| API-AUTH-006 | GET    | `/api/v1/users/me`     | 만료 토큰            | 401                  |

## 5. 급여/계획 API 테스트

| ID          | Method | Endpoint                        | 테스트         | 기대결과                      |
| ----------- | ------ | ------------------------------- | -------------- | ----------------------------- |
| API-PAY-001 | POST   | `/api/v1/payroll-plans`         | 급여 계획 생성 | 201, 계획 ID 반환             |
| API-PAY-002 | POST   | `/api/v1/payroll-plans`         | 음수 금액      | 400 VALIDATION_ERROR          |
| API-PAY-003 | GET    | `/api/v1/payroll-plans/current` | 현재 계획 조회 | 현재 월 계획 반환             |
| API-PAY-004 | PATCH  | `/api/v1/payroll-plans/{id}`    | 금액 수정      | 수정값 반환                   |
| API-PAY-005 | DELETE | `/api/v1/payroll-plans/{id}`    | 계획 삭제      | soft delete 또는 삭제 완료    |
| API-PAY-006 | GET    | `/api/v1/salary-home`           | 급여 홈 조회   | 수령/지출/납치/예산 지표 반환 |

## 6. 지출/저축 API 테스트

| ID          | Method | Endpoint                         | 테스트         | 기대결과              |
| ----------- | ------ | -------------------------------- | -------------- | --------------------- |
| API-FE-001  | POST   | `/api/v1/fixed-expenses`         | 고정지출 생성  | 201                   |
| API-FE-002  | PATCH  | `/api/v1/fixed-expenses/{id}`    | 상태 납부완료  | 상태 변경             |
| API-FE-003  | DELETE | `/api/v1/fixed-expenses/{id}`    | 삭제           | 목록 미노출           |
| API-SV-001  | POST   | `/api/v1/savings-plans`          | 고정저축 생성  | 201                   |
| API-BUD-001 | PUT    | `/api/v1/daily-budgets/{date}`   | 일일 예산 설정 | 예산 반환             |
| API-VE-001  | POST   | `/api/v1/variable-expenses`      | 변동지출 생성  | 예산 재계산 결과 포함 |
| API-VE-002  | PATCH  | `/api/v1/variable-expenses/{id}` | 지출 수정      | 차액 반영             |
| API-VE-003  | DELETE | `/api/v1/variable-expenses/{id}` | 지출 삭제      | 예산 복구             |

## 7. 알림 API 테스트

| ID           | Method | Endpoint                          | 테스트         | 기대결과              |
| ------------ | ------ | --------------------------------- | -------------- | --------------------- |
| API-NOTI-001 | GET    | `/api/v1/notifications`           | 알림 목록 조회 | 최신순 반환           |
| API-NOTI-002 | PATCH  | `/api/v1/notifications/{id}/read` | 읽음 처리      | readAt 저장           |
| API-NOTI-003 | PATCH  | `/api/v1/notifications/read-all`  | 전체 읽음      | 모든 미읽음 읽음 처리 |
| API-NOTI-004 | PUT    | `/api/v1/notification-settings`   | 푸시 설정 변경 | 설정 저장             |

## 8. 레벨업 API 테스트

| ID         | Method | Endpoint                             | 테스트         | 기대결과                      |
| ---------- | ------ | ------------------------------------ | -------------- | ----------------------------- |
| API-LV-001 | GET    | `/api/v1/growth/tasks/today`         | 오늘 미션 조회 | 독서/뉴스/영어/건강 미션 반환 |
| API-LV-002 | POST   | `/api/v1/growth/tasks/{id}/complete` | 미션 완료      | 경험치 증가                   |
| API-LV-003 | POST   | `/api/v1/growth/tasks/{id}/complete` | 중복 완료      | 409 CONFLICT                  |
| API-LV-004 | GET    | `/api/v1/growth/profile`             | 레벨 조회      | 레벨/경험치 반환              |

## 9. 커뮤니티 API 테스트

| ID          | Method | Endpoint                                 | 테스트      | 기대결과           |
| ----------- | ------ | ---------------------------------------- | ----------- | ------------------ |
| API-COM-001 | GET    | `/api/v1/community/posts`                | 게시글 목록 | 페이지네이션 반환  |
| API-COM-002 | GET    | `/api/v1/community/posts?boardType=FREE` | 필터        | 자유 게시판만 반환 |
| API-COM-003 | POST   | `/api/v1/community/posts`                | 글 작성     | 201, 게시글 반환   |
| API-COM-004 | PATCH  | `/api/v1/community/posts/{id}`           | 작성자 수정 | 수정 성공          |
| API-COM-005 | PATCH  | `/api/v1/community/posts/{id}`           | 타인 수정   | 403                |
| API-COM-006 | POST   | `/api/v1/community/posts/{id}/like`      | 좋아요      | 좋아요 수 증가     |
| API-COM-007 | DELETE | `/api/v1/community/posts/{id}/like`      | 좋아요 취소 | 좋아요 수 감소     |
| API-COM-008 | POST   | `/api/v1/community/posts/{id}/reports`   | 신고        | 신고 접수          |
| API-COM-009 | POST   | `/api/v1/community/posts/{id}/comments`  | 댓글 작성   | 댓글 등록          |

## 10. 파일 업로드 API 테스트

| ID           | Method | Endpoint                      | 테스트               | 기대결과        |
| ------------ | ------ | ----------------------------- | -------------------- | --------------- |
| API-FILE-001 | POST   | `/api/v1/files/presigned-url` | 정상 이미지 요청     | 업로드 URL 반환 |
| API-FILE-002 | POST   | `/api/v1/files/presigned-url` | 허용되지 않은 확장자 | 400             |
| API-FILE-003 | POST   | `/api/v1/files/complete`      | 업로드 완료 처리     | 파일 메타 저장  |
| API-FILE-004 | DELETE | `/api/v1/files/{id}`          | 작성자 파일 삭제     | 삭제 성공       |
| API-FILE-005 | DELETE | `/api/v1/files/{id}`          | 타인 파일 삭제       | 403             |

## 11. 관리자 API 테스트

| ID          | Method | Endpoint                     | 테스트           | 기대결과       |
| ----------- | ------ | ---------------------------- | ---------------- | -------------- |
| API-ADM-001 | GET    | `/api/v1/admin/reports`      | 관리자 신고 목록 | 신고 목록 반환 |
| API-ADM-002 | PATCH  | `/api/v1/admin/reports/{id}` | 신고 처리        | 처리 상태 저장 |
| API-ADM-003 | POST   | `/api/v1/admin/notices`      | 공지 등록        | 공지 생성      |
| API-ADM-004 | POST   | `/api/v1/admin/banners`      | 배너 등록        | 배너 생성      |
| API-ADM-005 | GET    | `/api/v1/admin/reports`      | 일반 사용자 접근 | 403            |

## 12. API 보안 테스트

| 항목            | 테스트                            | 기대결과                           |
| --------------- | --------------------------------- | ---------------------------------- |
| 인증 누락       | 모든 보호 API에 토큰 없이 요청    | 401                                |
| 권한 우회       | 타 사용자 리소스 ID로 요청        | 403 또는 404                       |
| Mass Assignment | `role=ADMIN`, `userId=other` 추가 | 무시 또는 400                      |
| SQL Injection   | 검색어에 `' OR 1=1 --` 입력       | 쿼리 실행 차단, 정상 오류/빈 결과  |
| XSS Payload     | 게시글 본문에 `<script>` 입력     | 저장 전/출력 시 무해화             |
| Rate Limit      | 로그인/API 반복 호출              | 429 및 잠금/지연 정책 적용         |
| Error Leakage   | 강제 서버 오류                    | stack trace, DB URL, secret 미노출 |

## 13. API 테스트 종료 기준

| 기준          | 완료 조건                               |
| ------------- | --------------------------------------- |
| P1 API        | 100% PASS                               |
| 인증/권한     | 100% PASS                               |
| 금액 계산 API | 100% PASS                               |
| 오류 포맷     | 모든 오류가 공통 포맷 준수              |
| 보안 경계     | 인증 우회/IDOR/Mass Assignment 실패 0건 |

## 14. 최종 완료 기준

본 API 테스트 문서는 급여납치 플랫폼의 프론트엔드와 백엔드 연결 계약 검증 기준을 모두 포함한다. 본 문서의 P1/API 보안 테스트가 통과해야 배포 후보로 인정한다.
