# apps/admin/src/components/README.md

## 급여납치 관리자 콘솔 컴포넌트 최종 명세

이 문서는 `apps/admin/src/components` 디렉터리의 관리자 콘솔 공통 컴포넌트, UI 패턴, 보안 경계, 접근성 기준, 개인정보·광고 정책, 테스트 기준을 정의한다. 관리자 콘솔은 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 데이터를 다루는 고권한 영역이므로 모든 컴포넌트는 서버 권위, 감사 로그, RBAC, MFA, 비식별 처리, 광고 금융 타겟팅 금지 원칙을 기본값으로 가진다.

이 README는 문서상·이론상 해당 컴포넌트 디렉터리에 필요한 모든 요구사항을 하나의 기준으로 통합한 최종 운영 문서다.

---

## 1. 컴포넌트 설계 원칙

관리자 컴포넌트는 화면을 예쁘게 구성하는 단순 UI 조각이 아니라, 운영 정책을 실수 없이 강제하는 안전한 상호작용 단위다. 모든 컴포넌트는 다음 기준을 만족해야 한다.

1. 서버 권위(server-authority) 데이터만 표시한다.
2. 클라이언트에서 급여·예산·지출·저축·납치 금액의 원문을 새로 계산하지 않는다.
3. 관리자 mutation은 반드시 `X-Admin-Reason`을 요구한다.
4. RBAC, MFA, 감사 로그 전제를 컴포넌트 API와 UI에 반영한다.
5. raw 금융 데이터, raw 개인정보, raw push token, FCM token, 비밀번호, 세션 토큰을 표시하거나 로그에 남기지 않는다.
6. 광고·제휴 컴포넌트는 급여액, 지출액, 저축액, 대출액, 납치금액 기반 타겟팅을 지원하지 않는다.
7. export, 다운로드, 운영 리포트는 비식별·마스킹·집계 기준만 허용한다.
8. 모든 인터랙션은 no-store fetch, credentials include, JSON error envelope, redaction된 에러 메시지를 기본으로 사용한다.
9. 한국어 우선 UX, 반응형 UI, 키보드 접근성, 명확한 focus 상태를 제공한다.
10. 관리자 콘솔의 모든 위험 작업은 사유 입력, 확인, 감사 로그 경로를 포함한다.

---

## 2. 권장 디렉터리 구조

```text
apps/admin/src/components/
├── README.md
├── core/
│   ├── AdminShell.ts
│   ├── AdminTopbar.ts
│   ├── AdminNav.ts
│   ├── AdminFooter.ts
│   └── SkipLink.ts
├── feedback/
│   ├── Toast.ts
│   ├── EmptyState.ts
│   ├── ErrorPanel.ts
│   ├── LoadingState.ts
│   └── ConfirmDialog.ts
├── data/
│   ├── DataTable.ts
│   ├── FilterBar.ts
│   ├── MetricCard.ts
│   ├── SafeSparkline.ts
│   ├── Pagination.ts
│   └── RedactedExportButton.ts
├── forms/
│   ├── AdminReasonField.ts
│   ├── SafeInput.ts
│   ├── SafeTextarea.ts
│   ├── SafeSelect.ts
│   ├── DateTimeField.ts
│   └── DangerActionForm.ts
├── guards/
│   ├── PrivacyGuardBadge.ts
│   ├── AdsPolicyBadge.ts
│   ├── AuditPolicyBadge.ts
│   ├── RbacGate.ts
│   └── MfaGate.ts
├── community/
│   ├── ModerationActionBar.ts
│   ├── ReportStatusPill.ts
│   ├── AnonymousUserBadge.ts
│   └── SafeContentPreview.ts
├── users/
│   ├── MaskedIdentity.ts
│   ├── UserRiskBadge.ts
│   ├── ConsentBadge.ts
│   └── AccountActionBar.ts
├── ads/
│   ├── SponsoredLabel.ts
│   ├── AdPolicyPanel.ts
│   ├── CampaignStatusBadge.ts
│   └── ContextualSegmentSelector.ts
├── payroll/
│   ├── ServerAuthorityFormulaPanel.ts
│   ├── KrwAggregateValue.ts
│   └── BudgetSafetyBadge.ts
└── utils/
    ├── adminFetch.ts
    ├── redact.ts
    ├── format.ts
    ├── a11y.ts
    └── componentContracts.ts
```

