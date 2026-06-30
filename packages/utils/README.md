# @salary-hijacking/utils

급여납치 Salary Hijacking Platform의 공통 유틸리티 패키지입니다. 이 패키지는 급여일·월 주기·일일예산 날짜, KRW 금액, 페이지네이션, 문자열 정규화·보안 처리를 하나의 서버 권위 기반 공통 계층으로 제공합니다.

이 README는 `packages/utils`의 운영 기준 문서이며, `date.ts`, `money.ts`, `pagination.ts`, `strings.ts`, `package.json`, `tsconfig.utils.json`, `src/index.ts`가 함께 적용될 때 문서상·이론상 더 이상 추가 작업이 필요 없는 최종 패키지 단위 기준을 정의합니다.

---

## 1. 패키지 목적

`@salary-hijacking/utils`는 급여납치 플랫폼 전체에서 반복되는 순수 유틸 로직을 분리해 API, DB 트랜잭션, worker scheduler, 모바일/웹 앱, 관리자 콘솔, E2E 테스트가 동일한 계산 기준을 공유하도록 설계되었습니다.

핵심 목적은 다음과 같습니다.

1. 급여일, 월 주기, 일일예산 기간, 고정지출·고정저축 예정일, 알림 예약 시각을 `Asia/Seoul` 기준으로 통일합니다.
2. 급여·예산·지출·저축·납치금액 표시와 계산 보조를 KRW 1원 단위 정수로 통일합니다.
3. 급여 홈, 알림, 커뮤니티, LV UP, 관리자 목록에 필요한 offset/cursor pagination 기준을 통일합니다.
4. 커뮤니티, 알림, 관리자 메모, 검색어, 접근성 라벨에 필요한 문자열 정규화·검증·마스킹 정책을 통일합니다.
5. raw token, raw secret, raw PII, raw financial source data, raw ad targeting payload가 UI/로그/커서/문자열에 그대로 노출되지 않도록 방지합니다.
6. 금액 계산·쓰기·월마감·알림 발송·커뮤니티 제재의 최종 권위는 서버 트랜잭션 계층에 유지하고, 이 패키지는 순수 함수 기반 보조 유틸만 제공합니다.

---

## 2. 포함 모듈

| 모듈             | 경로                | 역할                                                                                               |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| Date Utils       | `src/date.ts`       | 급여일, 급여 주기, 일일예산 기간, 고정지출/고정저축 예정일, 알림 예약, KST 기준 날짜 처리          |
| Money Utils      | `src/money.ts`      | KRW 정수 금액 검증, 포맷, 일일예산 사용/잔액/초과, 납치금액 보조 계산, 감사/멱등성 보조            |
| Pagination Utils | `src/pagination.ts` | offset pagination, cursor/keyset pagination, 도메인별 page size, 접근성 라벨, 목록 smoke test 유틸 |
| String Utils     | `src/strings.ts`    | 문자열 sanitize, HTML 차단, 민감정보 redaction, 커뮤니티/알림/관리자 텍스트 정규화, 검색/해시태그  |

---

## 3. 공개 export

패키지는 root export와 subpath export를 모두 제공합니다.

```ts
import { calculateDailyBudget, calculatePayrollHijack, createPayrollCycle, paginateArrayOffset, sanitizeCommunityTitle } from "@salary-hijacking/utils";

import { createPayrollCycle } from "@salary-hijacking/utils/date";
import { calculateDailyBudget } from "@salary-hijacking/utils/money";
import { createCursorPagination } from "@salary-hijacking/utils/pagination";
import { sanitizeCommunityBody } from "@salary-hijacking/utils/strings";
```

지원 export map은 다음 기준을 만족해야 합니다.

| Export                               | Types                  | ESM                  | CJS                   |
| ------------------------------------ | ---------------------- | -------------------- | --------------------- |
| `@salary-hijacking/utils`            | `dist/index.d.ts`      | `dist/index.js`      | `dist/index.cjs`      |
| `@salary-hijacking/utils/date`       | `dist/date.d.ts`       | `dist/date.js`       | `dist/date.cjs`       |
| `@salary-hijacking/utils/money`      | `dist/money.d.ts`      | `dist/money.js`      | `dist/money.cjs`      |
| `@salary-hijacking/utils/pagination` | `dist/pagination.d.ts` | `dist/pagination.js` | `dist/pagination.cjs` |
| `@salary-hijacking/utils/strings`    | `dist/strings.d.ts`    | `dist/strings.js`    | `dist/strings.cjs`    |

