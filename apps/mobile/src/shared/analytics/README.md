# 급여납치 Mobile Shared Analytics 모듈 README

문서 버전: v3.1.0  
대상 경로: `apps/mobile/src/shared/analytics/README.md`  
모듈 범위: 모바일 공통 행동 로그, 이벤트 추적, 성능 계측, 개인정보 보호형 분석, 광고·제휴 비식별 리포팅, 운영 관측성

## 1. 모듈 목적

`shared/analytics`는 급여납치 모바일 앱 전체에서 공통으로 사용하는 분석·행동 로그·성능 계측 계층이다. 이 모듈은 급여 홈, 급여 계획, 일일 예산, 고정지출, 고정저축, 변동지출, 알림, LV UP, 커뮤니티, 글쓰기, 마이페이지, 광고·제휴 영역의 사용자 경험을 개선하기 위해 필요한 최소한의 이벤트만 수집한다.

핵심 원칙은 다음과 같다.

1. 서버 권위 원칙을 훼손하지 않는다.
2. 금액, 급여, 지출, 저축, 납치금액, 계좌, 카드, 이메일, 전화번호, 푸시 토큰 등 원시 민감 데이터를 분석 이벤트에 포함하지 않는다.
3. 이벤트는 제품 품질, 장애 분석, 퍼널 개선, 비식별 통계, 광고·제휴 노출 무결성 확인 목적에 한정한다.
4. 광고·제휴 분석은 금융 금액 기반 타겟팅을 금지하고, 화면 맥락 기반·비개인화·집계형 지표만 허용한다.
5. 모바일 앱은 오프라인에서도 안전하게 동작해야 하며, 이벤트 큐는 재전송 가능하지만 중복 처리와 개인정보 노출을 방지해야 한다.

## 2. 책임 범위

이 모듈은 다음 책임을 가진다.

- 공통 이벤트 이름, 속성 스키마, 이벤트 버전 관리
- 화면 진입, 버튼 클릭, 폼 제출, API 결과, 오류, 성능 지표 기록
- 인증 상태, 온보딩 상태, 기능 플래그, 앱 버전, 플랫폼, 지역/타임존 같은 비민감 컨텍스트 부착
- correlation id, session id hash, anonymous user id hash 기반 추적
- 이벤트 payload redaction, allowlist 검증, 금지 키워드 차단
- 오프라인 큐 저장, 재시도, backoff, 중복 방지 idempotency key 생성
- 운영 관측성, QA 검증, E2E 테스트 계측 지원
- 광고·제휴 노출·클릭·전환 이벤트의 비식별 집계 정책 적용

이 모듈은 다음을 수행하지 않는다.

- 급여, 예산, 지출, 저축 계산
- 서버 권위 데이터를 클라이언트에서 최종 산출하거나 확정
- 사용자 원시 개인정보 저장
- 금융 상태 기반 광고 타겟팅
- 커뮤니티 작성자 실명화 또는 내부 user_id 노출
- 의료·금융·법률 조언 이벤트 분류를 통한 개인 프로파일링

## 3. 디렉터리 권장 구조

```text
apps/mobile/src/shared/analytics/
├── README.md
├── analytics.client.ts
├── analytics.events.ts
├── analytics.queue.ts
├── analytics.redaction.ts
├── analytics.transport.ts
├── analytics.types.ts
├── analytics.constants.ts
├── analytics.test.ts
└── index.ts
```

필수 공개 API는 `index.ts`에서만 export한다.

```ts
export { trackEvent, trackScreen, trackError, trackPerformance } from "./analytics.client";
export type { AnalyticsEventName, AnalyticsPayload, AnalyticsContext } from "./analytics.types";
```

## 4. 이벤트 분류

| 분류          | 목적                    | 예시                                                            |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| `screen_view` | 화면 진입 분석          | `salary_home.view`, `plan.view`, `community.write.view`         |
| `ui_action`   | 버튼·탭·필터 상호작용   | `daily_budget.filter.change`, `notification.read.click`         |
| `form_submit` | 제출 성공/실패 계측     | `variable_expense.create.submit`, `growth_task.complete.submit` |
| `api_result`  | API 성공·실패·지연      | `api.payroll_home.success`, `api.notifications.failure`         |
| `performance` | 렌더링·네트워크·큐 성능 | `app_boot.duration`, `screen_tti.measure`                       |
| `error`       | 사용자 영향 오류        | `api_error`, `render_error`, `queue_retry_exhausted`            |
| `ad_partner`  | 광고·제휴 무결성        | `ad_impression`, `partner_click`                                |
| `ops`         | 운영·QA·E2E 검증        | `e2e_checkpoint`, `feature_flag_exposure`                       |