실제 저장소가 JSX 없이 DOM 기반 page를 사용하더라도, 컴포넌트 디렉터리는 위 계약을 기준으로 유지한다. React 컴포넌트로 구현하는 경우에도 이 문서의 보안·개인정보·감사 규칙은 동일하게 적용한다.

---

## 3. 컴포넌트 계약

### 3.1 공통 Props 규칙

모든 컴포넌트는 최소한 다음 개념을 지원해야 한다.

```ts
type AdminComponentBaseProps = Readonly<{
  readonly testId?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly ariaLabel?: string;
}>;
```

위 타입은 예시이며, 구현 방식에 따라 React Props, DOM factory options, plain TypeScript options로 변환할 수 있다. 중요한 기준은 `readonly`, 명시적 타입, optional 값의 안전 처리, `any` 금지다.

### 3.2 관리자 mutation 계약

관리자 mutation을 유발하는 모든 컴포넌트는 다음 입력을 요구한다.

```ts
type AdminMutationContract = Readonly<{
  readonly action: string;
  readonly resourceId: string;
  readonly reason: string;
  readonly rawFinancialDataLogged: false;
  readonly rawPersonalDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
}>;
```

`reason`이 비어 있으면 요청을 보내지 않는다. `rawFinancialDataLogged`, `rawPersonalDataLogged`, `rawPushTokenLogged`, `adsFinancialTargetingUsed`는 항상 `false`다.

### 3.3 API 호출 계약

관리자 컴포넌트에서 사용하는 fetch는 다음 기준을 만족해야 한다.

```ts
const requiredAdminFetchOptions = {
  credentials: "include",
  cache: "no-store",
  headers: {
    accept: "application/json",
    "x-raw-financial-data-logged": "false",
    "x-raw-personal-data-logged": "false",
    "x-raw-push-token-logged": "false",
    "x-ad-financial-targeting-used": "false",
  },
} as const;
```

위 객체는 설명용 계약이다. 실제 구현은 요청 메서드, content-type, `X-Admin-Reason`, CSRF 또는 서비스별 trace header를 추가할 수 있다.

---

## 4. 필수 컴포넌트 요구사항

### 4.1 AdminShell

관리자 shell은 모든 관리자 화면에 공통으로 적용되는 UI 경계다.

필수 기능:

- 관리자 내비게이션: Dashboard, Users, Posts, Reports, Notices, Banners, Metrics, Events
- 한국어 기본 locale
- `RBAC · MFA · Audit` 보안 상태 표시
- 접근성 skip link
- 모바일 대응 nav overflow
- no external script, no external font 기본값
- noindex 관리자 metadata와 호환

### 4.2 AdminReasonField

위험 작업 사유 입력 컴포넌트다.

필수 기능:

- 빈 사유 차단
- 최소 길이 권장 4자 이상
- 사유는 감사 로그에 저장된다는 설명 표시
- 금융 원문, 비밀번호, 토큰, 이메일, 전화번호 입력 시 redaction 또는 경고
- action button disabled 연동

### 4.3 DataTable

운영 목록을 표시하는 표준 테이블이다.

필수 기능:

- 키보드 탐색 가능한 행 선택
- 상태 pill, 위험도 pill, 날짜, 비식별 식별자 표시
- 빈 상태, 로딩 상태, 오류 상태 분리
- raw 금액·개인정보를 직접 표시하지 않고 masked/aggregate/safePreview만 표시
- 컬럼 overflow와 모바일 horizontal scroll 처리

### 4.4 RedactedExportButton

비식별 export 요청 버튼이다.

필수 기능:

- `X-Admin-Reason` 필수
- export payload에 filter, reason, redaction policy 포함
- raw 금융 데이터, raw 개인정보, raw push token 포함 금지
- 결과는 파일 자체가 아니라 export 요청 생성 또는 안전한 다운로드 링크로 처리
- 감사 로그 저장 전제 표시

### 4.5 PrivacyGuardBadge

개인정보·금융정보 안전 상태를 보여주는 guard 컴포넌트다.

필수 표시:

- `rawFinancialData=false`
- `rawPersonalData=false`
- `rawPushToken=false`
- `tokenHashOnly=true`
- `redactedExportOnly=true`
- `adminReasonRequired=true`

### 4.6 AdsPolicyPanel

광고/제휴 정책 컴포넌트다.

필수 기능:

- 광고와 제휴 표시 라벨 강제
- contextual segment만 허용
- 급여액, 지출액, 저축액, 대출액, 납치금액 기반 targeting 금지
- 사용자 식별자, raw financial profile, raw account data 전달 금지
- 광고 성과는 집계값만 표시

