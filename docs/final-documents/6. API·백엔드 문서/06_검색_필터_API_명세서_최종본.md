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

# 06. 검색/필터 API 명세서 최종본

## 1. 문서 목적

본 문서는 급여납치 플랫폼의 게시판, 레벨업 콘텐츠, 지출 내역, 알림, 관리자 목록에서 사용하는 검색/필터 API의 요청 파라미터, 정렬, 페이지네이션, 권한, 응답 구조를 최종 확정한다.

## 2. 검색 기본 원칙

| 항목        | 기준                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| 검색 대상   | 커뮤니티 게시글, 레벨업 콘텐츠, 변동지출, 고정지출, 고정저축, 알림, 관리자 사용자/신고/배너   |
| 검색 엔진   | 1차 MVP는 PostgreSQL 인덱스/GIN/trigram/tsvector 기준, 대규모 확장 시 별도 검색엔진 도입 가능 |
| 권한        | 사용자 검색은 본인 데이터 또는 공개 커뮤니티만 가능                                           |
| 개인정보    | 급여/지출 검색 결과는 본인에게만 반환                                                         |
| 기본 페이지 | `page=1`, `size=20`                                                                           |
| 최대 size   | 사용자 API 100, 관리자 API 200                                                                |
| 정렬        | 최신순 기본, 도메인별 허용 sort만 사용                                                        |
| 금칙어      | 커뮤니티 검색어는 금칙어/욕설/개인정보 패턴 로깅과 차단 적용                                  |

## 3. 공통 파라미터

| 파라미터 | 타입   | 설명                           |
| -------- | ------ | ------------------------------ |
| keyword  | string | 검색어, 앞뒤 공백 제거, 1~50자 |
| page     | number | 1 이상                         |
| size     | number | 1~100                          |
| sort     | string | `createdAt,desc` 형태          |
| from     | date   | 시작일 YYYY-MM-DD              |
| to       | date   | 종료일 YYYY-MM-DD              |
| cursor   | string | cursor 기반 페이지네이션       |
| limit    | number | cursor 조회 개수               |

## 4. 커뮤니티 검색 API

`GET /api/v1/search/community`

Query

| 파라미터      | 필수 | 예시           | 설명                                          |
| ------------- | ---: | -------------- | --------------------------------------------- |
| keyword       |    N | 절약           | 제목/본문 검색                                |
| boardType     |    N | FREE           | ALL, FREE, LEVEL_CERT, HOBBY                  |
| isQuestion    |    N | true           | 질문글만 조회                                 |
| hasAttachment |    N | true           | 첨부 포함 글                                  |
| sort          |    N | createdAt,desc | createdAt, viewCount, likeCount, commentCount |
| page          |    N | 1              | 페이지                                        |
| size          |    N | 20             | 크기                                          |

Response

```json
{
  "success": true,
  "data": [
    {
      "postId": "uuid",
      "boardType": "LEVEL_CERT",
      "title": "주 6일 운동 1년 차 인증",
      "summary": "퇴근 후 운동 루틴을 공유합니다.",
      "authorDisplayName": "익명",
      "isAnonymous": true,
      "viewCount": 1200,
      "likeCount": 82,
      "commentCount": 14,
      "createdAt": "2026-06-15T00:00:00Z"
    }
  ],
  "page": { "page": 1, "size": 20, "totalElements": 1, "totalPages": 1, "hasNext": false }
}
```

## 5. 레벨업 콘텐츠 검색 API

`GET /api/v1/search/growth-content`

| 파라미터  | 값                                | 설명               |
| --------- | --------------------------------- | ------------------ |
| keyword   | 기획                              | 콘텐츠명/설명 검색 |
| type      | BOOK, NEWS, ENGLISH, HEALTH       | 레벨업 유형        |
| category  | AI_RECOMMEND, ECONOMY, NOVEL 등   | 카테고리           |
| completed | true/false                        | 완료 여부          |
| sort      | recommended, createdAt, expReward | 정렬               |

## 6. 지출 내역 검색 API

`GET /api/v1/search/expenses`