## 5. 표준 이벤트 컨텍스트

모든 이벤트에는 다음 공통 컨텍스트를 포함한다.

```ts
type AnalyticsContext = {
  app: "salary-hijacking-mobile";
  schemaVersion: "3.1.0";
  platform: "ios" | "android" | "web" | string;
  appVersion: string;
  buildNumber: string;
  locale: "ko-KR" | string;
  timezone: "Asia/Seoul" | string;
  routeName: string;
  screenName: string;
  correlationId: string;
  sessionIdHash: string | null;
  userIdHash: string | null;
  role: "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
  authState: "ANONYMOUS" | "AUTHENTICATED" | "EXPIRED";
  networkState: "ONLINE" | "OFFLINE" | "UNKNOWN";
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
};
```

`userIdHash`와 `sessionIdHash`는 서버가 제공한 비가역 해시 또는 클라이언트 임시 익명 해시만 허용한다. 이메일, 전화번호, 실명, 계좌, 카드, FCM token, APNs token은 절대 허용하지 않는다.

## 6. 금지 payload

분석 이벤트 payload에는 다음 값이 들어가면 안 된다.

- 실제 급여 금액, 예상 급여, 실수령액
- 일일 예산 금액, 남은 금액, 초과 금액, 납치금액
- 고정지출·변동지출·고정저축의 실제 금액
- 계좌번호, 카드번호, 결제 식별자
- 이메일, 전화번호, 주소, 실명, 생년월일
- 액세스 토큰, 리프레시 토큰, 세션 쿠키, FCM/APNs push token
- 커뮤니티 내부 user_id, 관리자 내부 메모 원문
- 광고 타겟팅용 금융 상태, 소득 구간, 소비 성향

허용되는 값은 다음처럼 비식별·집계·상태형 값으로 제한한다.

```ts
trackEvent("daily_budget.status.view", {
  status: "SAFE" | "WATCH" | "EXCEEDED",
  remainingBucket: "ZERO" | "LOW" | "MID" | "HIGH",
  hasFixedExpenseDueToday: boolean,
  rawFinancialDataExposed: false,
});
```

## 7. 서버 권위 분석 원칙

급여납치의 핵심 계산은 서버 권위로 유지한다. 모바일 분석 모듈은 계산 결과를 추론하거나 재계산하지 않는다.

- `planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense`
- `expected_hijack = max(0, expected_salary - planned_total_expense)`
- `today_remaining_budget = max(0, daily_limit - today_variable_expense)`
- `monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)`

위 공식 자체는 문서화할 수 있지만, 이벤트 payload에 공식 입력값과 산출 원시 금액을 담지 않는다. 필요한 경우 서버가 내려준 상태값, 비율 bucket, 마스킹 라벨만 기록한다.

## 8. 필수 이벤트 목록

### 8.1 앱·인증

- `app.boot.start`
- `app.boot.complete`
- `app.boot.offline_fallback`
- `auth.login.view`
- `auth.login.success`
- `auth.login.failure`
- `auth.signup.view`
- `auth.signup.success`
- `auth.refresh.rotate.success`
- `auth.logout.success`

### 8.2 급여 홈

- `salary_home.view`
- `salary_home.recalculate.click`
- `salary_home.recalculate.success`
- `salary_home.server_authority_mismatch.blocked`
- `salary_home.ad_contextual_impression`

### 8.3 급여 계획

- `plan.view`
- `plan.payroll_cycle.change`
- `plan.fixed_expense.open`
- `plan.fixed_savings.open`
- `plan.daily_budget.open`
- `plan.recalculate.success`

### 8.4 일일 예산

- `daily_budget.view`
- `daily_budget.status.view`
- `daily_budget.exceeded.warning.view`
- `daily_budget.reset_policy.view`
- `daily_budget.notification_opt_in.change`

### 8.5 고정지출·변동지출

- `fixed_expense.list.view`
- `fixed_expense.due_reminder.view`
- `variable_expense.create.view`
- `variable_expense.create.success`
- `variable_expense.create.failure`
- `variable_expense.attachment.scan_required`

### 8.6 고정저축

- `savings.list.view`
- `savings.goal.progress.view`
- `savings.plan.create.success`
- `savings.automation.reminder.view`

