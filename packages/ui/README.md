# packages/ui

`@salary-hijacking/ui`는 급여납치 플랫폼의 공통 UI 패키지입니다. 이 패키지는 급여 홈, 계획, 일일예산, 고정지출, 고정저축, 변동지출, 알림, LV UP, 커뮤니티, 글쓰기, 마이페이지, 관리자 콘솔, 광고·제휴 운영 화면에서 재사용되는 headless UI 컴포넌트와 디자인 토큰의 단일 출처입니다.

이 문서는 `packages/ui` 패키지를 실제 레포에 즉시 적용할 수 있도록 구성, 공개 API, 검증 명령, 통합 기준, 보안·개인정보 경계, 운영 품질 기준을 정의합니다.

## 패키지 목표

`packages/ui`의 목표는 화면을 직접 렌더링하는 React 전용 UI가 아니라, 웹·앱·관리자·테스트 어댑터가 공통으로 소비할 수 있는 headless render-tree와 디자인 토큰을 제공하는 것입니다.

이 구조는 다음 원칙을 따릅니다.

1. React, JSX, `react/jsx-runtime`에 의존하지 않습니다.
2. 서버 권위 계산 결과를 화면에 안전하게 표시하기 위한 UI 계약만 제공합니다.
3. 급여·예산·지출·저축·알림·성장·커뮤니티·광고·관리자 도메인의 공통 UI 언어를 제공합니다.
4. 개인정보, 토큰, 원천 금융 payload, 광고/커뮤니티 재무 결합 payload를 UI 계층에서 차단합니다.
5. 앱, 웹, 관리자 콘솔, E2E 테스트가 동일한 UI 계약을 참조하도록 합니다.

## 현재 포함 파일

```text
packages/ui
├── README.md
├── package.json
└── src
    ├── components
    │   ├── CommunityPostCard.tsx
    │   ├── DailyBudgetCard.tsx
    │   ├── ExpenseListItem.tsx
    │   ├── NotificationRow.tsx
    │   └── SalaryStatusCard.tsx
    └── tokens
        ├── colors.ts
        ├── spacing.ts
        └── typography.ts
```

`package.json`의 `prepare:barrels` 스크립트는 다음 barrel 파일을 자동 생성합니다.

```text
src/index.ts
src/components/index.ts
src/tokens/index.ts
```

## 공개 API

### Root export

```ts
import { CommunityPostCard, DailyBudgetCard, ExpenseListItem, NotificationRow, SalaryStatusCard, colors, spacing, typography } from "@salary-hijacking/ui";
```

### Components export

```ts
import { CommunityPostCard, DailyBudgetCard, ExpenseListItem, NotificationRow, SalaryStatusCard } from "@salary-hijacking/ui/components";
```

### 개별 컴포넌트 export

```ts
import { CommunityPostCard } from "@salary-hijacking/ui/components/CommunityPostCard";
import { DailyBudgetCard } from "@salary-hijacking/ui/components/DailyBudgetCard";
import { ExpenseListItem } from "@salary-hijacking/ui/components/ExpenseListItem";
import { NotificationRow } from "@salary-hijacking/ui/components/NotificationRow";
import { SalaryStatusCard } from "@salary-hijacking/ui/components/SalaryStatusCard";
```

### Tokens export

```ts
import { colors, spacing, typography } from "@salary-hijacking/ui/tokens";
import { colors as colorTokens } from "@salary-hijacking/ui/tokens/colors";
import { spacing as spacingTokens } from "@salary-hijacking/ui/tokens/spacing";
import { typography as typographyTokens } from "@salary-hijacking/ui/tokens/typography";
```

## 컴포넌트 계약

모든 컴포넌트는 DOM, JSX, React element를 반환하지 않습니다. 대신 adapter가 실제 화면으로 변환할 수 있는 render-tree를 반환합니다.

공통 반환 구조는 다음과 같습니다.

```ts
type UiRenderTree = {
  component: string;
  contractVersion: string;
  root: RenderNode;
  model: ViewModel;
  actions: readonly ActionDescriptor[];
};
```

