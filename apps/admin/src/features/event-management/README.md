# 급여납치 관리자 콘솔 이벤트 관리 기능 최종 README

관리자 콘솔 최종 파일 위치: `apps/admin/src/features/event-management/README.md`

문서 버전: `v3.1.3`  
적용 범위: `apps/admin/src/features/event-management`  
대상 화면: `apps/admin/src/app/events/page.tsx`, `apps/admin/src/app/metrics/page.tsx`, `apps/admin/src/app/dashboard/page.tsx`  
관리 API 경계: `/admin/api/v1/events`, `/admin/api/v1/metrics`, `/admin/api/v1/dashboard`  
운영 원칙: 서버 권위, 관리자 RBAC, MFA, 감사 로그, 비식별 집계, 원문 금융 데이터 차단, 광고 금융 타겟팅 금지

---

## 1. 기능 목적

`event-management`는 급여납치 플랫폼의 관리자 콘솔에서 운영 이벤트, 보안 이벤트, 감사 로그, 스케줄러 실행 결과, 알림 발송 결과, 커뮤니티 모더레이션 이벤트, 광고/제휴 운영 이벤트, 장애/incident 신호를 조회하고 처리하기 위한 기능 영역이다.

이 기능은 단순 로그 뷰어가 아니라 급여납치의 상용 운영 안정성을 보장하기 위한 운영 관제 기능이다. 모든 이벤트는 관리자 권한, 감사 가능성, 개인정보 보호, 금융 데이터 보호, 광고 정책 분리를 전제로 처리되어야 한다.

이 README는 `event-management` 기능의 최종 구현 기준, API 계약, 보안 정책, 프라이버시 정책, 이벤트 분류 체계, 관리자 작업 규칙, 테스트 기준, 운영 기준을 정의한다.

---

## 2. 급여납치 플랫폼 내 역할

급여납치는 급여 계획, 일일 예산, 고정 지출, 고정 저축, 변동 지출, 알림, 레벨업, 커뮤니티, 광고/제휴, 관리자 운영을 통합하는 서버 권위형 급여관리·가계부·자기계발 플랫폼이다.

`event-management`는 다음 운영 흐름을 연결한다.

1. 사용자 인증, 세션, 관리자 인증, MFA 검증 이벤트 추적
2. 급여 계획 생성, 활성화, 재계산, 마감 이벤트 추적
3. 일일 예산 계산, 예산 초과, 잔여 예산 이벤트 추적
4. 고정 지출 납부 예정, 납부 완료, 미납 이벤트 추적
5. 고정 저축 이체 예정, 저축 달성률, 목표 변경 이벤트 추적
6. 변동 지출 생성, 환불, 취소, 카테고리 변경 이벤트 추적
7. 알림 발송, 실패, 재시도, 토큰 정리 이벤트 추적
8. 레벨업/성장 과제 달성, 배지, 챌린지 이벤트 추적
9. 커뮤니티 글, 댓글, 신고, 숨김, 복원, 제재 이벤트 추적
10. 광고/제휴 캠페인 생성, 승인, 중단, 노출/클릭 집계 이벤트 추적
11. 관리자 조치, 운영자 사유, 권한 변경, 감사 로그 이벤트 추적
12. Scheduler Cron, Queue, DLQ, retry, data retention 이벤트 추적
13. 보안 위험, rate-limit, access denial, token rotation 이벤트 추적
14. incident, service health, readiness, 배포 안정성 이벤트 추적
15. 비식별 export, privacy export, 탈퇴/익명화/보존 정책 이벤트 추적

---

## 3. 완료 기준

이 기능의 문서상·이론상 완료 기준은 다음을 모두 만족하는 것이다.

