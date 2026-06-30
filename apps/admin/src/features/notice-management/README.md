# 급여납치 관리자 콘솔 Notice Management Feature README

> 최종 파일 위치: `apps/admin/src/features/notice-management/README.md`
>
> 적용 범위: 급여납치 관리자 콘솔의 공지사항, 정책 고지, 점검 안내, 보안 공지, 광고·제휴 고지, 서비스 운영 공지, 사용자 확인 공지, 알림 연동 공지 관리 기능.
>
> 문서 버전: `v3.1.3`
>
> 기준 아키텍처: Cloudflare Workers/Pages, TypeScript strict, Next App Router 관리자 콘솔, 서버 권위 API, RBAC/MFA 관리자 인증, 감사 로그, 개인정보·금융정보 비식별 운영.

---

## 1. 목적

`notice-management` 기능은 급여납치 플랫폼의 사용자 및 관리자 대상 공지를 안전하게 작성, 검수, 예약, 게시, 중지, 보관, 테스트 발송, 확인 처리할 수 있도록 하는 관리자 콘솔 도메인이다. 이 기능은 단순 공지 CRUD가 아니라 급여·예산·지출·저축·알림·커뮤니티·광고·제휴·운영 전반의 서비스 상태를 사용자에게 정확하게 전달하는 상용 운영 모듈이다.

공지 관리는 다음 원칙을 반드시 따른다.

1. 서버 권위 API가 최종 상태를 결정한다.
2. 관리자 화면은 원문 금융 데이터, 원문 개인정보, raw push token을 표시하지 않는다.
3. 모든 mutation은 관리자 인증, RBAC, MFA, `X-Admin-Reason`, 감사 로그를 요구한다.
4. 광고·제휴 고지는 급여액, 지출액, 저축액, 납치금액 등 원문 금융 정보 기반 타겟팅을 금지한다.
5. 사용자 고지는 명확한 라벨, 게시 기간, 대상 범위, 알림 정책, 확인 필요 여부를 가진다.
6. 게시·예약·정지·보관·복제·테스트 발송은 모두 추적 가능해야 한다.
7. 문서상·이론상 이 기능은 관리자 콘솔 최종 운영 기준을 충족해야 한다.

---

## 2. 기능 경계

### 포함 기능

- 공지 목록 조회, 검색, 필터링, 정렬
- 공지 작성, 수정, 미리보기
- 공지 예약 게시, 즉시 게시, 정지, 보관
- 상단 고정, 고정 해제
- 공지 복제
- 테스트 발송
- 사용자 확인 필요 공지 설정
- 알림 발송 여부 설정
- placement별 노출 제어
- context segment 기반 비금융 컨텍스트 노출
- 마케팅 수신 동의 대상 고지 제어
- 보안·정책·점검 공지 우선순위 제어
- 관리자 변경 사유 수집
- 감사 로그 연동
- raw 금융정보, raw 개인정보, raw push token 차단
- 광고 금융 타겟팅 금지
- 비식별 export 정책 연계

### 제외 기능

- 사용자의 실제 급여, 지출, 저축, 납치금액 원문 조회
- push token 원문 조회
- 카드·계좌·급여명세서 원문 조회
- 광고주에게 사용자 식별자 또는 금융 원문 전달
- 관리자 사유 없는 상태 변경
- 서버 검증 없이 클라이언트 단독 게시 확정

---

## 3. 디렉터리 역할

```txt
apps/admin/src/features/notice-management/
├── README.md                         # 이 문서
├── components/                        # 공지 관리 UI 구성요소
├── hooks/                             # 관리자 공지 API/상태 hook
├── schemas/                           # Zod 또는 TypeScript validation schema
├── services/                          # admin API client, policy guard
├── types/                             # Notice 도메인 타입
├── utils/                             # redaction, date, formatter, guard helper
└── __tests__/                         # unit/e2e/contract test
```

현재 관리자 화면 엔트리포인트는 다음 파일과 연결된다.

```txt
apps/admin/src/app/notices/page.tsx
```

---

## 4. 도메인 모델

### Notice