이 방식은 다음 장점을 제공합니다.

- 앱/웹/관리자 콘솔 어댑터를 분리할 수 있습니다.
- 테스트에서 UI 구조와 액션 계약을 React 없이 검증할 수 있습니다.
- `react/jsx-runtime`이 없는 환경에서도 타입 검증과 빌드가 가능합니다.
- 서버 권위 상태, 정책 차단, 접근성 속성을 동일하게 보장할 수 있습니다.

## 컴포넌트별 역할

### `SalaryStatusCard.tsx`

급여 홈의 핵심 상태 카드입니다.

반영 항목:

- 예상 급여
- 실제 수령 급여
- 예상 납치금액
- 확정 납치금액
- 누적 납치금액
- 목표 달성률
- 고정지출 합계
- 고정저축 합계
- 일일예산 합계
- 변동지출 합계
- 초과지출 표시
- 급여일, 급여일 당일, 수령완료, 월마감, 재오픈, 잠김 상태
- 서버 권위 계산 경계
- 월마감/재오픈/관리자 조정 액션

### `DailyBudgetCard.tsx`

오늘의 생활비와 변동지출 반영 상태를 보여주는 일일예산 카드입니다.

반영 항목:

- 일일예산 한도
- 사용금액
- 남은금액
- 초과금액
- 예산 사용률
- 최근 변동지출 preview
- 지출 추가, 예산 수정, 상세 보기, 새로고침, 전체 지출 액션
- 서버 권위 계산 경계
- stale 계산 상태
- KRW 정수 표시

### `ExpenseListItem.tsx`

고정지출, 변동지출, 고정저축, 조정 항목을 공통으로 표시하는 지출 row입니다.

반영 항목:

- 고정지출
- 변동지출
- 고정저축 연계 항목
- 조정 항목
- 예정, 반영됨, 납부완료, 취소, 환불, 실패, 검토중, 잠김, 삭제 상태
- 영수증 검사 상태
- 결제수단
- 입력 경로
- 일일예산 반영 전후 잔액
- 예산 초과 상태
- 상세, 수정, 삭제, 취소, 복구, 납부완료, 스킵, 재시도, 영수증, 예산 보기, 운영 검토 액션

### `NotificationRow.tsx`

알림함, 홈 알림 preview, 관리자 발송/실패 모니터링에서 사용하는 알림 row입니다.

반영 항목:

- 급여일 알림
- 고정지출 알림
- 고정저축 알림
- 예산초과 알림
- 남은예산 알림
- 목표달성 알림
- LV UP 알림
- 커뮤니티 댓글/반응/신고결과 알림
- 공지, 보안, 시스템, 마케팅, 제휴 알림
- 예약, 발송, 읽음, 실패, 취소, 만료, 차단 상태
- push, in-app, email, sms 채널
- delivery summary와 알림 본문 분리
- 수신 동의 guard
- 읽음/안읽음, 보관, 삭제, 나중에 보기, 재발송, 설정, 운영 검토 액션

### `CommunityPostCard.tsx`

커뮤니티 목록, 인증 피드, 게시글 preview, 관리자 검토 큐에서 사용하는 커뮤니티 카드입니다.

반영 항목:

- 자유게시판
- LV UP 인증
- 소비통제
- 저축팁
- 급여토크
- 취미
- 공지
- 이벤트
- FAQ
- 좋아요, 응원, 저장, 공유, 댓글, 신고, 수정, 삭제, 운영 검토 액션
- 익명/비익명 작성자 표시
- 태그, 첨부 preview, 반응 요약
- 모더레이션 상태
- 커뮤니티와 금융 원천 payload 결합 차단

## 디자인 토큰 계약

### `colors.ts`

색상 토큰의 단일 출처입니다.

반영 항목:

- light/dark scheme
- 브랜드 색상
- 배경, 텍스트, border, focus, shadow
- 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티, 광고·제휴, 관리자, 보안 도메인 색상
- 상태 색상
- 지출 카테고리 색상
- 알림 채널 색상
- chart series 색상
- WCAG 대비 계산 유틸
- CSS variable 생성 유틸