- 이벤트 목록 조회 기능이 `/admin/api/v1/events`를 기준으로 정의되어 있다.
- 이벤트 상세 보기, 필터, 검색, 정렬, 상태 변경, 비식별 export가 정의되어 있다.
- 이벤트 action에는 관리자 사유 `X-Admin-Reason`이 필수로 연결되어 있다.
- 관리자 인증은 RBAC와 MFA를 전제로 한다.
- 모든 mutation은 감사 로그에 기록되어야 한다.
- 이벤트 payload에는 raw 급여, raw 소득, raw 지출, raw 저축, raw 납치금액, raw 계좌, raw 카드, raw push token이 포함되면 안 된다.
- 광고/제휴 이벤트는 급여·소득·지출·저축·납치금액 기반 타겟팅과 분리되어야 한다.
- 사용자 식별은 내부 ID 또는 hash 식별자 기준이며 외부 표시에는 마스킹 또는 익명 표시가 적용되어야 한다.
- 이벤트 export는 redacted export만 허용한다.
- 이벤트 상태 변경은 ACKNOWLEDGE, RESOLVE, RETRY, ARCHIVE, EXPORT_REDACTED 흐름을 지원한다.
- 서비스 이벤트는 API, Scheduler, Notifications, Admin, Database, Queue, Storage, Ads, Community, Growth 영역을 포함한다.
- 이벤트 유형은 AUDIT, DOMAIN, SECURITY, SCHEDULER, NOTIFICATION, COMMUNITY, ADS, ADMIN, SYSTEM을 포함한다.
- 이벤트 severity와 status가 운영 기준에 맞게 분리되어야 한다.
- 모든 시간은 저장 기준 UTC, 표시 기준 Asia/Seoul을 따른다.
- 운영 UI는 no-store fetch와 관리자 API boundary를 사용한다.
- 기능 README는 상용 운영 담당자가 바로 사용할 수 있는 정책, API, QA, 장애 대응 기준을 포함한다.

---

## 4. 이벤트 도메인 모델

### 4.1 EventRecord

이벤트 레코드는 다음 개념 필드를 가져야 한다.

| 필드                        | 설명                       | 정책                  |
| --------------------------- | -------------------------- | --------------------- |
| `id`                        | 이벤트 고유 ID             | 불변                  |
| `service`                   | 이벤트 발생 서비스         | enum                  |
| `type`                      | 이벤트 유형                | enum                  |
| `severity`                  | 심각도                     | enum                  |
| `status`                    | 처리 상태                  | enum                  |
| `title`                     | 이벤트 제목                | 민감정보 redaction    |
| `summary`                   | 이벤트 요약                | 민감정보 redaction    |
| `actorType`                 | 사용자/관리자/시스템       | enum                  |
| `actorHash`                 | 행위자 hash                | 원문 식별자 금지      |
| `targetType`                | 대상 도메인                | enum                  |
| `targetId`                  | 대상 ID                    | 내부 ID 또는 hash     |
| `requestId`                 | 요청 추적 ID               | 로그 연결             |
| `traceId`                   | 분산 추적 ID               | optional              |
| `createdAt`                 | 생성 시각                  | UTC 저장              |
| `updatedAt`                 | 수정 시각                  | UTC 저장              |
| `acknowledgedAt`            | 확인 시각                  | optional              |
| `resolvedAt`                | 해결 시각                  | optional              |
| `metadata`                  | 비식별 메타데이터          | 원문 금융 데이터 금지 |
| `adminReasonRequired`       | 관리자 사유 필수 여부      | true                  |
| `rawFinancialDataLogged`    | 원문 금융 데이터 포함 여부 | false 고정            |
| `rawPushTokenLogged`        | raw push token 포함 여부   | false 고정            |
| `rawAmountInPayload`        | 원문 금액 포함 여부        | false 고정            |
| `adsFinancialTargetingUsed` | 광고 금융 타겟팅 사용 여부 | false 고정            |
| `tokenHashOnly`             | 토큰 hash-only 여부        | true 고정             |

### 4.2 서비스 분류