| 필드                        | 설명                     | 정책                                                                                                          |
| --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `id`                        | 공지 ID                  | 서버 생성 UUID 또는 ULID                                                                                      |
| `title`                     | 공지 제목                | 민감정보 포함 금지                                                                                            |
| `summary`                   | 목록 요약                | 민감정보 포함 금지                                                                                            |
| `body`                      | 본문                     | 금융 원문·개인정보·토큰 포함 금지                                                                             |
| `type`                      | 공지 유형                | `SERVICE`, `PAYROLL`, `BUDGET`, `SAVINGS`, `COMMUNITY`, `ADS`, `SECURITY`, `MAINTENANCE`, `POLICY`            |
| `status`                    | 상태                     | `DRAFT`, `SCHEDULED`, `PUBLISHED`, `PAUSED`, `ARCHIVED`                                                       |
| `severity`                  | 중요도                   | `INFO`, `IMPORTANT`, `WARNING`, `CRITICAL`                                                                    |
| `placement`                 | 노출 위치                | `ADMIN_HOME`, `APP_HOME`, `PAYROLL_HOME`, `BUDGET_HOME`, `COMMUNITY_FEED`, `MY_PAGE`, `LOGIN`, `GLOBAL_MODAL` |
| `audienceMode`              | 대상 정책                | `ALL`, `ADMIN_ONLY`, `CONTEXTUAL`, `CONSENTED_MARKETING`, `SECURITY_RELATED`                                  |
| `contextSegments`           | 비금융 컨텍스트 세그먼트 | 급여액·지출액 등 금액 기반 세그먼트 금지                                                                      |
| `priority`                  | 우선순위                 | 0~9999 정수                                                                                                   |
| `pinned`                    | 상단 고정 여부           | placement별 충돌 정책 필요                                                                                    |
| `requiresAcknowledgement`   | 확인 필요 여부           | 보안·정책 공지에서 사용                                                                                       |
| `notificationEnabled`       | 알림 발송 여부           | 알림 서비스와 연동                                                                                            |
| `startsAt`                  | 노출 시작 시각           | UTC 저장, KST 표시                                                                                            |
| `endsAt`                    | 노출 종료 시각           | UTC 저장, KST 표시                                                                                            |
| `publishedAt`               | 게시 시각                | 게시 상태 전환 시 서버 기록                                                                                   |
| `views`                     | 조회 수                  | 집계값만 표시                                                                                                 |
| `acknowledgements`          | 확인 수                  | 집계값만 표시                                                                                                 |
| `updatedBy`                 | 수정 관리자              | 관리자 식별자는 내부 감사 로그 기준                                                                           |
| `auditReasonRequired`       | 사유 필수                | 항상 true                                                                                                     |
| `rawFinancialTargetingUsed` | 금융 원문 타겟팅 여부    | 항상 false                                                                                                    |
| `rawPushTokenLogged`        | raw push token 로그 여부 | 항상 false                                                                                                    |
| `adsFinancialTargetingUsed` | 광고 금융 타겟팅 여부    | 항상 false                                                                                                    |

---

## 5. 공지 유형 정책

### SERVICE

서비스 이용 안내, 기능 출시, 장애 복구, 일반 운영 안내에 사용한다. 금융 원문이나 개별 사용자 상태를 포함하지 않는다.

### PAYROLL

급여 홈, 급여 계획, 월간 납치 마감, 급여일 알림과 관련된 공지에 사용한다. 특정 사용자의 급여액, 납치금액, 소득정보 원문을 공지 조건이나 본문에 포함하지 않는다.

### BUDGET

일일 예산, 고정지출, 변동지출, 예산 계산식 변경 안내에 사용한다. 개별 지출액 또는 카테고리별 사용액 원문을 표시하지 않는다.

### SAVINGS

고정저축, 저축 목표, 저축 리마인더 정책 안내에 사용한다. 사용자의 저축액 원문을 조건으로 하지 않는다.

### COMMUNITY

커뮤니티 운영 정책, 신고·제재 기준, 익명성 보호 안내에 사용한다. 특정 신고자나 작성자 개인정보를 노출하지 않는다.

