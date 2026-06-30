# 급여납치 관리자 콘솔 · Banner Management Feature README

> 최종 파일 위치: `apps/admin/src/features/banner-management/README.md`  
> 문서 버전: `v3.1.3`  
> 적용 범위: 관리자 콘솔의 배너·광고·제휴 운영 기능, 정책 가드, API 연동, UI/UX, QA/E2E, 배포·운영 기준  
> 기준 플랫폼: 급여납치 Paycheck Accounting · Salary Hijacking Platform

---

## 1. 목적

`banner-management` 기능은 급여납치 관리자 콘솔에서 서비스 배너, 공지 배너, 광고 배너, 제휴 배너, 점검 배너, 정책 안내 배너를 안전하게 생성·검수·게시·중지·보관·성과 확인하는 운영 모듈이다.

이 기능은 단순한 배너 CRUD가 아니라 다음 기준을 동시에 만족해야 한다.

1. 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 도메인과 연결된다.
2. 관리자 RBAC, MFA, 감사 로그, `X-Admin-Reason` 기반으로만 변경된다.
3. 광고/제휴 배너는 급여액, 저축액, 지출액, 대출액, 납치금액 등 금융 원문 데이터를 타겟팅에 사용하지 않는다.
4. 사용자 식별자는 원문이 아니라 비식별·집계·hash 기준으로만 다룬다.
5. 배너 노출은 contextual targeting과 명시 동의 기반 정책을 우선한다.
6. 모든 운영 이벤트는 감사 가능해야 하며, export는 redacted export만 허용한다.
7. 관리자 UI는 반응형, 접근성, 실무 운영 편의성을 갖춘 상태를 기준으로 한다.

---

## 2. 기능 경계

### 2.1 포함 기능

- 배너 목록 조회
- 배너 검색, 필터, 정렬
- 배너 생성, 수정, 복제
- 배너 게시, 중지, 보관
- 배너 우선순위 조정
- 노출 위치 관리
- 노출 기간 관리
- 광고/제휴 라벨 표시
- 정책 검수 상태 표시
- 소재 미리보기
- contextual segment 설정
- 테스트 노출 요청
- 성과 집계 조회
- 비식별 export 요청
- 운영 감사 로그 연동
- 관리자 조치 사유 강제
- raw financial targeting 차단
- raw push token 로그 차단
- 광고 금융 타겟팅 차단

### 2.2 제외 기능

다음 기능은 `banner-management`가 직접 수행하지 않고 별도 도메인 또는 API가 책임진다.

- 결제 정산
- 광고주 직접 입찰
- 외부 애드서버 실시간 경매
- 사용자의 급여 원문 조회
- 사용자 금융 원문 기반 세그먼트 생성
- raw push token 조회
- 개인정보 원문 export
- 관리자 인증 자체 구현

---

## 3. 관련 경로

```text
apps/admin/src/features/banner-management/
├── README.md
├── components/
│   ├── BannerCard.tsx
│   ├── BannerEditor.tsx
│   ├── BannerPreview.tsx
│   ├── BannerPolicyGuard.tsx
│   ├── BannerStatsPanel.tsx
│   └── BannerToolbar.tsx
├── hooks/
│   ├── useBannerList.ts
│   ├── useBannerMutation.ts
│   └── useBannerPolicyGuard.ts
├── lib/
│   ├── banner-api.ts
│   ├── banner-normalizer.ts
│   ├── banner-policy.ts
│   └── banner-schema.ts
├── types/
│   └── banner-management.types.ts
└── tests/
    ├── banner-management.unit.test.ts
    ├── banner-management.policy.test.ts
    └── banner-management.e2e.spec.ts
```

현재 README는 위 구조를 기준으로 기능·정책·QA·운영 요구사항을 고정한다. 실제 구현 파일이 추가될 때도 이 문서의 정책을 변경하지 않고 준수해야 한다.

---

## 4. 관리자 화면 연동

주요 화면 경로는 다음과 같다.

```text
apps/admin/src/app/banners/page.tsx
```

해당 화면은 다음 feature 계층을 사용해야 한다.