| 서비스          | 설명                                                          |
| --------------- | ------------------------------------------------------------- |
| `api`           | 사용자/관리자 API, 서버 권위 계산, 인증, 도메인 mutation      |
| `scheduler`     | 급여일 알림, 고정지출 알림, 월간 납치 마감, retention cleanup |
| `notifications` | FCM, queue, retry, token cleanup, 알림 정책                   |
| `admin`         | 관리자 콘솔, RBAC, MFA, 운영 조치                             |
| `database`      | Neon PostgreSQL, Drizzle, transaction, migration, backup      |
| `queue`         | Workers Queue, retry, DLQ, idempotency                        |
| `storage`       | R2 업로드, 파일 스캔, 다운로드, 삭제                          |
| `ads`           | 광고/제휴 캠페인, 비개인화/문맥 기반 운영                     |
| `community`     | 글, 댓글, 신고, 모더레이션, 제재                              |
| `growth`        | 레벨업, 과제, 배지, 챌린지                                    |

### 4.3 이벤트 유형

| 유형           | 설명                                               |
| -------------- | -------------------------------------------------- |
| `AUDIT`        | 관리자 조치 및 감사 로그                           |
| `DOMAIN`       | 급여·예산·지출·저축 도메인 이벤트                  |
| `SECURITY`     | 인증, rate-limit, 권한, 토큰, 세션 이벤트          |
| `SCHEDULER`    | Cron, scheduled job, cleanup, monthly close 이벤트 |
| `NOTIFICATION` | 알림 발송, 실패, retry, token cleanup 이벤트       |
| `COMMUNITY`    | 커뮤니티 신고, 숨김, 복원, 제재 이벤트             |
| `ADS`          | 광고/제휴 정책, 캠페인, 집계 이벤트                |
| `ADMIN`        | 관리자 콘솔 운영 이벤트                            |
| `SYSTEM`       | health, readiness, incident, 배포 이벤트           |

---

## 5. 상태·심각도 정책

### 5.1 상태

| 상태           | 설명        | 관리자 조치             |
| -------------- | ----------- | ----------------------- |
| `OPEN`         | 신규 이벤트 | 검토 필요               |
| `ACKNOWLEDGED` | 확인 완료   | 담당자 추적             |
| `IN_PROGRESS`  | 처리 중     | 조치 중                 |
| `RESOLVED`     | 해결 완료   | 감사 로그 유지          |
| `RETRYING`     | 재시도 중   | queue/retry 확인        |
| `FAILED`       | 실패        | incident 또는 수동 조치 |
| `ARCHIVED`     | 보관        | 읽기 전용               |

### 5.2 심각도

| 심각도     | 기준                                             |
| ---------- | ------------------------------------------------ |
| `INFO`     | 정상 운영 기록, 추적 목적                        |
| `LOW`      | 사용자 영향 낮음, 단일 이벤트                    |
| `MEDIUM`   | 반복 이벤트, 일부 사용자 영향                    |
| `HIGH`     | 운영자 개입 필요, 장애 전조                      |
| `CRITICAL` | 서비스 장애, 데이터 무결성, 보안 위험, 정책 위반 |

---

## 6. 관리자 조치 정책

이벤트 관리 기능에서 허용되는 관리자 조치는 다음과 같다.

| 액션              | 설명               | 필수 조건                   |
| ----------------- | ------------------ | --------------------------- |
| `ACKNOWLEDGE`     | 이벤트 확인 처리   | `X-Admin-Reason`            |
| `RESOLVE`         | 이벤트 해결 처리   | `X-Admin-Reason`, 결과 메모 |
| `RETRY`           | 실패 작업 재시도   | idempotency key, queue 정책 |
| `ARCHIVE`         | 이벤트 보관        | 해결 또는 장기 보존 기준    |
| `EXPORT_REDACTED` | 비식별 export 요청 | 관리자 사유, RBAC, audit    |

모든 관리자 mutation은 다음 헤더를 가져야 한다.

```http
X-Admin-Reason: <관리자 조치 사유>
X-Raw-Financial-Data-Logged: false
X-Raw-Push-Token-Logged: false
X-Ad-Financial-Targeting-Used: false
```

관리자 사유는 공백이 아니어야 하며, 운영 감사 로그에 저장되어야 한다. 단, 저장 시에도 비밀번호, 토큰, 계좌, 카드, 급여, 지출, 저축, 납치금액 등 민감 원문은 redaction되어야 한다.

---

## 7. API 계약

### 7.1 이벤트 목록 조회

```http
GET /admin/api/v1/events?service=api&type=SECURITY&severity=HIGH&status=OPEN&q=token&limit=50&cursor=...
```