### 4.7 SafeContentPreview

커뮤니티·공지·리포트 등 사용자 생성 콘텐츠 미리보기 컴포넌트다.

필수 기능:

- HTML escape
- 위험 단어 redaction
- 이메일, 전화번호, 계좌, 카드, 비밀번호, 토큰, 급여명세서 원문 노출 차단
- 긴 본문 truncate
- 신고/검토/숨김 상태와 연동

### 4.8 ServerAuthorityFormulaPanel

급여납치 서버 권위 계산식을 설명하는 운영 컴포넌트다.

필수 계산식 표시:

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

이 컴포넌트는 설명과 검증 marker만 제공한다. 실제 계산은 서버에서 수행한다.

---

## 5. 관리자 도메인별 컴포넌트 기준

### 5.1 Dashboard

- 서비스 health card
- scheduler/notifications readiness
- incident summary
- privacy/ad/audit guard
- 운영 quick action은 사유 필수

### 5.2 Users

- masked email/phone만 표시
- notification token은 hash count만 표시
- 개인정보 export/탈퇴/익명화/영구삭제는 별도 위험 작업으로 분리
- 관리자 계정 role 변경은 SUPER_ADMIN 전용으로 분리

### 5.3 Posts

- 익명 display 유지
- 내부 식별은 authorHash-only
- 신고 수, 위험도, 최근 신고 사유 표시
- 승인/숨김/복원/잠금/삭제/제재는 사유 필수

### 5.4 Reports

- reporterHash/actorHash-only
- SLA, severity, risk score 표시
- CS, 보안, 광고, 커뮤니티 신고 통합 처리
- 비식별 export만 허용

### 5.5 Notices

- 공지 유형: 서비스, 급여, 예산, 저축, 커뮤니티, 광고, 보안, 점검, 정책
- marketing audience는 동의 기반 또는 별도 정책 설명 필요
- 공지 알림 payload에는 raw 금액/토큰 금지

### 5.6 Banners

- 광고/제휴 라벨 강제
- contextual segment만 허용
- 광고주에게 raw 사용자 식별자·금융 원문 전달 금지
- campaign status와 policy pass 상태 표시

### 5.7 Metrics

- 집계값만 표시
- p95, error rate, throughput, saturation 등 운영 지표 지원
- safe sparkline은 dependency 없이 동작 가능해야 한다
- raw amount metric payload 금지

### 5.8 Events

- audit/security/domain/scheduler/notification/community/ads/admin/system event 표시
- IP/User-Agent는 hash만 표시
- event export는 redacted export만 허용
- event action은 사유 필수

---

## 6. 보안·개인정보·광고 정책

### 6.1 금지 데이터

관리자 컴포넌트는 다음 데이터를 raw 형태로 표시하거나 console/error/log/export payload에 포함해서는 안 된다.

- 비밀번호, refresh token, access token, session cookie, CSRF secret
- MFA secret, TOTP seed, recovery code, WebAuthn credential raw data
- 주민등록번호, 전화번호 원문, 이메일 원문, 주소 원문
- 계좌번호, 카드번호, 급여명세서, 통장 사본, 금융 statement
- 급여액, 소득액, 지출액, 저축액, 대출액, 납치금액 원문
- FCM token, device token, push token
- 광고 타겟팅에 사용할 수 있는 금융 프로필 원문

### 6.2 허용 데이터

- masked email, masked phone
- user hash, author hash, reporter hash, actor hash
- aggregate counts, rates, status, severity, risk score
- safePreview, redacted summary
- policy pass/fail marker
- 서버에서 계산된 집계 지표

### 6.3 광고/제휴 규칙

광고/제휴 컴포넌트는 다음 원칙을 따른다.

- 광고 라벨 또는 제휴 라벨을 명확히 표시한다.
- context segment는 화면·콘텐츠 맥락 기반으로만 사용한다.
- 급여, 예산, 지출, 저축, 대출, 납치금액 기준 타겟팅은 금지한다.
- 광고주에게 사용자 식별자, 금융 원문, 급여 계획, 예산 계획, 지출 상세를 전달하지 않는다.
- 광고 성과 분석은 집계값과 one-way hash 기준만 사용한다.

---

## 7. 접근성 기준

모든 컴포넌트는 다음 접근성 기준을 지켜야 한다.