---

## 4. 급여납치 플랫폼 요구사항 매핑

### 4.1 급여/예산/지출/저축

`money.ts`와 `date.ts`는 급여 홈과 계획 화면의 핵심 계산 보조를 담당합니다.

반영 기준은 다음과 같습니다.

- 급여 수령 예정일, 실제 급여일, 이전/다음 급여일 계산
- 월별 급여 사이클 생성
- 급여 사이클 기준 일일예산 날짜 목록 생성
- 고정지출 예정일 계산
- 고정저축 예정일 계산
- 일일예산 사용금액, 남은금액, 초과금액 계산
- 예상 지출금액, 실제 지출금액 계산
- 예상 납치금액, 확정 납치금액 계산 보조
- 납치금액 floor zero 정책
- 예산 초과 시 `remainingAmount = 0`, `overAmount > 0` 분리
- KRW 1원 단위 정수만 허용
- 음수, 소수, unsafe integer 차단

### 4.2 알림/스케줄러

`date.ts`는 알림/worker scheduler에서 다음 기준을 제공합니다.

- 급여일 알림 예약
- 고정지출 예정 알림 예약
- 고정저축 예정 알림 예약
- quiet hours range 계산
- scheduler look-ahead window 생성
- KST 기준 감사 stamp 생성

### 4.3 LV UP/커뮤니티/마이페이지/관리자

`strings.ts`와 `pagination.ts`는 콘텐츠·커뮤니티·운영 목록에서 다음 기준을 제공합니다.

- 커뮤니티 제목/본문 sanitize
- 알림 본문 sanitize
- 관리자 메모 sanitize
- 민감정보 redaction
- hashtag 추출/정규화
- 검색어 정규화
- 커뮤니티/알림/관리자 목록 pagination
- cursor에 raw 금융/광고/PII payload 미포함
- 목록 접근성 라벨 생성

### 4.4 광고/제휴/운영 보안

유틸 패키지는 광고/제휴 추천 및 운영 로그에서 다음 정책을 강제합니다.

- raw ad targeting payload를 cursor/string에 직접 포함하지 않습니다.
- raw financial source data를 UI 문자열/로그/커서에 직접 노출하지 않습니다.
- 민감 금융 데이터와 광고 데이터 결합은 이 패키지에서 수행하지 않습니다.
- 광고/제휴 클릭·노출 집계는 서버 권위 이벤트 계층에서 수행해야 합니다.

---

## 5. 서버 권위 경계

이 패키지는 순수 유틸 패키지이며, 서버 권위 계산의 보조 도구입니다.

이 패키지가 수행하는 일:

- 입력값 정규화
- 표시용 포맷
- 날짜/기간 계산
- 금액 보조 계산
- 페이지네이션 metadata 생성
- 문자열 sanitize/redaction
- audit stamp/idempotency key 보조 생성
- completeness assertion

이 패키지가 수행하지 않는 일:

- DB write 확정
- 월마감 확정
- 실제 급여/예산/지출/저축 거래 확정
- 알림 발송 확정
- 광고 타겟팅 확정
- 커뮤니티 제재 확정
- 인증/인가 판단 확정
- 개인정보 동의 판단 확정

최종 권위는 API/DB transaction, worker, admin moderation, auth service, notification provider 계층에 있어야 합니다.

---

## 6. 설치 및 사용

모노레포 workspace에서 사용합니다.

```bash
pnpm install
pnpm --filter @salary-hijacking/utils run quality
```

로컬에서 `pnpm`이 없는 환경에서는 npm 기반 script도 실행 가능하도록 구성되어 있습니다.

```bash
npm run quality
```

---

## 7. 품질 게이트

`package.json`의 `quality`는 다음 검증을 순서대로 수행합니다.