### `spacing.ts`

간격, radius, size, layout spacing의 단일 출처입니다.

반영 항목:

- 4px base grid
- px/rem spacing scale
- radius token
- icon/avatar/button/input/touch size
- 최소 터치 타깃 44px
- mobile/tablet/desktop/admin 플랫폼 spacing
- compact/comfortable/spacious density
- 컴포넌트별 spacing
- bottom sheet, modal, admin panel, ad slot spacing
- safe-area spacing
- fluid clamp spacing
- CSS variable 생성 유틸

### `typography.ts`

타이포그래피 토큰의 단일 출처입니다.

반영 항목:

- 한국어 UI 최적화 font stack
- system fallback
- display, heading, title, body, label, caption, button, code
- money/metric tabular numeric style
- mobile/tablet/desktop/admin 반응형 typography
- 컴포넌트별 typography mapping
- 최소 가독 글자 크기
- 권장 body line-height
- 한국어 `keep-all`
- overflow wrap safety
- CSS variable 생성 유틸

## 서버 권위 경계

이 패키지는 최종 급여·예산·지출·저축 계산을 수행하지 않습니다. 모든 금액과 상태는 서버/API/DB 트랜잭션에서 확정된 값을 안전하게 표시하는 역할만 합니다.

UI 계층에서 허용되는 작업:

- KRW 정수 표시 formatting
- 음수/소수 표시 정규화
- 사용률/진행률 표시용 계산
- 접근성 문자열 생성
- policy guard에 따른 차단 UI 생성
- 액션 descriptor 생성

UI 계층에서 금지되는 작업:

- 급여 납치금액 최종 산출
- 일일예산 잔액 최종 확정
- 변동지출 반영 결과 최종 확정
- 월마감 확정
- 알림 발송 여부 최종 판단
- 광고 타겟팅과 금융 payload 직접 결합

## 개인정보·보안 정책

모든 컴포넌트와 토큰은 다음 원칙을 공유합니다.

- raw password 렌더링 금지
- raw token 렌더링 금지
- raw secret 렌더링 금지
- raw push token 렌더링 금지
- raw PII 렌더링 금지
- 급여 원천 payload 렌더링 금지
- 지출 원천 payload 렌더링 금지
- 저축 원천 payload 렌더링 금지
- 광고/커뮤니티와 금융 원천 payload 결합 금지
- `dangerouslySetInnerHTML` 사용 금지
- 색상/간격/타이포그래피만으로 의미 전달 금지

정책 위반 가능성이 있는 payload는 정상 UI 대신 policy-blocked render-tree를 반환해야 합니다.

## 접근성 기준

`packages/ui`는 다음 접근성 기준을 전제로 합니다.

- 모든 주요 root node는 `aria-label`을 포함합니다.
- loading 상태는 `aria-busy`로 표현합니다.
- 진행률은 progressbar 속성 모델을 제공합니다.
- 액션은 `ariaLabel`을 반드시 포함합니다.
- 색상만으로 상태를 전달하지 않습니다.
- 터치 가능한 컨트롤은 44px 이상을 기준으로 합니다.
- 금액/숫자는 tabular numeric 표시를 우선합니다.
- 한국어 문장은 `keep-all`과 안전한 overflow wrapping을 기준으로 합니다.

## 빌드와 검증

`package.json` 기준 품질 게이트는 다음과 같습니다.

```bash
pnpm run check:package
pnpm run check:exports
pnpm run typecheck
pnpm run check:policy
pnpm run check:completeness
pnpm run build
pnpm run quality
```

개별 의미는 다음과 같습니다.

- `check:package`: manifest 필수 필드와 package 정책 검증
- `check:exports`: public export map 검증
- `typecheck`: strict TypeScript 검증
- `check:policy`: JSX 전역 확장, `dangerouslySetInnerHTML`, React 런타임 의존성 차단
- `check:completeness`: 모든 컴포넌트와 토큰의 completeness report 검증
- `build`: ESM/CJS/d.ts/sourcemap 산출
- `quality`: 전체 품질 게이트 통합 실행