### 8.7 알림

- `notifications.view`
- `notifications.read.success`
- `notifications.read_all.success`
- `notifications.archive.success`
- `notifications.push_consent.change`
- `notifications.quiet_hours.change`

### 8.8 LV UP

- `level.dashboard.view`
- `level.task.complete.success`
- `level.reading.view`
- `level.news.view`
- `level.english.view`
- `level.health.view`
- `level.community_proof.click`

### 8.9 커뮤니티

- `community.feed.view`
- `community.post.view`
- `community.write.view`
- `community.write.preview.success`
- `community.write.blocked_by_policy`
- `community.comment.create.success`
- `community.report.submit`
- `community.moderation_notice.view`

### 8.10 마이페이지·운영

- `profile.view`
- `profile.data_export.request`
- `profile.withdraw.request`
- `profile.privacy_settings.view`
- `support.ticket.create.success`
- `ops.e2e_checkpoint.pass`

## 9. 광고·제휴 분석 정책

광고·제휴 이벤트는 다음만 허용한다.

- 광고 슬롯 id
- 화면 id
- 캠페인 id 또는 제휴 id의 서버 발급 public id
- 노출/클릭/닫기 같은 행동
- 비식별 device class 또는 platform
- contextual category
- frequency cap 결과
- consent 상태

다음은 금지한다.

- 급여 금액 기반 segment
- 지출/저축/납치금액 기반 segment
- 대출 가능성, 상환능력, 소득 추정
- 광고주에게 user id, device token, raw financial event 제공
- 커뮤니티 원문 기반 민감 추론 타겟팅

표준 이벤트는 다음과 같다.

```ts
trackEvent("ad_partner.impression", {
  slotId: "salary-home-bottom",
  campaignPublicId: "cmp_public_...hash",
  contextualCategory: "salary_home",
  consent: "NON_PERSONALIZED",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});
```

## 10. 이벤트 전송 API

모바일 클라이언트는 배치 전송을 기본으로 한다.

```http
POST /api/v1/analytics/events
Content-Type: application/json
X-Correlation-Id: <uuid>
X-Client-Platform: ios|android|web
X-Raw-Financial-Data-Exposed: false
X-Raw-Personal-Data-Exposed: false
X-Raw-Push-Token-Exposed: false
X-Ad-Financial-Targeting-Used: false
```

요청 body:

```json
{
  "schemaVersion": "3.1.0",
  "client": {
    "app": "salary-hijacking-mobile",
    "platform": "ios",
    "timezone": "Asia/Seoul",
    "locale": "ko-KR"
  },
  "events": [
    {
      "eventId": "evt_...",
      "eventName": "salary_home.view",
      "eventType": "screen_view",
      "occurredAt": "2026-06-24T00:00:00.000Z",
      "payload": {
        "screenName": "salary_home",
        "rawFinancialDataExposed": false,
        "rawPersonalDataExposed": false,
        "rawPushTokenExposed": false,
        "adsFinancialTargetingUsed": false
      }
    }
  ]
}
```

응답:

```json
{
  "ok": true,
  "accepted": 1,
  "rejected": 0,
  "correlationId": "..."
}
```

## 11. 오프라인 큐 정책

오프라인 이벤트 큐는 다음 정책을 따른다.

1. 최대 500개 이벤트 또는 512KB 중 먼저 도달하는 기준으로 제한한다.
2. 7일이 지난 이벤트는 폐기한다.
3. 이벤트별 `eventId`와 `idempotencyKey`를 생성해 중복 수집을 방지한다.
4. 민감 키워드 검사를 통과하지 못한 이벤트는 큐에 저장하지 않는다.
5. 재전송은 exponential backoff와 jitter를 적용한다.
6. 앱 삭제, 로그아웃, 계정 탈퇴 시 큐를 즉시 삭제한다.

## 12. Redaction 규칙

모든 이벤트는 전송 전 `analytics.redaction.ts`에서 검증한다.

필수 검사:

- key allowlist 검사
- 금지 key 검사
- 문자열 내 이메일/전화번호/계좌/카드 패턴 검사
- 숫자 필드 중 금액 후보 key 검사
- 토큰·쿠키·authorization 문자열 검사
- payload 크기 제한
- 중첩 depth 제한
- 배열 길이 제한

차단 시 이벤트 이름은 `analytics.event.blocked_by_redaction`으로만 집계하며 원본 payload는 저장하지 않는다.

## 13. 성능 기준