권한: USER, 본인 데이터만 조회.

| 파라미터      | 예시         | 설명             |
| ------------- | ------------ | ---------------- |
| keyword       | 커피         | 지출명/메모 검색 |
| category      | FOOD         | 카테고리         |
| paymentMethod | CARD         | 결제수단         |
| minAmount     | 1000         | 최소 금액        |
| maxAmount     | 50000        | 최대 금액        |
| from          | 2026-06-01   | 시작일           |
| to            | 2026-06-30   | 종료일           |
| sort          | spentAt,desc | 정렬             |

Response

```json
{
  "success": true,
  "data": [
    {
      "expenseType": "VARIABLE",
      "expenseId": "uuid",
      "name": "빽다방 아이스 아메리카노",
      "category": "FOOD",
      "amount": 2000,
      "spentAt": "2026-06-15T09:10:00Z",
      "memo": "출근길 커피"
    }
  ]
}
```

## 7. 알림 검색/필터 API

`GET /api/v1/notifications`

| 파라미터   | 설명           |
| ---------- | -------------- |
| type       | 알림 유형 필터 |
| readStatus | READ, UNREAD   |
| from/to    | 생성일 기간    |
| sort       | createdAt,desc |

## 8. 관리자 검색 API

| Endpoint                            | 설명             | 권한        |
| ----------------------------------- | ---------------- | ----------- |
| `GET /admin/api/v1/users`           | 사용자 검색      | ADMIN       |
| `GET /admin/api/v1/community/posts` | 게시글 검색      | OPERATOR    |
| `GET /admin/api/v1/reports`         | 신고 검색        | OPERATOR    |
| `GET /admin/api/v1/ads/campaigns`   | 광고 캠페인 검색 | ADMIN       |
| `GET /admin/api/v1/audit-logs`      | 감사로그 검색    | SUPER_ADMIN |

관리자 사용자 검색 예시

```http
GET /admin/api/v1/users?keyword=hong&status=ACTIVE&from=2026-01-01&to=2026-06-15&page=1&size=50
```

## 9. 정렬 허용값

| 도메인         | 허용 sort                                         |
| -------------- | ------------------------------------------------- |
| community      | createdAt, viewCount, likeCount, commentCount     |
| growth-content | recommended, createdAt, expReward, completionRate |
| expenses       | spentAt, amount, createdAt                        |
| notifications  | createdAt, readAt                                 |
| admin-users    | createdAt, lastLoginAt, status                    |
| reports        | createdAt, status, reportCount                    |

## 10. 검색 인덱스 기준

| 테이블            | 인덱스                                                     |
| ----------------- | ---------------------------------------------------------- |
| community_posts   | board_type, status, created_at DESC, tsvector(title, body) |
| variable_expenses | user_id, spent_at DESC, category, amount                   |
| fixed_expenses    | user_id, payroll_plan_id, expense_day, category            |
| savings_plans     | user_id, payroll_plan_id, saving_day, category             |
| notifications     | user_id, read_status, created_at DESC                      |
| growth_tasks      | type, category, status, created_at DESC                    |

## 11. 검증/오류 코드

| 코드                      | HTTP | 상황                     |
| ------------------------- | ---: | ------------------------ |
| SEARCH_KEYWORD_TOO_SHORT  |  400 | 검색어 길이 부족         |
| SEARCH_KEYWORD_TOO_LONG   |  400 | 검색어 50자 초과         |
| SEARCH_SORT_NOT_ALLOWED   |  400 | 허용되지 않은 정렬 필드  |
| SEARCH_DATE_RANGE_INVALID |  400 | from이 to보다 늦음       |
| SEARCH_SIZE_EXCEEDED      |  400 | size 최대값 초과         |
| SEARCH_FORBIDDEN_RESOURCE |  403 | 접근 권한 없는 검색 대상 |

## 12. 완료 판정

본 문서는 검색 대상, 파라미터, 정렬, 페이지네이션, 권한, 인덱스, 오류 코드를 포함하므로 검색/필터 API 구현의 최종본으로 확정한다.