응답은 다음 구조를 따른다.

```json
{
  "data": {
    "items": [],
    "nextCursor": null,
    "stats": {
      "total": 0,
      "open": 0,
      "critical": 0,
      "security": 0,
      "failed": 0,
      "privacyPassRate": "100.00%"
    },
    "privacyGuard": {
      "rawFinancialDataLogged": false,
      "rawPushTokenLogged": false,
      "rawAmountInPayload": false,
      "adsFinancialTargetingUsed": false,
      "tokenHashOnly": true,
      "adminReasonRequired": true
    }
  }
}
```

### 7.2 이벤트 상세 조회

```http
GET /admin/api/v1/events/:eventId
```

상세 응답은 이벤트 본문과 연결된 audit trail, retry trail, related events를 포함할 수 있다. 단, 원문 금융 데이터와 raw push token은 절대 포함하지 않는다.

### 7.3 이벤트 상태 변경

```http
POST /admin/api/v1/events/:eventId/acknowledge
POST /admin/api/v1/events/:eventId/resolve
POST /admin/api/v1/events/:eventId/retry
POST /admin/api/v1/events/:eventId/archive
```

요청 body 예시:

```json
{
  "reason": "운영 점검 완료",
  "memo": "Queue 재시도 성공 확인",
  "rawFinancialDataLogged": false,
  "rawPushTokenLogged": false,
  "adsFinancialTargetingUsed": false
}
```

### 7.4 비식별 export

```http
POST /admin/api/v1/events/exports/redacted
```

비식별 export에는 다음만 허용한다.

- event id
- service/type/severity/status
- masked 또는 hash actor
- target type/id
- redacted title/summary
- createdAt/updatedAt
- 처리 상태
- 관리자 조치 사유 redacted text

다음은 금지한다.

- 급여 원문 금액
- 소득 원문 금액
- 지출 원문 금액
- 저축 원문 금액
- 납치금액 원문
- 계좌/카드 원문
- raw push token
- FCM token 원문
- 광고 금융 타겟팅 조건
- 이메일/전화번호 원문

---

## 8. 프라이버시·보안 정책

### 8.1 원문 금융 데이터 차단

이벤트 시스템은 급여납치의 민감 도메인을 다루지만, 이벤트 payload에는 원문 금액을 저장하지 않는다. 필요한 경우 구간, 상태, 집계값, hash, 비식별 카운트만 사용한다.

금지 키워드 예시:

- salary amount
- income amount
- expense amount
- savings amount
- daily budget amount
- hijack amount
- carry over amount
- account number
- card number
- payslip raw text
- bankbook raw text

### 8.2 토큰 정책

알림 이벤트는 push token을 원문으로 저장하지 않는다.

- `fcmToken`: 금지
- `pushToken`: 금지
- `deviceToken`: 금지
- `tokenHash`: 허용
- `tokenHashPrefix`: 제한적으로 허용
- `invalidTokenCount`: 허용

### 8.3 광고/제휴 분리 정책

광고 이벤트는 다음을 준수한다.

- 급여액, 지출액, 저축액, 납치금액 기반 타겟팅 금지
- 대출, 부채, 금융 취약성 기반 타겟팅 금지
- 사용자 원문 재무 데이터의 광고주 전달 금지
- 광고/제휴 노출은 `광고`, `제휴` 라벨 정책과 연결
- 기본값은 문맥 기반 또는 비개인화 집계

### 8.4 감사 로그 정책

모든 관리자 조치는 감사 로그에 기록한다.

감사 로그 필수 항목:

- admin id 또는 admin hash
- role
- action
- target type
- target id
- reason
- request id
- ip hash
- user-agent hash
- createdAt
- result

감사 로그 금지 항목:

- 비밀번호
- refresh token
- access token
- raw MFA code
- recovery code
- raw email/phone/account/card
- raw payroll/expense/savings/hijack amount

---

## 9. 서버 권위 연동

이벤트 관리는 서버 권위 계산을 직접 수행하지 않는다. 계산 결과와 상태 변화만 비식별 이벤트로 수신한다.