```text
apps/admin/src/features/banner-management
```

관리자 앱 공통 layout 및 gateway와의 연결 경계는 다음과 같다.

```text
apps/admin/src/app/layout.tsx
apps/admin/src/app/page.tsx
apps/admin/src/app/login/page.tsx
apps/admin/src/app/dashboard/page.tsx
apps/admin/src/app/events/page.tsx
apps/admin/src/app/metrics/page.tsx
```

---

## 5. API 경계

Banner Management는 관리자 API 경계를 통해서만 서버 상태를 변경한다.

```text
GET    /admin/api/v1/banners
GET    /admin/api/v1/banners/:bannerId
POST   /admin/api/v1/banners
PATCH  /admin/api/v1/banners/:bannerId
POST   /admin/api/v1/banners/:bannerId/publish
POST   /admin/api/v1/banners/:bannerId/pause
POST   /admin/api/v1/banners/:bannerId/archive
POST   /admin/api/v1/banners/:bannerId/duplicate
POST   /admin/api/v1/banners/:bannerId/test-impression
POST   /admin/api/v1/banners/exports/redacted
GET    /admin/api/v1/banners/:bannerId/stats
```

모든 mutation 요청은 다음 헤더를 포함해야 한다.

```http
X-Admin-Reason: <관리자 조치 사유>
X-Raw-Financial-Targeting-Used: false
X-Raw-Push-Token-Logged: false
X-Ad-Financial-Targeting-Used: false
```

`X-Admin-Reason`이 없거나 공백이면 서버는 `400` 또는 `422`로 거부해야 한다. RBAC 권한이 부족하면 `403`, MFA가 완료되지 않았으면 `401` 또는 `403`으로 거부해야 한다.

---

## 6. 데이터 모델

### 6.1 Banner

```ts
export type BannerKind = "SERVICE" | "NOTICE" | "AD" | "PARTNER" | "MAINTENANCE" | "POLICY" | "SECURITY";

export type BannerStatus = "DRAFT" | "REVIEW" | "SCHEDULED" | "PUBLISHED" | "PAUSED" | "ARCHIVED";

export type BannerPlacement = "APP_HOME_TOP" | "APP_HOME_MIDDLE" | "PAYROLL_HOME" | "BUDGET_HOME" | "SAVINGS_HOME" | "COMMUNITY_FEED" | "MY_PAGE" | "ADMIN_HOME" | "GLOBAL_MODAL";

export type BannerAudienceMode = "ALL" | "CONTEXTUAL" | "CONSENTED_MARKETING" | "ADMIN_ONLY" | "SECURITY_RELATED";

export type BannerPolicyGuard = {
  readonly rawFinancialTargetingUsed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly contextualOnly: boolean;
  readonly marketingConsentRequired: boolean;
  readonly adminReasonRequired: true;
};

export type Banner = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly ctaLabel: string | null;
  readonly ctaUrl: string | null;
  readonly kind: BannerKind;
  readonly status: BannerStatus;
  readonly placement: BannerPlacement;
  readonly audienceMode: BannerAudienceMode;
  readonly contextSegments: readonly string[];
  readonly priority: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly imageAssetId: string | null;
  readonly advertiserId: string | null;
  readonly partnerId: string | null;
  readonly isSponsored: boolean;
  readonly label: "광고" | "제휴" | "공지" | "안내" | "보안";
  readonly impressionCount: number;
  readonly clickCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly policyGuard: BannerPolicyGuard;
};
```

### 6.2 BannerStats

```ts
export type BannerStats = {
  readonly bannerId: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly ctrBp: number;
  readonly uniqueReachBucket: string;
  readonly placement: BannerPlacement;
  readonly aggregatedOnly: true;
  readonly rawUserIdentifierIncluded: false;
  readonly rawFinancialDataIncluded: false;
};
```

---

## 7. 배너 유형별 정책

### 7.1 서비스 배너

서비스 배너는 기능 안내, 업데이트, 장애 복구, 신규 기능 소개에 사용된다.

허용 예시는 다음과 같다.