### ADS

광고·제휴 노출, 광고 라벨, 제휴 고지, 광고 정책 변경 안내에 사용한다. 급여액, 대출, 지출, 저축 등 금융 취약성 기반 타겟팅을 금지한다. 모든 광고성 고지는 `광고` 또는 `제휴` 라벨 정책과 연결되어야 한다.

### SECURITY

로그인, MFA, 비밀번호, 세션, 계정 보호 안내에 사용한다. 보안 공지는 `SECURITY_RELATED` 또는 전체 대상 고지로 처리하며 마케팅 수신 동의 여부와 무관하게 필수 고지로 처리될 수 있다.

### MAINTENANCE

점검, 배포, 시스템 일시 중단 안내에 사용한다. 시작·종료 시각이 필수이며 사용자에게 영향 범위를 명확하게 설명해야 한다.

### POLICY

개인정보 처리방침, 이용약관, 커뮤니티 정책, 광고 정책, 데이터 보존 정책 변경 안내에 사용한다. `requiresAcknowledgement`가 필요할 수 있다.

---

## 6. 상태 전이

```txt
DRAFT
  ├─ schedule ─> SCHEDULED
  ├─ publish  ─> PUBLISHED
  └─ archive  ─> ARCHIVED

SCHEDULED
  ├─ publish  ─> PUBLISHED
  ├─ pause    ─> PAUSED
  └─ archive  ─> ARCHIVED

PUBLISHED
  ├─ pause    ─> PAUSED
  ├─ archive  ─> ARCHIVED
  └─ update   ─> PUBLISHED

PAUSED
  ├─ publish  ─> PUBLISHED
  ├─ schedule ─> SCHEDULED
  └─ archive  ─> ARCHIVED

ARCHIVED
  └─ duplicate -> DRAFT
```

상태 전이는 서버에서 검증한다. 클라이언트는 요청 UI를 제공하지만 최종 상태 확정자는 아니다.

---

## 7. 관리자 권한 정책

| 작업                | 최소 권한                   |  MFA |   사유 |      감사 로그 |
| ------------------- | --------------------------- | ---: | -----: | -------------: |
| 목록 조회           | OPERATOR                    | 권장 | 불필요 | 조회 로그 선택 |
| 작성                | OPERATOR                    | 필요 |   필요 |           필수 |
| 수정                | OPERATOR                    | 필요 |   필요 |           필수 |
| 게시                | ADMIN                       | 필요 |   필요 |           필수 |
| 정지                | ADMIN                       | 필요 |   필요 |           필수 |
| 보관                | ADMIN                       | 필요 |   필요 |           필수 |
| 고정/해제           | ADMIN                       | 필요 |   필요 |           필수 |
| 테스트 발송         | OPERATOR                    | 필요 |   필요 |           필수 |
| 정책/보안 긴급 공지 | SUPER_ADMIN 또는 지정 ADMIN | 필요 |   필요 |           필수 |
| 비식별 export       | ADMIN                       | 필요 |   필요 |           필수 |

모든 mutation 요청은 다음 헤더를 포함해야 한다.

```http
X-Admin-Reason: <관리자 조치 사유>
X-Raw-Financial-Targeting-Used: false
X-Raw-Push-Token-Logged: false
X-Ad-Financial-Targeting-Used: false
```

---

## 8. API 계약

기본 경로는 다음과 같다.

```txt
/admin/api/v1/notices
```

### 목록 조회

```http
GET /admin/api/v1/notices?limit=30&sort=updatedAt&q=&type=&status=&severity=&placement=
```

응답은 집계값과 마스킹된 데이터만 포함한다.

```json
{
  "data": {
    "items": [],
    "total": 0,
    "stats": {
      "total": 0,
      "published": 0,
      "scheduled": 0,
      "critical": 0,
      "pinned": 0,
      "views": 0,
      "acknowledgementRate": "0.00%"
    }
  }
}
```

### 생성

```http
POST /admin/api/v1/notices
Content-Type: application/json
X-Admin-Reason: 신규 공지 등록
```

### 수정

