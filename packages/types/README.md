# packages/types

급여납치 Salary Hijacking Platform의 공통 타입 패키지입니다. 이 패키지는 모바일 앱, 관리자 콘솔, API 서버, DB 계층, 알림 워커, 스케줄러, QA/E2E 테스트, 문서화 도구가 동일하게 참조하는 **도메인 타입·API 타입·상태값 타입·검증 계약의 단일 진실 공급원(SSOT)** 입니다.

이 폴더의 하위 구조는 급여납치 플랫폼 최종 파일트리 기준으로 고정합니다. 타입 패키지는 런타임 비즈니스 로직을 직접 수행하지 않고, 각 구현 계층이 반드시 따라야 하는 서버 권위 계산 계약, 개인정보/보안 경계, 도메인별 API 입출력 계약, 운영 감사 계약을 TypeScript 타입과 검증 가능한 메타데이터로 제공합니다.

---

## 1. 패키지 역할

`@salary-hijacking/types`는 다음 영역을 하나의 공개 계약으로 묶습니다.

| 영역           | 책임                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------- |
| 사용자/인증    | 이메일 로그인, 소셜 로그인, 자동 로그인 세션, 프로필, 마이페이지, 동의, 기기, MFA, 관리자 RBAC |
| 급여           | 급여계획, 급여일, 수령금액, 예상/확정/누적 납치금액, 목표달성률, 월마감, 서버 권위 계산        |
| 지출           | 고정지출, 일일예산, 변동지출, 예산 초과금액, 영수증/첨부, 지출 재계산                          |
| 저축 연계      | 급여·지출 계산 계약에서 고정저축 합산값과 알림 힌트가 연결될 수 있도록 타입 경계 제공          |
| LV UP          | 독서, 뉴스, 영어, 건강/홈트, 금융상식 퀴즈, 미션, 경험치, 레벨, 스트릭, 인증                   |
| 알림           | 인앱 알림, 푸시, 이메일, 기기별 발송 이력, 예약/재시도, 수신 설정, 캠페인                      |
| 커뮤니티       | 게시판, 글쓰기, 댓글, 반응, 신고, 모더레이션, 레벨업 인증 연결                                 |
| 광고/제휴 분리 | 광고·제휴 데이터와 급여/지출/저축 원천 데이터의 직접 결합 금지 정책                            |
| 관리자/운영    | 감사로그, 관리자 조정, 지표, 위험 레벨, 멱등성 기록                                            |

---

## 2. 최종 폴더 구조

```text
packages/types/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── domain/
        ├── user.types.ts
        ├── payroll.types.ts
        ├── expense.types.ts
        ├── growth.types.ts
        ├── notification.types.ts
        └── community.types.ts
```

`src/index.ts`는 public entry입니다. 모든 도메인 파일은 `UUID`, `ISODateString`, `RequestId` 같은 공통 이름을 각자 보유하므로, 충돌 방지를 위해 `export *`가 아니라 namespace barrel export를 사용합니다.

```ts
import { payrollDomain, userDomain } from "@salary-hijacking/types";

type PayrollPlan = payrollDomain.PayrollPlan;
type MeUser = userDomain.MeUser;

const report = payrollDomain.getPayrollTypesCompletenessReport();
```

---

## 3. 공개 export 계약

`package.json`의 `exports`는 다음 경로를 반드시 제공합니다.

```text
@salary-hijacking/types
@salary-hijacking/types/user
@salary-hijacking/types/payroll
@salary-hijacking/types/expense
@salary-hijacking/types/growth
@salary-hijacking/types/notification
@salary-hijacking/types/community
@salary-hijacking/types/domain/user
@salary-hijacking/types/domain/payroll
@salary-hijacking/types/domain/expense
@salary-hijacking/types/domain/growth
@salary-hijacking/types/domain/notification
@salary-hijacking/types/domain/community
@salary-hijacking/types/domain/user.types
@salary-hijacking/types/domain/payroll.types
@salary-hijacking/types/domain/expense.types
@salary-hijacking/types/domain/growth.types
@salary-hijacking/types/domain/notification.types
@salary-hijacking/types/domain/community.types
```

도메인별 권장 import는 namespace import입니다.

```ts
import { expenseDomain, notificationDomain } from "@salary-hijacking/types";

type DailyBudget = expenseDomain.DailyBudget;
type Notification = notificationDomain.Notification;
```

직접 subpath import도 허용합니다.

```ts
import type { PayrollPlan, PayrollCalculationOutput } from "@salary-hijacking/types/payroll";
```

---

## 4. 도메인 파일별 완료 기준

### 4.1 `user.types.ts`

사용자 도메인은 다음 계약을 포함해야 합니다.