- “고정지출 관리 화면이 개선되었습니다.”
- “급여 계획 계산식이 더 명확하게 표시됩니다.”
- “알림 설정에서 급여일 리마인더를 조정할 수 있습니다.”

금지 예시는 다음과 같다.

- 특정 사용자의 급여액을 노출하는 문구
- 특정 사용자의 지출·저축 금액을 노출하는 문구
- 금융 원문 데이터를 암시하는 세그먼트명

### 7.2 광고 배너

광고 배너는 반드시 `광고` 라벨을 표시해야 한다.

광고 배너의 기본 원칙은 다음과 같다.

1. 금융 원문 기반 타겟팅 금지
2. 대출, 고위험 투자, 사행성 문구 제한
3. 급여 취약성, 지출 불안, 부채 압박을 이용한 문구 금지
4. 광고주에게 사용자 식별자 전달 금지
5. 광고 이벤트는 집계 기준만 제공
6. 클릭 추적은 one-way hash 또는 집계 기준으로만 처리

### 7.3 제휴 배너

제휴 배너는 반드시 `제휴` 라벨을 표시해야 한다.

제휴 배너는 다음 기준을 충족해야 한다.

- 제휴 관계 표시
- 사용자 금융 상태 원문 전달 금지
- 문맥 기반 추천 우선
- 마케팅 수신 동의 대상일 경우 consent 검증 필수
- 관리자 승인 및 감사 로그 필수

### 7.4 보안 배너

보안 배너는 인증, 비밀번호, MFA, 세션 보안, 개인정보 처리 안내에 사용한다.

보안 배너는 광고 또는 제휴와 혼합하면 안 된다.

### 7.5 점검 배너

점검 배너는 서비스 점검, 장애, 지연, 배포 안내에 사용한다.

점검 배너는 `startsAt`, `endsAt`, `placement`, `severity`를 명확히 설정해야 한다.

---

## 8. 타겟팅 정책

Banner Management의 타겟팅은 다음 범위로 제한된다.

### 8.1 허용 타겟팅

- 화면 문맥 기반: 홈, 급여 홈, 예산 홈, 저축 홈, 커뮤니티
- 기능 사용 여부의 집계 상태: 기능을 사용한 적 있음/없음
- 마케팅 수신 동의 여부
- 관리자 전용 여부
- 보안 관련 전체 공지
- 지역·언어 등 민감하지 않은 일반 문맥

### 8.2 금지 타겟팅

- 예상 급여액
- 실제 급여액
- 고정지출 금액
- 변동지출 금액
- 저축 금액
- 예산 초과 금액
- 납치 예상 금액
- 실제 납치 금액
- 대출 또는 부채 금액
- 개인별 금융 취약성
- raw email, raw phone, raw push token
- 특정 사용자의 금융 이벤트 원문

금지 예시는 다음과 같다.

```text
salary_amount > 3_000_000
monthly_actual_hijack < 100_000
expense_amount > budget_limit
loan_amount exists
savings_amount < 10_000
```

허용 예시는 다음과 같다.

```text
context = PAYROLL_HOME
placement = APP_HOME_TOP
audienceMode = CONSENTED_MARKETING
segment = COMMUNITY_ACTIVE
segment = FIRST_TIME_BUDGET_USER
```

---

## 9. 서버 권위 원칙

배너 노출 조건, 게시 상태, 통계 집계, 광고/제휴 정책 검증은 서버 권위로 처리한다. 클라이언트는 서버가 반환한 결과를 표시하고, 관리자 입력을 검증 보조 용도로만 사용한다.

급여납치 핵심 계산식은 배너 타겟팅 조건으로 직접 사용하지 않는다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

위 값은 사용자 금융 원문 또는 파생 민감 정보로 취급한다. 배너 정책에서는 개별 사용자 단위 조건으로 사용하지 않는다.

---

## 10. 관리자 권한

### 10.1 역할별 접근

| 역할        | 조회 | 생성 | 수정 | 게시 | 보관 | export | 정책 override |
| ----------- | ---: | ---: | ---: | ---: | ---: | -----: | ------------: |
| OPERATOR    | 가능 | 가능 | 가능 | 제한 | 가능 |   불가 |          불가 |
| ADMIN       | 가능 | 가능 | 가능 | 가능 | 가능 |   가능 |          불가 |
| SUPER_ADMIN | 가능 | 가능 | 가능 | 가능 | 가능 |   가능 |   제한적 가능 |