```http
PATCH /admin/api/v1/notices/{noticeId}
Content-Type: application/json
X-Admin-Reason: 공지 문구 수정
```

### 상태 작업

```http
POST /admin/api/v1/notices/{noticeId}/publish
POST /admin/api/v1/notices/{noticeId}/pause
POST /admin/api/v1/notices/{noticeId}/archive
POST /admin/api/v1/notices/{noticeId}/pin
POST /admin/api/v1/notices/{noticeId}/unpin
POST /admin/api/v1/notices/{noticeId}/duplicate
POST /admin/api/v1/notices/{noticeId}/send_test
```

### 비식별 export

```http
POST /admin/api/v1/notices/exports/redacted
Content-Type: application/json
X-Admin-Reason: 운영 검토용 비식별 export
```

export에는 본문 원문 전체가 아니라 정책상 허용된 비식별 필드, 상태, 집계값, 감사 추적 ID만 포함한다.

---

## 9. Validation 규칙

1. `title`은 2자 이상이어야 한다.
2. `summary`는 2자 이상이어야 한다.
3. `body`는 5자 이상이어야 한다.
4. `priority`는 0~9999 정수여야 한다.
5. `startsAt`은 `endsAt`보다 이전이어야 한다.
6. 모든 시간은 서버에서 UTC로 저장하고 UI에서 Asia/Seoul 기준으로 표시한다.
7. `contextSegments`는 허용된 세그먼트만 사용한다.
8. `CONSENTED_MARKETING` 대상 공지는 마케팅 동의 정책과 연결되어야 한다.
9. `SECURITY_RELATED` 공지는 광고성 알림으로 분류하지 않는다.
10. 광고·제휴 공지는 `광고` 또는 `제휴` 라벨 정책을 준수한다.
11. 공지 본문에는 비밀번호, 토큰, 계좌, 카드, 급여액, 지출액, 저축액, 납치금액 원문을 포함하지 않는다.
12. 금액 기반 세그먼트명은 금지한다.

금지 예시는 다음과 같다.

```txt
salaryAmountOver1000000
expenseAmountOver500000
savingAmountBelow100000
hijackAmountTarget
급여액_상위_타겟
지출금액_과다_사용자
저축금액_부족_사용자
납치금액_목표_미달
```

허용 예시는 다음과 같다.

```txt
HOME
PAYROLL_HOME
BUDGET_HOME
FIXED_EXPENSES
SAVINGS
GROWTH
COMMUNITY
MY_PAGE
ADMIN_CONSOLE
```

---

## 10. Privacy Guard

`notice-management`는 다음 항목을 반드시 보장한다.

```txt
rawFinancialTargetingUsed=false
rawPushTokenLogged=false
rawAmountNotificationPayload=false
adsFinancialTargetingUsed=false
adminReasonRequired=true
contextualAudienceOnly=true
redactedAuditReady=true
noStoreFetch=true
```

### 금융정보 보호

공지 관리자는 사용자 개인의 급여액, 지출액, 저축액, 납치금액, 계좌, 카드, 급여명세서, 통장 사본을 조회하거나 노출하지 않는다. 공지 대상 지정도 금액 원문 기반이 아니라 화면 컨텍스트 또는 동의 상태 기반으로만 수행한다.

### 개인정보 보호

이메일, 전화번호, 계정 정보, push token 원문은 표시하지 않는다. 필요한 경우 masked 값, hash 값, 집계값만 사용한다.

### 광고 분리

광고·제휴 공지는 광고 정책과 연결되지만 광고주에게 사용자 식별자나 금융 원문을 전달하지 않는다. 광고 노출 조건은 문맥 기반 또는 비개인화 정책을 우선한다.

---

## 11. 알림 연동 정책

공지의 `notificationEnabled=true`는 알림 서비스에 발송 요청을 보낼 수 있음을 의미한다. 실제 발송은 notifications service가 다음 조건을 검증한 뒤 처리한다.