- 이메일/비밀번호 회원가입, 로그인, 로그아웃, 토큰 갱신
- 네이버, 카카오, 구글, 애플 소셜 로그인 시작/콜백/연결/해제
- 자동 로그인 세션, refresh token hash-only 저장, session family 회전
- `User`, `UserProfile`, `MeUser`, `PublicUser`, `UserMyPageSummary`
- 마이페이지의 누적 납치금액 라벨, 레벨, 자기관리 성과, 게시글/레벨업/문의/공지 카운트
- 알림 설정, 자동 로그인, 조용한 시간, locale/timezone/currency
- 필수 약관, 개인정보, 연령 확인, 커뮤니티 정책, 푸시/마케팅/광고/제휴/분석 동의
- 기기, 푸시 권한, push token hash/secret ref 정책
- MFA, passkey, recovery code, 관리자 RBAC
- 감사로그, 멱등성, 관리자 지표
- raw password/token/secret/push token/IP/User-Agent/재무 원천 데이터 금지 정책

### 4.2 `payroll.types.ts`

급여 도메인은 플랫폼 계산의 중심이므로 다음 계약을 포함해야 합니다.

- 급여계획, 급여일, 수령 예정 급여, 실제 수령 급여
- 고정지출, 고정저축, 일일예산, 변동지출 합산 입력
- 예상 납치금액, 확정 납치금액, 누적 납치금액
- 목표 납치금액, 목표 달성률, 초과 지출 상태
- 월 주기, 월마감, 월 재오픈, 계산 스냅샷
- 급여 홈 요약, 계획/설정 요약, 마이페이지 요약
- 급여일/목표달성/예산초과/월마감 알림 힌트
- 서버 권위 계산 함수와 계산 입력/출력 타입
- KRW 1원 단위 정수, 음수/소수 금지, 납치금액 0원 floor 정책
- 멱등성, 감사로그, 관리자 조정, 관리자 지표

### 4.3 `expense.types.ts`

지출 도메인은 다음 계약을 포함해야 합니다.

- 고정지출: 구독료, 대출, 보험, 통신, 주거, 교통, 카드, 세금, 교육, 의료, 기타
- 고정지출 상태: 예정, 납부완료, 스킵, 취소
- 일일예산: 설정금액, 사용금액, 남은금액, 초과금액, 상태
- 변동지출: 식비, 카페, 교통, 쇼핑, 문화/게임, 의료, 교육, 생활, 선물, 여행, 기타
- 지출 추가/수정/취소/삭제 시 일일예산 재계산 계약
- 예산 초과 시 `remainingAmount = 0`, `overAmount > 0` 정책
- 영수증/첨부, 첨부 스캔 상태, 파일 해시
- 홈 요약, 월간 요약, 캘린더 요약
- KRW 1원 단위 정수, 음수/소수 금지
- 멱등성, 감사로그, 관리자 조정, 지표

### 4.4 `growth.types.ts`

LV UP 도메인은 다음 계약을 포함해야 합니다.

- 독서, 뉴스, 영어, 건강/홈트, 금융상식 퀴즈
- 일일 미션, 주간 챌린지, 커뮤니티 인증 미션
- 레벨, 경험치, 다음 레벨까지 경험치, 진행률
- 스트릭, 최장 수행일, 오늘 완료 수
- AI 추천, 큐레이션, 파트너, RSS, 관리자 콘텐츠
- 독서 카테고리, 뉴스 카테고리, 영어 스킬, 건강 카테고리
- 콘텐츠 상태, 미션 상태, 보상, 배지, 인증
- 커뮤니티 게시글 연결 인증
- 건강 콘텐츠는 의학 진단이 아니고, 금융 콘텐츠는 투자 조언이 아니라는 정책
- AI 추천/파트너 콘텐츠 고지 정책
- 멱등성, 감사로그, 관리자 콘텐츠 운영, 관리자 지표

### 4.5 `notification.types.ts`

알림 도메인은 다음 계약을 포함해야 합니다.

- 급여일, 고정지출 결제 예정, 고정저축 예정, 예산 초과, 남은 예산
- 납치 목표 달성, LV UP 미션, 레벨업, 커뮤니티 댓글/반응/신고 결과
- 공지, 보안, 시스템 알림
- 인앱, 푸시, 이메일 채널
- EXPO, FCM, APNS, IN_APP, EMAIL, MOCK provider
- 알림 본문과 기기별 발송 이력 분리
- 예약, 발송, 읽음, 실패, 취소, 만료 상태
- 수신 설정, 조용한 시간, 푸시 거부 시 인앱 알림함 유지
- 마케팅/광고/제휴 동의 기반 발송
- push token 원문 금지, hash/secret ref 정책
- 템플릿, 캠페인, 재시도, 감사로그, 지표