- `trackEvent` 호출은 UI thread를 4ms 이상 점유하지 않아야 한다.
- 이벤트 payload 직렬화는 16KB 이하를 목표로 한다.
- 배치 전송은 기본 10개 또는 15초 중 먼저 도달하는 기준으로 수행한다.
- 앱 boot 중 필수 이벤트 외 전송은 지연한다.
- 네트워크 실패 시 사용자 화면 렌더링을 막지 않는다.
- analytics 장애는 기능 장애로 전파하지 않는다.

## 14. 품질·테스트 기준

필수 테스트:

- 이벤트 이름 allowlist 테스트
- 금지 payload redaction 테스트
- 급여/예산/지출/저축 금액 노출 차단 테스트
- push token 노출 차단 테스트
- 광고 금융 타겟팅 flag 차단 테스트
- 오프라인 큐 저장·재전송·만료 테스트
- 중복 event idempotency 테스트
- API 실패 fallback 테스트
- Expo iOS/Android 기본 smoke 테스트
- E2E checkpoint 이벤트 테스트

권장 명령:

```bash
pnpm --filter @salary-hijacking/mobile test analytics
pnpm --filter @salary-hijacking/mobile typecheck
pnpm --filter @salary-hijacking/mobile lint
pnpm --filter @salary-hijacking/mobile e2e
```

## 15. 운영 관측성

운영자는 다음 지표를 집계형으로 확인한다.

- DAU/WAU/MAU
- 기능별 화면 진입 수
- 급여 계획 완료율
- 일일 예산 경고 확인율
- 변동지출 등록 성공률
- 알림 읽음률
- LV UP 미션 완료율
- 커뮤니티 작성/신고/차단 비율
- 앱 boot 성공률
- API 오류율
- 이벤트 redaction 차단율
- 광고·제휴 노출/클릭 집계

원시 이벤트는 접근 통제를 적용하고, 관리자 조회는 집계값·마스킹값·감사 로그를 기본으로 한다.

## 16. 보존·삭제 정책

- 원시 분석 이벤트: 최대 90일
- 집계 지표: 최대 25개월
- E2E/QA 이벤트: 최대 30일
- 광고·제휴 집계: 계약·법무 기준에 따라 최소 범위 보관
- 계정 삭제 시 사용자 단위 연결 가능 키 제거
- 탈퇴 후에는 익명 집계만 보존 가능

## 17. 보안 헤더 및 플래그

모든 analytics 요청은 다음 플래그를 강제한다.

```text
X-Raw-Financial-Data-Exposed: false
X-Raw-Personal-Data-Exposed: false
X-Raw-Push-Token-Exposed: false
X-Ad-Financial-Targeting-Used: false
```

서버는 위 플래그가 누락되거나 true로 전달되면 요청을 거부해야 한다.

## 18. 릴리즈 완료 기준

이 모듈은 다음 조건을 만족해야 완료로 본다.

1. 모든 이벤트가 allowlist에 등록되어 있다.
2. 이벤트 payload에 원시 금융 데이터가 포함되지 않는다.
3. 이벤트 payload에 개인정보·토큰·푸시 토큰이 포함되지 않는다.
4. 광고·제휴 이벤트가 금융 상태 기반 타겟팅을 사용하지 않는다.
5. 오프라인 큐가 제한·만료·재전송·삭제 정책을 가진다.
6. API 장애가 사용자 핵심 기능을 막지 않는다.
7. E2E/QA에서 핵심 화면별 checkpoint가 확인된다.
8. 운영 콘솔은 집계·마스킹 지표만 표시한다.
9. 감사 로그가 관리자 접근과 정책 변경을 기록한다.
10. iOS/Android 실기기 smoke 테스트를 통과한다.

## 19. 완료 판정

`apps/mobile/src/shared/analytics`는 급여납치 모바일 앱의 행동 로그와 이벤트 추적을 담당하는 공통 모듈이다. 문서상·이론상 완성 기준은 서버 권위, 개인정보 보호, 광고·제휴 비식별 처리, 오프라인 큐, 성능, 테스트, 운영 관측성까지 모두 충족하는 것이다.

이 README는 해당 모듈이 구현해야 하는 책임, 금지 사항, 이벤트 스키마, API, 보안·운영 기준을 모두 정의한다. 실제 운영 완료 판정은 이 문서에 맞춰 구현된 코드, 테스트, 서버 API, 배포 환경, E2E/QA 결과가 함께 통과할 때 확정한다.