정책 override는 raw 금융 타겟팅을 허용한다는 뜻이 아니다. 허용 가능한 override는 게시 시간, 우선순위, 긴급 공지 노출 같은 운영 정책에 한정된다.

### 10.2 필수 조건

- 관리자 로그인 완료
- MFA 완료
- RBAC 권한 보유
- `X-Admin-Reason` 입력
- 감사 로그 저장 가능
- 정책 가드 통과

---

## 11. 감사 로그

배너 mutation은 반드시 감사 로그를 남긴다.

감사 로그 필수 필드는 다음과 같다.

```ts
export type BannerAuditEvent = {
  readonly actorAdminId: string;
  readonly actorRole: "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
  readonly action: "CREATE" | "UPDATE" | "PUBLISH" | "PAUSE" | "ARCHIVE" | "DUPLICATE" | "EXPORT_REDACTED";
  readonly targetType: "BANNER";
  readonly targetId: string;
  readonly reason: string;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly ipHash: string;
  readonly userAgentHash: string;
  readonly rawFinancialTargetingUsed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly createdAt: string;
};
```

감사 로그에는 다음 값이 들어가면 안 된다.

- raw email
- raw phone
- raw IP
- raw User-Agent
- raw push token
- 급여액
- 지출액
- 저축액
- 납치금액
- 대출액
- 사용자 금융 이벤트 원문

---

## 12. UI/UX 기준

관리자 배너 관리 화면은 다음 UX를 제공해야 한다.

1. 상태 카드: 전체, 게시, 예약, 검수, 중지, 보관, 광고/제휴 수
2. 검색: 제목, 요약, placement, partner/ad label 기준
3. 필터: 유형, 상태, placement, audience, sponsored 여부
4. 정렬: 최근 수정, 게시일, 우선순위, 노출수, 클릭수
5. 편집 폼: 제목, 요약, 본문, CTA, 이미지, placement, segment, 기간
6. 미리보기: 앱 홈/급여 홈/커뮤니티/모달 형태
7. 정책 가드 패널: PASS/CHECK/FAIL
8. 관리자 사유 입력란
9. 게시/중지/보관/복제/테스트 버튼
10. redacted export 요청 버튼
11. 반응형 레이아웃
12. 키보드 접근 가능 UI
13. 색상만으로 상태를 전달하지 않는 보조 텍스트
14. 광고/제휴 라벨 상시 표시
15. raw 금융 타겟팅 금지 경고

---

## 13. 접근성

- 버튼은 명확한 accessible name을 가진다.
- 광고/제휴 라벨은 색상뿐 아니라 텍스트로 표시한다.
- focus outline을 제거하지 않는다.
- 모달 preview가 있다면 focus trap을 제공한다.
- table에는 header가 있어야 한다.
- 상태 badge는 텍스트와 함께 제공한다.
- 폼 오류는 field 단위로 설명한다.
- 관리자 사유 누락은 명확히 안내한다.

---

## 14. 에러 처리

Banner Management에서 처리해야 하는 주요 오류는 다음과 같다.

| 상태 | 의미                    | UI 처리                    |
| ---: | ----------------------- | -------------------------- |
|  400 | 잘못된 입력             | 필드 오류 표시             |
|  401 | 인증 필요               | 로그인 화면 이동 안내      |
|  403 | 권한 부족 또는 MFA 필요 | 권한 부족 안내             |
|  409 | 게시 상태 충돌          | 최신 데이터 재조회 안내    |
|  422 | 정책 가드 실패          | 실패 사유와 수정 방법 표시 |
|  429 | rate limit              | 재시도 시간 표시           |
|  500 | 서버 오류               | 안전한 오류 메시지 표시    |

오류 메시지는 redaction을 통과해야 하며 raw secret, token, financial value를 노출하면 안 된다.

---

## 15. 보안 요구사항