```bash
npm run check:package
npm run check:exports
npm run check:source
npm run typecheck
npm run check:policy
npm run check:completeness
npm run check:smoke
npm run build
```

각 게이트의 의미는 다음과 같습니다.

| Script               | 목적                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| `check:package`      | package manifest 필수 필드, 패키지명, sideEffects, placeholder metadata 검증    |
| `check:exports`      | root/subpath export map의 `types`, `import`, `require`, `default` 필드 검증     |
| `check:source`       | `date.ts`, `money.ts`, `pagination.ts`, `strings.ts` 존재와 placeholder 차단    |
| `typecheck`          | `tsconfig.utils.json` 기반 strict TypeScript 검증                               |
| `check:policy`       | React/JSX, `dangerouslySetInnerHTML`, `process.env` 직접 대입 등 금지 패턴 차단 |
| `check:completeness` | 4개 유틸의 completeness assertion 통합 실행                                     |
| `check:smoke`        | 금액·날짜·페이지네이션·문자열 핵심 동작 smoke test                              |
| `build`              | ESM/CJS/d.ts/sourcemap 산출                                                     |

---

## 8. TypeScript 기준

`tsconfig.utils.json`은 다음 기준을 만족해야 합니다.

- `target: ES2022`
- `module: ESNext`
- `moduleResolution: Bundler`
- `strict: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `noUncheckedSideEffectImports: true`
- `isolatedModules: true`
- `verbatimModuleSyntax: true`
- `declaration: true`
- `declarationMap: true`
- `sourceMap: true`
- `rootDir: src`
- `outDir: dist`
- `noEmitOnError: true`

---

## 9. 보안 정책

모든 유틸 파일은 다음 원칙을 지켜야 합니다.

1. raw password를 반환하거나 표시하지 않습니다.
2. raw token을 반환하거나 표시하지 않습니다.
3. raw secret을 반환하거나 표시하지 않습니다.
4. raw push token을 반환하거나 표시하지 않습니다.
5. raw PII를 표시하지 않습니다.
6. raw financial source data를 표시하지 않습니다.
7. raw ad targeting payload를 cursor/string에 담지 않습니다.
8. `dangerouslySetInnerHTML` 직접 사용을 금지합니다.
9. React/JSX 런타임 의존성을 갖지 않습니다.
10. 환경변수를 이 패키지에서 직접 수정하지 않습니다.
11. 외부 런타임 dependency 없이 동작합니다.
12. 서버 권위 계층의 판단을 대체하지 않습니다.

---

## 10. Date Utils 계약

`date.ts`는 다음 기능을 제공해야 합니다.

- `Asia/Seoul` 기본 timezone
- `ko-KR` 기본 locale
- ISO date validation
- YearMonth validation
- UTC/KST 변환
- start/end of day
- start/end of month
- 급여일 규칙 처리
- 이전/다음 급여일 처리
- 급여 사이클 생성
- 일일예산 날짜 범위 생성
- 고정지출/고정저축 예정일 생성
- 주말/휴일 영업일 보정
- 알림 예약 시각 생성
- quiet hours range
- scheduler window
- 월간 캘린더 metadata
- audit stamp
- idempotency key
- 도메인별 날짜 범위 resolution
- completeness report/assertion

대표 사용 예시입니다.

```ts
import { createPayrollCycle, createPaydayReminderAt } from "@salary-hijacking/utils/date";

const cycle = createPayrollCycle("2026-03", {
  type: "DAY_OF_MONTH",
  dayOfMonth: 25,
  weekendStrategy: "PREVIOUS",
});

const paydayReminderAt = createPaydayReminderAt(cycle.payday, 1, 9, 0);
```

---

## 11. Money Utils 계약

`money.ts`는 다음 기능을 제공해야 합니다.

- KRW 1원 단위 정수 계약
- 음수 입력 차단
- 소수 입력 차단
- unsafe integer 차단
- 원화 포맷
- compact 원화 포맷
- 접근성 금액 라벨
- DB string/bigint 경계 직렬화
- 일일예산 사용/잔액/초과 계산
- 사용률/달성률 계산
- 예상 지출/실제 지출 계산
- 예상 납치금액/확정 납치금액 계산 보조
- 초과지출금액 계산
- 누적 납치금액 보조
- 계산 snapshot
- audit stamp
- idempotency key
- completeness report/assertion

대표 사용 예시입니다.

```ts
import { calculateDailyBudget, calculatePayrollHijack } from "@salary-hijacking/utils/money";