## TypeScript 기준

이 패키지는 다음 기준을 통과해야 합니다.

```bash
tsc \
  --target ES2022 \
  --module ESNext \
  --moduleResolution Bundler \
  --strict \
  --exactOptionalPropertyTypes \
  --noUncheckedIndexedAccess \
  --jsx react-jsx \
  --noEmit \
  --skipLibCheck \
  src/index.ts \
  src/components/*.tsx \
  src/tokens/*.ts
```

컴포넌트 파일 확장자가 `.tsx`여도 JSX 문법은 사용하지 않습니다. 이는 실제 프로젝트에 React runtime이 없거나 adapter가 다른 플랫폼을 대상으로 하는 경우에도 패키지를 안전하게 사용할 수 있게 하기 위한 결정입니다.

## Adapter 통합 예시

headless render-tree는 각 플랫폼 adapter가 실제 UI로 변환합니다.

```ts
import { SalaryStatusCard } from "@salary-hijacking/ui/components/SalaryStatusCard";

const tree = SalaryStatusCard({
  summary: {
    payrollPlanId: "plan_2026_06",
    yearMonth: "2026-06",
    cycleStatus: "PLANNED",
    expectedSalaryAmount: 3000000,
    fixedExpenseTotal: 900000,
    savingsTotal: 500000,
    dailyBudgetTotal: 600000,
    variableExpenseTotal: 120000,
    expectedExpenseAmount: 2120000,
    expectedHijackAmount: 880000,
    cumulativeHijackAmount: 4200000,
    goalAmount: 5000000,
    policy: {
      serverAuthoritative: true,
    },
  },
});

console.log(tree.root);
console.log(tree.actions);
```

실제 React/Web adapter에서는 `tree.root.type`, `tree.root.style`, `tree.root.attributes`, `tree.root.children`, `tree.root.action`을 순회해 DOM 또는 native UI로 변환합니다.

## Completion contract

각 파일은 다음 report/assertion을 제공합니다.

```ts
getCommunityPostCardCompletenessReport();
getDailyBudgetCardCompletenessReport();
getExpenseListItemCompletenessReport();
getNotificationRowCompletenessReport();
getSalaryStatusCardCompletenessReport();
getColorsCompletenessReport();
getSpacingCompletenessReport();
getTypographyCompletenessReport();
```

모든 report는 다음 조건을 만족해야 합니다.

```ts
report.ok === true;
report.missing.length === 0;
```

## 운영 적용 기준

`packages/ui` 파일 단위 완료 기준:

- 모든 source 파일 존재
- 모든 public export map 존재
- TypeScript strict 통과
- JSX/React runtime 비의존성 확인
- policy guard 존재
- completeness report 존재
- runtime assertion 통과
- build 산출물 생성 가능

프로젝트 종합 완료 기준:

- 앱/관리자 adapter가 모든 render-tree를 실제 화면으로 변환
- API/DB 서버 권위 계산 결과와 UI model 연결
- 인증/RLS/권한/관리자 정책 통합
- 알림 서비스 delivery 상태와 NotificationRow 연결
- 커뮤니티 운영 정책과 CommunityPostCard 연결
- 광고·제휴 동의 정책과 토큰/컴포넌트 guard 연결
- E2E/QA에서 급여 홈, 일일예산, 지출, 저축, 알림, LV UP, 커뮤니티, 마이페이지, 관리자 콘솔 플로우 통과

## 최종 판정

`packages/ui`는 headless UI 컴포넌트와 디자인 토큰을 통해 급여납치 플랫폼의 공통 UI 계약을 제공합니다. 이 README는 패키지 목적, 구조, 공개 API, 보안·개인정보 경계, 서버 권위 원칙, 접근성, 빌드/검증 기준, 운영 통합 기준을 포함합니다.

파일 단위로는 더 이상 placeholder가 아니며, `package.json`, 5개 컴포넌트, 3개 토큰과 함께 사용될 때 `packages/ui` 패키지의 문서상·이론상 최종 안내 문서 역할을 수행합니다.