- 모든 관리자 API 요청은 `credentials: include`, `cache: no-store` 기준이다.
- mutation 요청은 CSRF 또는 동등한 서버 검증을 통과해야 한다.
- 관리자 세션은 httpOnly secure cookie 기준이다.
- 서비스 토큰은 클라이언트에 노출하지 않는다.
- 배너 이미지 업로드는 R2 또는 별도 업로드 서비스에서 검사한다.
- 외부 URL CTA는 allowlist 또는 safe redirect 검증을 통과해야 한다.
- HTML 본문은 sanitize하거나 markdown allowlist로 제한한다.
- preview iframe을 사용할 경우 sandbox를 적용한다.

---

## 16. 광고·제휴 정책

Banner Management는 `APPENDIX_A_adsense_v3_1.md` 수준의 광고/제휴 정책을 따른다.

핵심 원칙은 다음과 같다.

```text
advertisers_cannot_access_conversations=true
advertisers_cannot_access_user_financial_raw_data=true
financial_amount_targeting=false
contextual_targeting_default=true
non_personalized_ads_default=true
sponsored_label_required=true
partner_label_required=true
redacted_aggregated_reporting_only=true
```

광고/제휴 성과 리포트는 다음 범위만 허용한다.

- placement별 impression count
- placement별 click count
- campaign별 aggregate CTR
- 기간별 집계
- 비식별 segment bucket

금지되는 리포트는 다음과 같다.

- 사용자별 클릭 이력 원문
- 사용자별 급여/지출/저축 값
- 사용자별 금융 취약성
- raw user ID
- raw push token
- raw email/phone

---

## 17. 테스트 기준

### 17.1 Unit Test

필수 테스트는 다음과 같다.

- 배너 schema validation
- 시작/종료 시간 검증
- 우선순위 정수 검증
- 광고/제휴 라벨 필수 검증
- raw financial targeting 차단
- raw push token 차단
- CTA URL allowlist 검증
- 관리자 사유 필수 검증
- enum fallback 검증
- redaction 함수 검증

### 17.2 Policy Test

정책 테스트는 다음 조건을 검증한다.

```text
rawFinancialTargetingUsed === false
rawPushTokenLogged === false
adsFinancialTargetingUsed === false
adminReasonRequired === true
sponsoredLabelRequired === true
partnerLabelRequired === true
redactedExportOnly === true
```

### 17.3 E2E Test

E2E 시나리오는 다음과 같다.

1. 관리자가 로그인한다.
2. MFA를 완료한다.
3. 배너 목록을 조회한다.
4. 신규 서비스 배너를 생성한다.
5. 관리자 사유 없이 게시를 시도하고 실패를 확인한다.
6. 관리자 사유 입력 후 게시한다.
7. 광고 배너 생성 시 `광고` 라벨이 표시되는지 확인한다.
8. 금융 원문 타겟팅 조건 입력 시 정책 가드가 차단하는지 확인한다.
9. 배너를 중지한다.
10. redacted export를 요청한다.
11. 감사 로그에 action과 reason이 기록되는지 확인한다.

---

## 18. 성능 기준

- 목록 첫 로딩 P95: 1.5초 이하
- 필터 변경 후 응답 P95: 1.2초 이하
- mutation 후 반영 P95: 1.5초 이하
- 이미지 preview lazy loading
- pagination 또는 cursor 기반 목록 조회
- 대량 export는 비동기 job 처리
- 관리자 UI bundle은 route 단위 code split 권장

---

## 19. 운영 체크리스트

배포 전 반드시 확인한다.

- [ ] `/admin/api/v1/banners` API가 배포되어 있다.
- [ ] 관리자 인증/RBAC/MFA가 활성화되어 있다.
- [ ] 감사 로그 저장소가 정상이다.
- [ ] 광고/제휴 정책 가드가 서버에서 강제된다.
- [ ] raw 금융 타겟팅 차단 테스트가 통과한다.
- [ ] raw push token 로그 차단 테스트가 통과한다.
- [ ] 배너 이미지 업로드 검사가 정상이다.
- [ ] CTA allowlist 검증이 정상이다.
- [ ] redacted export job이 정상이다.
- [ ] E2E 테스트가 staging에서 통과한다.
- [ ] production 환경변수와 secret이 설정되어 있다.
- [ ] 관리자 조치 사유 누락 시 mutation이 실패한다.