서버 권위 공식은 다음과 같다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

이벤트 payload에서는 위 공식의 원문 입력값을 저장하지 않는다. 대신 다음처럼 상태 중심으로 기록한다.

```json
{
  "type": "DOMAIN",
  "targetType": "PayrollPlan",
  "summary": "월간 급여 계획 재계산 완료",
  "metadata": {
    "calculation": "expected_hijack_recalculated",
    "resultStatus": "SUCCESS",
    "amountBand": "REDACTED_BAND",
    "rawAmountInPayload": false
  }
}
```

---

## 10. UI/UX 기준

관리자 이벤트 화면은 다음 기준을 따른다.

- 다크 테마 기반 운영 콘솔 UI
- 반응형 레이아웃
- 키보드 접근 가능한 필터와 액션 버튼
- 상태, 심각도, 서비스, 유형별 badge 구분
- 상세 패널에서 민감정보 redaction 상태 표시
- `rawFinancialDataLogged=false`, `rawPushTokenLogged=false`, `adsFinancialTargetingUsed=false` guard 표시
- empty state, loading state, error state 제공
- 모든 fetch는 `cache: no-store`, `credentials: include`
- 관리자 mutation에는 사유 입력 필수

---

## 11. 파일 구조 권장안

```text
apps/admin/src/features/event-management/
├── README.md
├── event-management.types.ts
├── event-management.constants.ts
├── event-management.api.ts
├── event-management.guards.ts
├── event-management.formatters.ts
├── event-management.view-model.ts
├── event-management.actions.ts
└── __tests__/
    ├── event-management.guards.test.ts
    ├── event-management.view-model.test.ts
    └── event-management.actions.test.ts
```

현재 작업 파일은 README이므로 위 구조를 생성하지는 않는다. 다만 이 README는 해당 구조를 구현할 때의 문서상 최종 기준으로 사용한다.

---

## 12. TypeScript 타입 기준

권장 타입은 다음과 같다.

```ts
type EventService = "api" | "scheduler" | "notifications" | "admin" | "database" | "queue" | "storage" | "ads" | "community" | "growth";
type EventType = "AUDIT" | "DOMAIN" | "SECURITY" | "SCHEDULER" | "NOTIFICATION" | "COMMUNITY" | "ADS" | "ADMIN" | "SYSTEM";
type EventSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type EventStatus = "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "RETRYING" | "FAILED" | "ARCHIVED";

type PrivacyGuard = {
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawAmountInPayload: false;
  readonly adsFinancialTargetingUsed: false;
  readonly tokenHashOnly: true;
  readonly adminReasonRequired: true;
};
```

---

## 13. 테스트 기준

### 13.1 정적 검증

- TypeScript strict 통과
- no implicit any
- no unused locals
- no unchecked indexed access 대응
- enum fallback 처리
- 날짜 parse fallback 처리
- fetch 응답 error redaction 처리

### 13.2 단위 테스트

- 이벤트 normalizer가 raw finance flag를 false로 강제하는지 확인
- 민감 키 redaction 확인
- 금액 원문 payload 차단 확인
- raw push token 차단 확인
- 광고 금융 타겟팅 차단 확인
- 관리자 사유 누락 시 mutation 차단 확인
- severity/status sorting 확인
- redacted export payload 확인

### 13.3 E2E 테스트

- 관리자 로그인 후 이벤트 목록 진입
- 서비스/type/status/severity 필터 동작
- 이벤트 상세 패널 열기
- 관리자 사유 없이 action 시도 시 실패
- 사유 입력 후 acknowledge/resolve 성공
- retry action이 idempotency 기준으로 처리되는지 확인
- redacted export 요청 성공
- 응답 payload에 raw 금융 데이터가 없는지 확인
- 광고 이벤트에서 금융 타겟팅 조건이 없는지 확인

---

## 14. 운영 Runbook

### 14.1 CRITICAL SECURITY 이벤트

1. 이벤트 상세 확인
2. actor hash, request id, trace id 확인
3. 인증/권한 로그 연결 확인
4. 반복 발생 시 rate-limit 또는 계정 잠금 검토
5. 관리자 사유와 함께 ACKNOWLEDGE
6. 조치 후 RESOLVE 또는 incident escalation