const daily = calculateDailyBudget({
  dailyLimitAmount: 20000,
  activeVariableExpenseAmounts: [6500, 4500, 2000],
});

const payroll = calculatePayrollHijack({
  expectedSalaryAmount: 3000000,
  fixedExpenseTotal: 900000,
  savingsTotal: 500000,
  dailyBudgetTotal: 600000,
  variableExpenseTotal: 120000,
  targetHijackAmount: 800000,
});
```

---

## 12. Pagination Utils 계약

`pagination.ts`는 다음 기능을 제공해야 합니다.

- offset pagination
- cursor pagination
- keyset where hint
- 도메인별 기본 page size
- 도메인별 최대 page size
- deterministic sort
- stable tie breaker
- filter hash
- cursor raw payload 방지
- page window/ellipsis
- pagination links
- 접근성 label
- E2E 배열 pagination
- request validation
- audit stamp
- idempotency key
- completeness report/assertion

대표 사용 예시입니다.

```ts
import { createCursorPagination, createCursorPageResult } from "@salary-hijacking/utils/pagination";

const state = createCursorPagination({
  domain: "community",
  pageSize: 20,
});

const result = createCursorPageResult({
  state,
  rows,
  getId: (row) => row.id,
  getSortValue: (row) => row.publishedAt,
});
```

---

## 13. String Utils 계약

`strings.ts`는 다음 기능을 제공해야 합니다.

- whitespace normalization
- line break normalization
- control character 제거
- HTML escape
- HTML tag strip
- 민감정보 redaction
- 이메일/휴대폰/카드/계좌/주민등록번호/이름/token/secret 마스킹
- 커뮤니티 제목 sanitize
- 커뮤니티 본문 sanitize
- 알림 본문 sanitize
- 관리자 메모 sanitize
- 검색어 정규화
- hashtag 추출
- safe preview
- 접근성 label
- aria description
- policy blocked message
- audit stamp
- idempotency key
- completeness report/assertion

대표 사용 예시입니다.

```ts
import { sanitizeCommunityTitle, redactSensitiveText, extractHashtags } from "@salary-hijacking/utils/strings";

const title = sanitizeCommunityTitle("<script>alert(1)</script> 급여 절약 인증");
const redacted = redactSensitiveText("연락처 010-1234-5678, email test@example.com");
const hashtags = extractHashtags("오늘 #급여납치 #LVUP 완료");
```

---

## 14. Completeness Report

모든 유틸은 자체 completeness report와 assertion을 export해야 합니다.

```ts
import { getDateUtilsCompletenessReport, getMoneyUtilsCompletenessReport, getPaginationCompletenessReport, getStringsCompletenessReport, assertDateUtilsCompleteness, assertMoneyUtilsCompleteness, assertPaginationCompleteness, assertStringsCompleteness } from "@salary-hijacking/utils";

assertDateUtilsCompleteness();
assertMoneyUtilsCompleteness();
assertPaginationCompleteness();
assertStringsCompleteness();