1. 알림 유형이 공지 유형과 일치한다.
2. marketing 대상이면 수신 동의가 확인된다.
3. security/policy 필수 고지는 별도 법적·운영 정책을 따른다.
4. payload에는 금액 원문, push token 원문, 개인정보 원문이 포함되지 않는다.
5. 실패한 발송은 retry queue와 token cleanup 정책을 따른다.
6. 테스트 발송은 관리자 본인 또는 staging/test 대상에 한정한다.

---

## 12. 감사 로그

공지 생성, 수정, 게시, 정지, 보관, 고정, 고정 해제, 테스트 발송, 복제, export는 모두 감사 로그 대상이다.

감사 로그에는 다음을 기록한다.

- 관리자 ID 또는 관리자 hash
- 관리자 역할
- action
- targetType=`NOTICE`
- targetId
- reason
- requestId
- before/after diff의 redacted 버전
- IP hash
- User-Agent hash
- createdAt

감사 로그에 다음은 기록하지 않는다.

- 비밀번호
- access token, refresh token
- MFA secret, recovery code
- push token 원문
- 사용자 급여액·지출액·저축액·납치금액 원문
- 계좌, 카드, 주민등록번호, 전화번호 원문

---

## 13. UI/UX 기준

관리자 공지 화면은 다음 UX 기준을 따른다.

1. 검색, 필터, 정렬이 한 화면에서 가능해야 한다.
2. 통계 카드로 전체, 게시, 예약, 긴급, 고정, 조회, 확인율을 표시한다.
3. 목록은 상태, 중요도, 유형, placement, 기간, 성과, 작업 버튼을 제공한다.
4. 작성·수정 패널은 제목, 요약, 본문, 유형, 상태, 중요도, placement, audience, priority, segments, 기간, 고정, 확인 필요, 알림 발송을 입력받는다.
5. 저장 전 미리보기를 제공한다.
6. 위험한 작업은 관리자 사유 없이는 실행하지 않는다.
7. 모바일, 태블릿, 데스크톱에서 반응형으로 동작한다.
8. 외부 폰트, 외부 스크립트에 의존하지 않는다.
9. no-store fetch를 사용하여 관리자 데이터 캐시를 방지한다.
10. 오류 메시지는 민감정보를 redaction한 뒤 표시한다.

---

## 14. 테스트 기준

### Unit Test

- enum validation
- datetime validation
- priority validation
- context segment validation
- sensitive key redaction
- forbidden financial targeting detection
- stats aggregation
- status transition guard

### Contract Test

- `GET /admin/api/v1/notices`
- `POST /admin/api/v1/notices`
- `PATCH /admin/api/v1/notices/{id}`
- `POST /admin/api/v1/notices/{id}/publish`
- `POST /admin/api/v1/notices/{id}/pause`
- `POST /admin/api/v1/notices/{id}/archive`
- `POST /admin/api/v1/notices/{id}/send_test`
- `POST /admin/api/v1/notices/exports/redacted`

### E2E Test

1. 관리자 로그인 및 MFA 통과
2. 공지 작성
3. 미리보기 확인
4. 예약 게시
5. 게시 상태 전환
6. 사용자 앱 placement 노출 확인
7. 확인 필요 공지 acknowledgement 확인
8. 테스트 알림 발송
9. 정지 및 보관
10. 감사 로그 확인
11. raw 금융/개인정보 미노출 확인
12. 광고 금융 타겟팅 금지 확인

---

## 15. 운영 Runbook

### 공지 게시 전 체크리스트

- [ ] 제목, 요약, 본문에 민감정보가 없는가?
- [ ] 공지 유형이 정확한가?
- [ ] 광고·제휴 공지에 라벨 정책이 반영되었는가?
- [ ] 금융 원문 기반 targeting을 사용하지 않았는가?
- [ ] placement가 올바른가?
- [ ] 시작/종료 시간이 KST 표시 기준으로 의도와 맞는가?
- [ ] 알림 발송이 필요한가?
- [ ] 마케팅 대상이면 수신 동의 정책이 맞는가?
- [ ] 보안/정책 공지라면 확인 필요 여부를 검토했는가?
- [ ] 관리자 사유가 충분히 구체적인가?

### 장애 공지