### 4.6 `community.types.ts`

커뮤니티 도메인은 다음 계약을 포함해야 합니다.

- 전체, 자유, 레벨업 인증, 소비 절제, 저축 팁, 월급 이야기, 취미, 공지, 이벤트, FAQ
- 게시글, 댓글, 대댓글, 반응, 북마크, 공유
- 질문글, 익명 글쓰기, 첨부, 태그
- 인기글, 최신글, 검색, 정렬, 피드
- 신고, 숨김, 잠금, 블라인드, 삭제, 관리자 검토
- 레벨업 인증 게시글 연결
- 광고/제휴와 재무 원천 데이터 결합 금지
- 멱등성, 감사로그, 모더레이션, 제재, 관리자 지표

---

## 5. 서버 권위 계산 원칙

급여납치의 금액 계산은 클라이언트 최종 권위가 될 수 없습니다. 클라이언트는 입력과 표시를 담당하고, 최종 계산은 API/DB 트랜잭션 기준 서버 권위로 확정합니다.

필수 원칙은 다음과 같습니다.

1. 금액은 KRW 1원 단위 정수로 저장합니다.
2. DB 원천 금액은 BIGINT 계열을 사용합니다.
3. 사용자 입력 금액은 음수와 소수를 허용하지 않습니다.
4. 예상 납치금액은 `salary - fixedExpense - savings - dailyBudget` 기준으로 계산합니다.
5. 확정 납치금액은 월마감 시 실제 급여와 실제 지출 합계를 기준으로 계산합니다.
6. 납치금액 표시값은 0원 미만으로 내려가지 않습니다.
7. 지출 초과분은 별도 `overAmount` 또는 `overExpenseAmount`로 표시합니다.
8. 변동지출 생성/수정/취소/삭제는 일일예산을 재계산해야 합니다.
9. 월마감과 주요 쓰기 작업은 idempotency key를 사용해야 합니다.
10. 계산 스냅샷은 입력과 출력을 함께 저장해 감사 가능해야 합니다.

---

## 6. 개인정보·보안 경계

타입 패키지는 아래 정책을 공개 계약으로 고정합니다.

| 금지 항목                        | 정책                                             |
| -------------------------------- | ------------------------------------------------ |
| raw password                     | 응답/로그/공개 타입에 포함 금지                  |
| raw access token / refresh token | refresh token은 hash-only, 응답 외 저장 금지     |
| raw secret                       | secret ref 또는 hash만 허용                      |
| raw push token                   | hash 또는 secret ref만 허용                      |
| raw IP / User-Agent              | hash만 허용                                      |
| 급여/지출/저축 원천 데이터       | 광고·커뮤니티·성장 추천 payload와 직접 결합 금지 |
| 광고 개인화                      | 명시적 동의 필요                                 |
| 마케팅 발송                      | 명시적 동의 필요                                 |
| 사용자 데이터 접근               | RLS와 감사로그 필수                              |
| 클라이언트 최종 인증 판단        | 금지                                             |
| 클라이언트 최종 금액 계산        | 금지                                             |

---

## 7. 빌드와 검증

패키지 기준 명령은 다음과 같습니다.

```bash
pnpm --filter @salary-hijacking/types typecheck
pnpm --filter @salary-hijacking/types build
pnpm --filter @salary-hijacking/types types:assert
pnpm --filter @salary-hijacking/types types:contract
pnpm --filter @salary-hijacking/types security:scan
pnpm --filter @salary-hijacking/types privacy:check
pnpm --filter @salary-hijacking/types quality
```

패키지 내부에서 직접 실행하는 경우 다음 명령을 사용합니다.

```bash
pnpm typecheck
pnpm build
pnpm types:assert
pnpm types:contract
pnpm quality
```

검증 게이트의 책임은 다음과 같습니다.

| 스크립트           | 책임                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| `validate:package` | package.json 필수 필드와 패키지명 검증                                              |
| `validate:exports` | public export map 검증                                                              |
| `validate:source`  | 필수 source 파일 존재와 placeholder 제거 검증                                       |
| `typecheck`        | TypeScript strict 타입 검증                                                         |
| `build`            | ESM JS와 `.d.ts` 산출물 생성                                                        |
| `validate:dist`    | dist 산출물 누락 검증                                                               |
| `types:assert`     | 패키지 완성도 리포트 런타임 assertion                                               |
| `security:scan`    | raw password/token/secret/push token/financial join/client authority 금지 패턴 검증 |
| `privacy:check`    | 개인정보·계산 정책 메타데이터 검증                                                  |
| `quality`          | release 전 통합 품질 게이트                                                         |

---

## 8. Oh My Codex 작업 기준