### 14.2 Scheduler 실패 이벤트

1. job name, schedule id, queue id 확인
2. idempotency key 확인
3. 재시도 가능 오류인지 확인
4. `RETRY` 실행
5. retry 실패 시 DLQ와 incident 연결
6. 월간 납치 마감 job은 중복 마감 방지 lock 확인

### 14.3 Notification 실패 이벤트

1. provider error classification 확인
2. token hash만 사용되었는지 확인
3. invalid token이면 cleanup queue 연결
4. transient 오류이면 retry queue 확인
5. raw push token이 로그에 없는지 확인

### 14.4 Ads 정책 이벤트

1. 광고/제휴 라벨 확인
2. 금융 원문 타겟팅 조건이 없는지 확인
3. contextual/non-personalized 여부 확인
4. 위반 시 캠페인 중지 및 audit 기록
5. 광고주에게 사용자 원문 데이터가 전달되지 않았는지 확인

### 14.5 Community 신고 이벤트

1. 신고 대상의 익명 표시 유지 확인
2. 내부 user id는 hash 또는 관리자 권한 내에서만 사용
3. 금융 원문 노출 여부 검토
4. 위험 조언, 개인정보 노출, 광고성 스팸 여부 검토
5. 숨김/복원/제재 조치는 관리자 사유와 감사 로그 필수

---

## 15. 배포·운영 체크리스트

- [ ] `/admin/api/v1/events` 목록 API 연결
- [ ] `/admin/api/v1/events/:id` 상세 API 연결
- [ ] acknowledge/resolve/retry/archive action API 연결
- [ ] redacted export API 연결
- [ ] 관리자 인증/RBAC/MFA middleware 연결
- [ ] `X-Admin-Reason` 미입력 mutation 차단
- [ ] audit log sink 연결
- [ ] IP/User-Agent hash 저장
- [ ] raw finance, raw push token, raw amount flag false 강제
- [ ] ads financial targeting false 강제
- [ ] no-store fetch 적용
- [ ] UTC 저장, Asia/Seoul 표시
- [ ] E2E/QA 통과
- [ ] staging 배포 검증
- [ ] production incident runbook 연결

---

## 16. 금지 패턴

다음 구현은 금지한다.

```ts
console.log(event.payload);
console.log(pushToken);
console.log(user.email);
console.log(user.phone);
console.log(payroll.expectedSalary);
console.log(expense.amount);
console.log(savings.amount);
console.log(hijackAmount);
```

다음처럼 변환해야 한다.

```ts
console.log({
  eventId: event.id,
  service: event.service,
  type: event.type,
  severity: event.severity,
  actorHash: event.actorHash,
  rawFinancialDataLogged: false,
  rawPushTokenLogged: false,
  adsFinancialTargetingUsed: false,
});
```

---

## 17. 완성도 판정

이 README는 `apps/admin/src/features/event-management/README.md` 파일 단위에서 다음 기준을 충족한다.

- 이벤트 관리 기능의 목적과 범위를 정의한다.
- 급여납치 전체 도메인과의 연결을 설명한다.
- 서버 권위 계산과 이벤트의 책임 분리를 명확히 한다.
- 관리자 RBAC, MFA, `X-Admin-Reason`, 감사 로그 기준을 포함한다.
- raw 금융 데이터, raw 개인정보, raw push token, 광고 금융 타겟팅 금지 정책을 포함한다.
- API 계약, action 계약, redacted export 정책을 포함한다.
- UI/UX 기준, 타입 기준, 테스트 기준, 운영 runbook, 배포 체크리스트를 포함한다.
- 상용 운영 수준의 event-management 기능 구현 기준을 문서화한다.

객관적 운영 기준에서 프로젝트 종합 100%는 실제 저장소의 API, DB, Queue, Audit sink, 관리자 인증, 배포 환경, E2E/QA가 함께 통과되어야 확정된다. 이 README 자체는 문서상·이론상 해당 기능 파일의 최종 기준으로 사용 가능하다.