- 버튼과 링크의 역할을 혼동하지 않는다.
- action button에는 명확한 label을 제공한다.
- 위험 작업에는 확인 단계 또는 명시적인 경고를 제공한다.
- 입력 필드는 label 또는 aria-label을 가진다.
- 색상만으로 상태를 표현하지 않고 텍스트 상태를 함께 제공한다.
- keyboard focus가 보인다.
- reduced motion 환경을 고려한다.
- table은 header와 cell 관계가 명확해야 한다.
- toast는 `role="status"` 또는 동등한 안내 영역과 호환되어야 한다.

---

## 8. 반응형 UI 기준

관리자 콘솔은 desktop 운영자가 주 사용층이지만, 태블릿과 모바일에서도 안전하게 조회·승인·긴급 조치가 가능해야 한다.

필수 기준:

- 1560px 이하에서 중앙 max-width 레이아웃
- 1280px 이하에서 상세 패널 하단 이동
- 720px 이하에서 필터와 액션 버튼 1열 배치
- 테이블은 horizontal scroll 허용
- 위험 action은 모바일에서도 실수 클릭 방지 간격 유지

---

## 9. 테스트 기준

컴포넌트 변경 시 다음 검증을 수행한다.

### 9.1 정적 검증

```bash
pnpm --filter @salary-hijacking/admin typecheck
pnpm --filter @salary-hijacking/admin lint
```

필수 조건:

- `strict` 통과
- `noImplicitAny` 통과
- `exactOptionalPropertyTypes` 통과
- `noUncheckedIndexedAccess` 통과
- unused import/unused variable 없음
- React/JSX 환경이 없는 파일은 JSX 의존 없이 컴파일 가능해야 한다

### 9.2 단위 테스트

```bash
pnpm --filter @salary-hijacking/admin test
```

검증 대상:

- redaction
- admin reason validation
- policy guard rendering
- safe export payload
- filter/sort state
- accessibility label

### 9.3 E2E/QA

```bash
pnpm --filter @salary-hijacking/admin e2e
```

필수 시나리오:

- 관리자 로그인 후 dashboard 진입
- 사용자 조치 시 사유 미입력 차단
- 게시글 숨김/복원 감사 로그 생성
- 신고 리포트 처리
- 공지 게시/예약/정지
- 배너 광고 금융 타겟팅 차단
- metrics 집계값만 표시
- events redacted export

---

## 10. 구현 시 금지 패턴

```ts
// 금지: raw token 표시
console.log(pushToken);

// 금지: 사유 없는 관리자 mutation
fetch("/admin/api/v1/users/user_1/lock", { method: "POST" });

// 금지: raw 금융 금액 기반 광고 타겟팅
const segment = salaryAmount > 5000000 ? "high-income" : "general";

// 금지: 에러 원문 그대로 노출
throw new Error(JSON.stringify(serverError));
```

대체 기준:

```ts
// 허용: hash/count/safe marker만 사용
const safePayload = {
  tokenHashOnly: true,
  notificationTokenHashCount: 3,
  rawFinancialDataLogged: false,
  adsFinancialTargetingUsed: false,
};
```

---

## 11. 완료 기준

`apps/admin/src/components`는 다음 조건을 만족할 때 문서상·이론상 완료로 본다.

- 관리자 공통 shell과 주요 운영 컴포넌트 계약이 정의되어 있다.
- Users, Posts, Reports, Notices, Banners, Metrics, Events, Dashboard 화면에서 재사용 가능한 기준이 있다.
- 서버 권위, RBAC, MFA, 감사 로그, `X-Admin-Reason` 요구사항이 문서화되어 있다.
- raw 금융 데이터, raw 개인정보, raw push token, 광고 금융 타겟팅 금지 기준이 명확하다.
- 비식별 export와 redaction 정책이 명확하다.
- 접근성, 반응형, 테스트, E2E 기준이 포함되어 있다.
- 구현 금지 패턴과 대체 패턴이 포함되어 있다.
- 새로운 컴포넌트를 추가할 때 따라야 하는 구조와 검증 방법이 명확하다.

---

## 12. 객관적 운영 주의사항

이 README는 컴포넌트 디렉터리의 문서상·이론상 최종 기준을 정의한다. 실제 프로젝트 종합 운영 100%는 저장소의 실제 컴포넌트 구현, 관리자 인증/RBAC/MFA, `/admin/api/v1/*` API, 감사 로그 저장소, 광고 정책 검증, 배포 환경 변수, staging/production E2E/QA가 함께 통과해야 확정된다.