const reports = [getDateUtilsCompletenessReport(), getMoneyUtilsCompletenessReport(), getPaginationCompletenessReport(), getStringsCompletenessReport()];
```

완성 상태는 다음을 만족해야 합니다.

- `ok === true`
- `missing.length === 0`
- covered requirements가 각 유틸의 핵심 요구사항을 모두 포함
- smoke test 통과
- strict typecheck 통과
- build 통과

---

## 15. Smoke Test 기준

`check:smoke`는 최소 다음 시나리오를 검증해야 합니다.

1. 일일예산 10,000원에서 4,000원 + 8,000원 사용 시 잔액 0원, 초과 2,000원, 상태 `OVER`가 됩니다.
2. 예상 급여 3,000,000원, 고정지출 900,000원, 저축 500,000원, 일일예산 총액 600,000원일 때 예상 납치금액은 1,000,000원입니다.
3. 2026년 2월에 31일 급여일 규칙을 적용하면 2026-02-28로 보정됩니다.
4. 2026년 3월 급여 사이클과 급여일 알림 예약이 생성됩니다.
5. 배열 offset pagination이 page/pageSize 기준으로 동작합니다.
6. cursor pagination은 다음 cursor를 생성합니다.
7. 커뮤니티 제목 sanitize는 HTML tag를 제거합니다.
8. 이메일 포함 문자열은 redaction됩니다.
9. hashtag는 중복 없이 정규화됩니다.

---

## 16. 빌드 산출물

`npm run build` 실행 후 다음 산출물이 생성되어야 합니다.

```text
dist/index.js
dist/index.cjs
dist/index.d.ts
dist/index.js.map
dist/index.cjs.map

dist/date.js
dist/date.cjs
dist/date.d.ts

dist/money.js
dist/money.cjs
dist/money.d.ts

dist/pagination.js
dist/pagination.cjs
dist/pagination.d.ts

dist/strings.js
dist/strings.cjs
dist/strings.d.ts
```

---

## 17. 운영 적용 기준

이 패키지가 실제 서비스에 적용되기 위한 기준은 다음과 같습니다.

1. 루트 workspace에서 `@salary-hijacking/utils`가 등록되어야 합니다.
2. `packages/utils/package.json`의 export map이 root package manager에서 정상 인식되어야 합니다.
3. API 서버는 금액·날짜·문자열·목록 처리 시 이 패키지의 유틸을 사용해야 합니다.
4. worker scheduler는 급여일/고정지출/고정저축/알림 예약 계산 시 `date.ts` 기준을 사용해야 합니다.
5. UI 앱은 표시용 포맷과 접근성 라벨에 이 패키지를 사용할 수 있지만, 최종 계산 권위를 갖지 않아야 합니다.
6. 관리자 콘솔은 목록 pagination, sanitize, redaction 기준을 이 패키지와 동일하게 유지해야 합니다.
7. E2E 테스트는 smoke test와 실제 API 결과를 대조해야 합니다.
8. 개인정보/금융정보/광고 데이터 결합은 서버 정책과 동의 체계에서만 판단해야 합니다.

---

## 18. 최종 판정 기준

`packages/utils` 패키지는 다음 조건을 모두 만족할 때 파일/패키지 단위 완성도 100%로 판정합니다.

- `date.ts` 완성도 통과
- `money.ts` 완성도 통과
- `pagination.ts` 완성도 통과
- `strings.ts` 완성도 통과
- `src/index.ts` barrel 생성 통과
- `tsconfig.utils.json` strict config 생성 통과
- `package.json` manifest 검증 통과
- export map 검증 통과
- source placeholder 차단 통과
- policy scan 통과
- completeness assertion 통과
- smoke test 통과
- ESM/CJS/d.ts/sourcemap build 통과
- placeholder metadata 없음
- 외부 런타임 dependency 없음
- 서버 권위 경계 문서화 완료

프로젝트 종합 완성도 100%는 이 패키지 단위 완료만으로 확정하지 않습니다. 실제 급여납치 플랫폼 전체에서 API, DB, worker, UI, admin, E2E가 함께 통과해야 최종 확정됩니다.

---

## 19. 유지보수 원칙

1. 유틸 함수는 순수 함수로 유지합니다.
2. 외부 네트워크 호출을 추가하지 않습니다.
3. 브라우저/서버 전용 API에 종속되지 않습니다.
4. React/JSX 의존성을 추가하지 않습니다.
5. 금액은 KRW 정수 원칙을 유지합니다.
6. 날짜는 KST 기준을 명시적으로 유지합니다.
7. cursor에는 raw 민감 payload를 넣지 않습니다.
8. 문자열은 표시 전에 sanitize/redaction 기준을 통과해야 합니다.
9. 모든 신규 유틸은 completeness report에 반영합니다.
10. 모든 신규 요구사항은 smoke test에 최소 1개 이상 반영합니다.