1. `MAINTENANCE` 또는 `SERVICE` 유형을 선택한다.
2. `severity=CRITICAL` 또는 `WARNING`으로 설정한다.
3. `GLOBAL_MODAL` 또는 영향받는 placement를 선택한다.
4. 시작/종료 시간을 명확히 설정한다.
5. 원인, 영향, 우회 방법, 다음 업데이트 시간을 작성한다.
6. 게시 후 metrics/events/audit에서 반영 여부를 확인한다.

### 정책 변경 공지

1. `POLICY` 유형을 선택한다.
2. 변경 전/후 요약을 작성한다.
3. 시행일을 명확히 표시한다.
4. 필요한 경우 `requiresAcknowledgement=true`로 설정한다.
5. 개인정보 처리방침/약관 문서 링크를 포함한다.
6. 법무·운영 승인 기록을 감사 로그와 연결한다.

---

## 16. 보안 금지 사항

다음 행위는 금지된다.

- 공지 본문에 사용자별 급여액을 삽입하는 행위
- 공지 대상 조건에 대출액, 지출액, 저축액, 납치금액을 사용하는 행위
- push token 원문을 테스트 발송 화면에 표시하는 행위
- 광고주가 요청한 세그먼트를 그대로 관리자 공지/광고 타겟으로 사용하는 행위
- 관리자 사유 없이 게시 상태를 바꾸는 행위
- 감사 로그 없이 긴급 공지를 게시하는 행위
- 개인정보 export 파일에 공지 본문 원문과 사용자 식별자를 함께 포함하는 행위
- 클라이언트에서만 검증하고 서버 검증을 생략하는 행위

---

## 17. 상용화 완료 기준

`notice-management` 기능은 다음 조건을 충족할 때 상용화 완료로 본다.

1. 관리자 인증, MFA, RBAC가 적용된다.
2. 모든 mutation에 `X-Admin-Reason`이 적용된다.
3. 감사 로그가 redacted diff를 저장한다.
4. 공지 목록·작성·수정·게시·정지·보관·복제·테스트 발송이 동작한다.
5. 알림 서비스와 테스트 발송 계약이 검증된다.
6. placement별 사용자 앱 노출이 E2E로 검증된다.
7. raw 금융 데이터, raw 개인정보, raw push token 노출이 차단된다.
8. 광고 금융 타겟팅 금지가 테스트로 검증된다.
9. 비식별 export가 정책에 맞게 동작한다.
10. staging/production 배포 전 E2E/QA가 통과한다.
11. 운영 runbook과 rollback 절차가 문서화된다.
12. 장애/점검/정책/광고 공지 시나리오가 모두 검증된다.

---

## 18. 연계 파일

```txt
apps/admin/src/app/notices/page.tsx
apps/admin/src/features/notice-management/README.md
services/api/src/routes/admin.routes.ts
services/api/src/routes/notifications.routes.ts
services/api/src/middleware/auth.middleware.ts
services/api/src/middleware/audit-log.middleware.ts
services/api/src/middleware/rate-limit.middleware.ts
services/api/src/middleware/error.middleware.ts
services/notifications/src/index.ts
services/notifications/src/retry-queue.ts
services/scheduler/src/jobs/data-retention-cleanup.job.ts
```

---

## 19. 완성도 판정

이 문서는 `apps/admin/src/features/notice-management/README.md` 파일 단위에서 공지사항 운영 모듈의 책임, 도메인 모델, API 계약, 상태 전이, 관리자 권한, 개인정보·금융정보 보호, 광고 정책, 알림 연동, 감사 로그, UI/UX, 테스트, 운영 runbook, 상용화 완료 기준을 포함한다.

문서상·이론상 이 파일은 급여납치 관리자 콘솔의 notice-management 기능을 구현·검증·운영하기 위해 필요한 기준을 모두 포함한 최종본이다.

실제 프로젝트 종합 운영 100%는 저장소의 실제 API, 관리자 인증/RBAC/MFA, 감사 로그 DB, 알림 서비스, 배포 환경, staging/production E2E/QA 통과로 확정한다.