---

## 20. 구현 금지 패턴

다음 코드는 금지한다.

```ts
// 금지: 급여액 기반 광고 타겟팅
const segment = user.expectedSalary > 3_000_000 ? "HIGH_SALARY" : "LOW_SALARY";

// 금지: 지출액 기반 광고 타겟팅
const target = user.monthlyExpense > user.dailyBudgetLimit;

// 금지: raw push token 로그
console.log(device.pushToken);

// 금지: 광고주에게 사용자 식별자 전달
sendToAdvertiser({ userId, email, phone });

// 금지: 관리자 사유 없는 mutation
await fetch("/admin/api/v1/banners/1/publish", { method: "POST" });
```

허용 패턴은 다음과 같다.

```ts
await fetch("/admin/api/v1/banners/1/publish", {
  method: "POST",
  credentials: "include",
  cache: "no-store",
  headers: {
    "content-type": "application/json",
    "x-admin-reason": reason,
    "x-raw-financial-targeting-used": "false",
    "x-raw-push-token-logged": "false",
    "x-ad-financial-targeting-used": "false",
  },
  body: JSON.stringify({
    action: "PUBLISH",
    contextualOnly: true,
    rawFinancialTargetingUsed: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
  }),
});
```

---

## 21. 완료 판정 기준

이 feature README가 정의하는 Banner Management의 문서상·이론상 완료 기준은 다음과 같다.

1. 기능 경계가 명확하다.
2. API 경계가 명확하다.
3. 데이터 모델이 명확하다.
4. 광고/제휴 라벨 정책이 명확하다.
5. raw 금융 타겟팅 금지가 명확하다.
6. raw push token 로그 금지가 명확하다.
7. 관리자 사유 강제가 명확하다.
8. RBAC/MFA/Audit 전제가 명확하다.
9. UI/UX 기준이 명확하다.
10. 접근성 기준이 명확하다.
11. 보안 요구사항이 명확하다.
12. 광고/제휴 리포트 범위가 명확하다.
13. 테스트 기준이 명확하다.
14. 운영 체크리스트가 명확하다.
15. 금지 패턴과 허용 패턴이 명확하다.
16. 급여납치 서버 권위 계산식이 광고 타겟팅에 사용되지 않는다는 기준이 명확하다.
17. 상용 운영 전 추가 검증 항목이 명확하다.

---

## 22. 객관적 상태

이 README는 `apps/admin/src/features/banner-management/README.md` 파일 단위에서 banner-management 기능의 요구사항, 정책, API, 데이터 모델, 테스트, 운영 기준을 문서상·이론상 최종본 수준으로 정의한다.

단, 실제 프로젝트 종합 운영 100% 판정은 다음 항목이 실제 저장소와 배포 환경에서 함께 통과해야 확정된다.

- 실제 feature 컴포넌트 구현
- `/admin/api/v1/banners` 서버 API
- 관리자 인증/RBAC/MFA
- 감사 로그 저장소
- 정책 가드 서버 검증
- 광고/제휴 리포트 집계 파이프라인
- staging/production E2E/QA
- Cloudflare/DB/R2/Queue/secret 운영 설정

---

## 23. Self Completeness Manifest

```json
{
  "file": "apps/admin/src/features/banner-management/README.md",
  "version": "3.1.3",
  "domain": "admin.banner-management",
  "document_complete": true,
  "theoretical_file_complete": true,
  "server_authority_aligned": true,
  "admin_rbac_required": true,
  "mfa_required": true,
  "audit_log_required": true,
  "x_admin_reason_required": true,
  "raw_financial_targeting_used": false,
  "raw_push_token_logged": false,
  "ads_financial_targeting_used": false,
  "sponsored_label_required": true,
  "partner_label_required": true,
  "redacted_export_only": true,
  "qa_required": ["unit", "policy", "e2e", "staging", "production-smoke"]
}
```