이 패키지를 Oh My Codex 또는 Codex류 자동화 에이전트로 수정할 때의 기준은 다음과 같습니다.

1. `src/index.ts`는 namespace barrel export만 유지합니다.
2. 도메인 파일의 공통 타입 이름 충돌을 만들 수 있는 `export *`를 추가하지 않습니다.
3. 모든 도메인 파일은 `*_TYPES_CONTRACT_VERSION`, `*_SAFE_POLICY_GUARD`, `*_API_PATHS`, `get*CompletenessReport`, `assert*Completeness`, default export를 유지합니다.
4. 새 도메인 파일을 추가하면 `package.json` exports, `typesVersions`, `src/index.ts`, README, 검증 스크립트에 동시에 반영합니다.
5. 금액 도메인 타입은 KRW 1원 단위 정수와 서버 권위 계산 원칙을 깨지 않습니다.
6. raw credential, raw token, raw push token, raw financial source data를 공개 타입이나 로그 타입에 추가하지 않습니다.
7. 광고/제휴 payload가 급여·지출·저축 원천 데이터를 직접 참조하게 만들지 않습니다.
8. 커뮤니티 payload가 재무 원천 데이터를 직접 참조하게 만들지 않습니다.
9. 관리자 조정 타입은 반드시 감사로그와 사유를 동반합니다.
10. 쓰기 작업 요청 타입은 가능한 한 `idempotencyKey`, `requestId`, `traceId`를 포함합니다.

---

## 9. 앱/서비스별 사용 책임

| 소비자                   | 사용 방식                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `apps/mobile`            | 화면 props, mutation payload, 알림/커뮤니티/마이페이지 타입 참조 |
| `apps/admin`             | 관리자 콘솔 list/detail/action form과 감사로그 타입 참조         |
| `services/api`           | REST/RPC request/response 계약과 서버 권위 계산 입출력 참조      |
| `services/notifications` | 알림 타입, 채널, provider, delivery, preference 계약 참조        |
| `services/scheduler`     | 급여일/결제예정/저축예정/LV UP 리마인더 예약 타입 참조           |
| `packages/api-contract`  | Zod/OpenAPI 스키마와 타입 계약 일치 검증                         |
| `packages/db`            | DB schema, migration, RLS, audit event 타입 정렬                 |
| `qa`                     | E2E fixture, smoke test, contract assertion 참조                 |

---

## 10. 변경 체크리스트

타입 패키지를 수정할 때 반드시 다음 항목을 확인합니다.

- [ ] 대상 도메인 파일에 placeholder `export {}`가 남아 있지 않다.
- [ ] public export가 `src/index.ts`와 `package.json`에 반영되어 있다.
- [ ] 도메인 completeness report가 `ok: true`를 반환한다.
- [ ] package completeness report가 `ok: true`를 반환한다.
- [ ] `pnpm typecheck`가 통과한다.
- [ ] `pnpm build`가 통과한다.
- [ ] `pnpm types:contract`가 통과한다.
- [ ] `pnpm security:scan`이 통과한다.
- [ ] `pnpm privacy:check`가 통과한다.
- [ ] 금액 타입은 음수/소수 입력을 허용하지 않는다.
- [ ] 서버 권위 계산 원칙이 깨지지 않는다.
- [ ] 광고/커뮤니티/성장 payload에 재무 원천 데이터가 직접 결합되지 않는다.
- [ ] 관리자 작업에는 감사로그와 reason이 있다.
- [ ] 쓰기 작업은 멱등성을 고려한다.
- [ ] 문서의 사용 예시가 실제 export 구조와 일치한다.

---

## 11. 완료 판정

`packages/types`의 파일 단위 완료 판정은 다음 조건을 모두 만족해야 합니다.

1. `README.md`가 도메인 범위, export 계약, 보안 정책, 계산 정책, 검증 방법을 설명한다.
2. `package.json`이 실제 빌드 가능한 ESM 타입 패키지로 구성되어 있다.
3. `src/index.ts`가 모든 도메인을 충돌 없이 공개한다.
4. `src/domain/*.types.ts`가 각 도메인의 타입·API·상태·정책·완성도 리포트를 제공한다.
5. 타입 패키지 자체가 `typecheck`, `build`, `types:assert`, `security:scan`, `privacy:check`를 통과한다.
6. 프로젝트 전체 완료 판정은 이 패키지만으로 확정하지 않고, 앱/API/DB/관리자/E2E까지 전체 품질 게이트 통과로 확정한다.

이 README는 `packages/types`가 단순 타입 모음이 아니라 급여납치 플랫폼 전체의 도메인 계약, 서버 권위 계산 정책, 개인정보/광고 분리 정책, 운영 검증 게이트를 고정하는 핵심 패키지임을 문서화합니다.
