# packages/api-contract · 급여납치 API 계약 패키지

문서 상태: 최종본  
파일 위치: `packages/api-contract/README.md`  
패키지명: `@salary-hijacking/api-contract`  
프로젝트: 급여납치 Salary Hijacking Platform  
계약 버전: `1.0.0`  
기준 시간대: `Asia/Seoul`  
기준 통화: `KRW`, 1원 단위 정수  
핵심 원칙: Zod 기반 API 계약, 서버 권위 계산, 표준 응답 envelope, 표준 오류 코드, RLS/RBAC 전제, 감사 가능성, 민감정보 최소화, 광고 데이터 분리

---

## 1. 목적

`packages/api-contract`는 급여납치 플랫폼의 모바일 앱, 관리자 콘솔, API 서버, 알림 worker, scheduler, QA/E2E, 내부 검증 도구가 공유하는 API 요청·응답·오류·도메인 schema의 단일 계약 패키지다.

이 패키지는 다음 문제를 해결한다.

1. 모바일 앱과 API 서버의 요청·응답 구조 불일치를 방지한다.
2. 관리자 콘솔과 API 서버의 RBAC, audit, moderation 계약을 일치시킨다.
3. 급여·예산·지출·저축·납치금액 계산이 클라이언트 임의 계산이 아니라 서버 권위 결과임을 계약으로 고정한다.
4. 모든 금액을 KRW 1원 단위 정수로 제한한다.
5. 음수 금액과 소수 금액 입력을 계약 단계에서 차단한다.
6. 납치금액 표시값이 0원 미만으로 내려가지 않도록 계산 정책을 명시한다.
7. 일일예산 초과를 음수 remaining이 아니라 `overAmount`로 표현한다.
8. 지출 쓰기 요청에 idempotency key를 요구해 중복 반영을 방지한다.
9. 인증, 커뮤니티, 광고/제휴, 로그, 오류 응답에 재무 원천 데이터가 섞이지 않도록 분리한다.
10. API 계약 변경이 QA, E2E, 문서, release gate에서 추적되도록 한다.

---

## 2. 적용 범위

이 패키지는 다음 런타임과 문서에 적용된다.

| 소비자                     | 사용 목적                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/mobile`              | 사용자 인증, 급여 홈, 계획, 일일예산, 지출, 커뮤니티, 글쓰기, 알림 화면의 요청·응답 검증 |
| `apps/admin`               | 관리자 로그인, 사용자 운영, 게시글/신고/공지/배너/지표/감사로그 운영 계약 검증           |
| `services/api`             | HTTP route request validation, response serialization, error normalization               |
| `services/notifications`   | 알림 payload, 실패 응답, queue 처리 결과 계약 공유                                       |
| `services/scheduler`       | 급여일 알림, 고정지출 알림, 월마감, 보존/삭제 job 결과 계약 공유                         |
| `qa`                       | API, 통합, E2E, UAT 테스트 케이스의 기준 schema                                          |
| `tools/api-contract-check` | endpoint registry, schema registry, route path 정합성 검증                               |
| `docs`                     | API 명세서, 백엔드 문서, QA 문서, 보안 문서와의 기준 계약                                |

---

## 3. 패키지 구조

```txt
packages/api-contract/
├── src/
│   ├── auth/
│   │   └── auth.schema.ts
│   ├── common/
│   │   ├── error-code.schema.ts
│   │   └── response.schema.ts
│   ├── community/
│   │   └── community.schema.ts
│   ├── payroll/
│   │   └── payroll.schema.ts
│   └── index.ts
├── package.json
└── README.md
```

| 파일                                | 책임                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                      | public entrypoint, namespace export, endpoint registry, route path registry, registry validation helper |
| `src/auth/auth.schema.ts`           | 이메일/소셜 인증, 세션, 토큰, 기기, 동의, MFA, 관리자 RBAC 인증 계약                                    |
| `src/common/error-code.schema.ts`   | 전 도메인 표준 error code, severity, HTTP status, retry, visibility, safe message 계약                  |
| `src/common/response.schema.ts`     | 표준 성공/실패 응답 envelope, pagination, mutation, idempotency, audit, privacy, calculation meta 계약  |
| `src/community/community.schema.ts` | 커뮤니티 목록, 상세, 글쓰기, 댓글, 반응, 신고, 첨부, 익명 표시, 관리자 모더레이션 계약                  |
| `src/payroll/payroll.schema.ts`     | 급여계획, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷 계약                            |
| `package.json`                      | 빌드, 타입검사, export map, dependency, quality gate 계약                                               |

---

## 4. 공개 export 정책

이 패키지는 이름 충돌을 막기 위해 root에서 `export *`를 남발하지 않는다. `src/index.ts`는 namespace export를 기준으로 한다.

```ts
import { AuthContract, ErrorCodeContract, ResponseContract, CommunityContract, PayrollContract, ApiContractRegistry, validateApiContractRegistry } from "@salary-hijacking/api-contract";
```

지원되는 subpath export는 다음과 같다.

| import path                                        | 사용 목적                             |
| -------------------------------------------------- | ------------------------------------- |
| `@salary-hijacking/api-contract`                   | 전체 registry, namespace, root helper |
| `@salary-hijacking/api-contract/auth`              | 인증/인가 schema만 직접 사용          |
| `@salary-hijacking/api-contract/common/error-code` | 표준 오류 코드만 직접 사용            |
| `@salary-hijacking/api-contract/common/response`   | 표준 응답 envelope만 직접 사용        |
| `@salary-hijacking/api-contract/community`         | 커뮤니티 schema만 직접 사용           |
| `@salary-hijacking/api-contract/payroll`           | 급여·예산·지출 schema만 직접 사용     |

---

## 5. 공통 계약 원칙

### 5.1 Zod 기준

모든 요청·응답 schema는 Zod를 기준으로 작성한다.

필수 원칙은 다음과 같다.

1. request schema는 외부 입력을 검증한다.
2. response schema는 API가 클라이언트에 반환할 수 있는 안전한 구조만 정의한다.
3. entity schema는 DB 원본 전체가 아니라 API 공개 가능 필드만 포함한다.
4. 관리자 전용 schema는 public client에 노출하지 않는다.
5. parse helper는 API boundary 또는 테스트 boundary에서 사용한다.
6. schema registry는 문서 생성과 계약 검증 도구가 사용할 수 있어야 한다.

### 5.2 표준 응답

모든 API는 다음 구조 중 하나를 따른다.

```ts
{
  ok: (true, data, meta);
}
{
  ok: (false, error, meta);
}
```

성공 응답은 다음 확장 meta를 사용할 수 있다.

- `privacy`
- `security`
- `audit`
- `mutation`
- `calculation`
- `idempotency`
- `pageInfo`

### 5.3 표준 오류

모든 오류는 다음 공통 기준을 갖는다.

- `code`
- `category`
- `severity`
- `httpStatus`
- `retry`
- `visibility`
- `message`
- `fieldIssues`
- `details`

오류 응답에는 token, secret, DB URL, 실제 이메일, 실제 전화번호, 원문 IP, 원문 User-Agent, 급여액·지출액·저축액·납치금액 원문을 넣지 않는다.

---

## 6. 서버 권위 계산 계약

급여납치의 핵심 금액 계산은 서버/API/DB가 최종 확정한다. 클라이언트는 입력값 수집과 서버 응답 렌더링만 담당한다.

계약상 고정 원칙은 다음과 같다.

| 항목              | 기준                                  |
| ----------------- | ------------------------------------- |
| 통화              | `KRW`                                 |
| 금액 단위         | 1원 단위 정수                         |
| DB 원천 타입      | `BIGINT`                              |
| JSON 응답 타입    | 안전 범위 정수                        |
| 음수 금액 입력    | 금지                                  |
| 소수 금액 입력    | 금지                                  |
| 납치금액 표시     | `max(0, 계산값)`                      |
| 일일예산 남은금액 | `max(0, assignedAmount - usedAmount)` |
| 일일예산 초과금액 | `max(0, usedAmount - assignedAmount)` |
| 변동지출 쓰기     | idempotency key 필수                  |
| 계산 변경         | snapshot/revision/reason 기록         |

계산 관련 schema는 `PayrollContract`에 포함된다.

- `PayrollCalculationPolicySchema`
- `PayrollCalculationMetaSchema`
- `PayrollCalculationInputSchema`
- `PayrollCalculationResultSchema`
- `PayrollCalculationSnapshotSchema`

---

## 7. 인증 계약

`AuthContract`는 다음 기능을 포함한다.

1. 이메일 회원가입
2. 이메일 로그인
3. 관리자 로그인
4. Naver 소셜 로그인
5. Kakao 소셜 로그인
6. Google 소셜 로그인
7. Apple 소셜 로그인
8. access token / refresh token 발급
9. refresh token rotation
10. 로그아웃
11. 전체 세션 종료
12. 세션 조회와 폐기
13. MFA 설정, 검증, 해제
14. 기기 등록, 수정, 폐기
15. push token hash/ciphertext 관리
16. 약관, 개인정보, 커뮤니티, push, 광고/제휴 동의
17. 계정 탈퇴와 철회
18. 관리자 RBAC role/permission

인증 계약에는 급여액, 지출액, 저축액, 납치금액 같은 재무 원천 데이터를 포함하지 않는다.

---

## 8. 커뮤니티 계약

`CommunityContract`는 다음 기능을 포함한다.

1. 게시글 목록
2. 게시글 검색
3. 게시글 상세
4. 글쓰기
5. 글 수정
6. 글 삭제
7. 댓글
8. 대댓글
9. 반응
10. 북마크
11. 공유
12. 신고
13. 첨부 파일
14. 악성 파일 스캔 상태
15. 익명 표시
16. 내부 owner trace
17. 관리자 신고 목록
18. 관리자 모더레이션
19. 커뮤니티 지표
20. 관리자 게시글 상세

익명 표시 원칙은 다음과 같다.

- public 응답에는 작성자 식별정보를 노출하지 않는다.
- 운영·신고·법적 대응·감사를 위해 내부 owner trace는 서버와 관리자 권한에서만 유지한다.
- 커뮤니티 데이터는 급여·지출·저축·예산·납치금액 원천 데이터와 결합하지 않는다.
- 광고/제휴 이벤트는 커뮤니티 민감 콘텐츠와 직접 결합하지 않는다.

---

## 9. 급여·예산·지출 계약

`PayrollContract`는 다음 기능을 포함한다.

1. 급여 홈
2. 급여계획 생성
3. 급여계획 조회
4. 급여계획 수정
5. 급여계획 삭제
6. 고정지출 생성
7. 고정지출 수정
8. 고정지출 납부 처리
9. 고정지출 삭제
10. 고정저축 생성
11. 고정저축 수정
12. 고정저축 이체 처리
13. 고정저축 삭제
14. 일일예산 생성
15. 일일예산 조회
16. 일일예산 수정
17. 변동지출 생성
18. 변동지출 수정
19. 변동지출 삭제
20. 서버 권위 재계산
21. 월마감
22. 월마감 재오픈
23. 월별 리포트
24. 관리자 재계산 action

급여 도메인에서는 다음 계산 결과가 반드시 서버 응답 기준으로 사용된다.

- `totalIncomeAmount`
- `totalFixedExpenseAmount`
- `totalFixedSavingAmount`
- `totalDailyBudgetAssignedAmount`
- `totalVariableExpenseAmount`
- `remainingDailyBudgetAmount`
- `overAmount`
- `estimatedHijackAmount`
- `confirmedHijackAmount`
- `targetAchievementRateBasisPoints`

---

## 10. 오류 코드 계약

`ErrorCodeContract`는 다음 범주의 오류를 포함한다.

| 범주           | 예시                                                            |
| -------------- | --------------------------------------------------------------- |
| `SYSTEM`       | 내부 오류, 점검, timeout                                        |
| `VALIDATION`   | 잘못된 body/query/param, idempotency conflict                   |
| `AUTH`         | 인증 실패, token 만료, MFA 필요                                 |
| `RBAC`         | 관리자 권한 부족, audit reason 누락                             |
| `SECURITY`     | rate limit, CSRF, CORS, secret 노출 차단, 재무 원천 데이터 차단 |
| `DATABASE`     | connection, transaction, RLS denied, migration required         |
| `PAYROLL`      | 급여계획 없음, 금액 invalid, 계산 실패, 서버 권위 필요          |
| `BUDGET`       | 일일예산 없음, 초과금액 감지                                    |
| `EXPENSE`      | 변동지출 중복, 고정지출 invalid                                 |
| `SAVING`       | 고정저축 invalid                                                |
| `NOTIFICATION` | push token invalid, queue 실패                                  |
| `GROWTH`       | LV UP 활동 중복, 일일 제한 초과                                 |
| `COMMUNITY`    | 글 없음, 정책 위반, 익명 작성자 보호                            |
| `ADMIN`        | 감사로그 실패, 승인 필요                                        |
| `ADS_PARTNER`  | 광고 동의 필요, 재무 원천 데이터 reject                         |
| `OPERATIONS`   | release gate 실패, 배포 차단, incident open                     |

---

## 11. 개인정보와 보안 기준

이 패키지의 schema와 helper는 다음 데이터를 public response, error details, log event, community payload, ads payload에 포함하지 않는 것을 전제로 한다.

- 비밀번호
- access token 원문
- refresh token 원문
- push token 원문
- API key
- secret key
- DB URL
- 실제 전화번호 원문
- IP 원문
- User-Agent 원문
- 급여액 원문이 포함된 광고 이벤트
- 지출액 원문이 포함된 광고 이벤트
- 저축액 원문이 포함된 광고 이벤트
- 납치금액 원문이 포함된 광고 이벤트
- 커뮤니티 익명 작성자 식별정보 public 노출

필수 보안 정책은 다음과 같다.

1. 사용자 소유 데이터는 RLS 또는 owner check를 통과해야 한다.
2. 관리자 기능은 RBAC를 통과해야 한다.
3. 관리자 변경은 audit log를 남겨야 한다.
4. 광고/제휴 데이터는 재무 원천 데이터와 분리해야 한다.
5. 오류 응답은 public-safe message와 private detail을 분리해야 한다.
6. QA fixture와 seed에는 실제 개인정보와 실제 금융정보를 사용하지 않는다.

---

## 12. 개발 명령

이 패키지는 루트 Turborepo task와 연결된다.

```bash
pnpm --filter @salary-hijacking/api-contract run typecheck
pnpm --filter @salary-hijacking/api-contract run build
pnpm --filter @salary-hijacking/api-contract run test
pnpm --filter @salary-hijacking/api-contract run api:contract
pnpm --filter @salary-hijacking/api-contract run quality
```

루트에서는 다음 명령으로 전체 검증에 포함된다.

```bash
pnpm run typecheck
pnpm run api:contract
pnpm run test:integration
pnpm run test:e2e
pnpm run quality
pnpm run build
```

---

## 13. API route 구현 기준

`services/api`에서 route를 구현할 때 다음 순서를 따른다.

1. requestId 생성 또는 전달값 검증
2. 인증 middleware 적용
3. 권한 middleware 적용
4. request schema parse
5. DB transaction 시작
6. RLS context 설정
7. 서버 권위 비즈니스 로직 실행
8. idempotency 검증
9. audit log 기록
10. response schema parse
11. 민감정보 masking 확인
12. 표준 응답 envelope 반환

예시 흐름:

```ts
import { PayrollContract, ResponseContract } from "@salary-hijacking/api-contract";

const input = PayrollContract.CreateVariableExpenseRequestSchema.parse(await request.json());
const result = await createVariableExpenseWithServerAuthority(input);

return Response.json(ResponseContract.createMutationResponse(result.data, result.mutation, result.meta));
```

---

## 14. 클라이언트 사용 기준

모바일 앱과 관리자 콘솔은 서버 응답을 신뢰하되, 화면 표시 전에 필요한 경우 schema를 검증할 수 있다.

클라이언트는 다음을 하지 않는다.

1. 급여·예산·지출·저축·납치금액을 최종 계산하지 않는다.
2. 납치금액을 서버 응답과 다르게 보정하지 않는다.
3. 예산 초과를 임의 계산해 서버 값과 다르게 표시하지 않는다.
4. 광고/제휴 이벤트에 급여·지출·저축·납치금액 원문을 넣지 않는다.
5. 커뮤니티 익명 작성자 식별정보를 추론하거나 표시하지 않는다.

클라이언트는 다음을 한다.

1. 숫자 입력 UX에서 KRW 정수만 입력하게 한다.
2. API 오류 코드를 기준으로 사용자 메시지를 표시한다.
3. `requestId`를 오류 신고와 CS에 연결한다.
4. 서버 응답의 `calculationMeta`를 기준으로 최신 계산 여부를 확인한다.
5. `overAmount`가 있으면 예산 초과 상태를 명확히 표시한다.

---

## 15. QA와 E2E 기준

API 계약 변경 시 다음 검증이 필요하다.

| 검증                     | 기준                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| typecheck                | 모든 schema와 type export가 TS strict 모드에서 통과                   |
| api:contract             | endpoint registry, path registry, request/response schema 정합성 확인 |
| unit test                | schema parse 성공/실패 케이스 확인                                    |
| integration test         | API route가 계약과 동일한 응답 반환                                   |
| E2E                      | 모바일/관리자 화면이 계약 응답으로 정상 동작                          |
| privacy check            | response/error/log에 민감정보 원문 없음                               |
| security scan            | token, secret, DB URL, 원문 PII 노출 없음                             |
| payroll calculation test | KRW 정수, 음수/소수 금지, overAmount, 납치금액 floor zero 확인        |
| idempotency test         | 변동지출 중복 등록 방지 확인                                          |
| moderation test          | 익명 표시와 owner trace 분리 확인                                     |

---

## 16. 변경 절차

API 계약 변경은 제품, DB, 서비스, 앱, QA, 문서에 영향을 준다.

변경 시 다음을 함께 확인한다.

1. `src/index.ts` registry 반영
2. 관련 domain schema 반영
3. `services/api` route 반영
4. `apps/mobile` API client 반영
5. `apps/admin` API client 반영
6. DB migration 또는 seed 영향 확인
7. QA test case 반영
8. E2E scenario 반영
9. docs API 문서 반영
10. `CHANGELOG.md` 반영
11. 보안·개인정보 영향 확인
12. release gate 통과

breaking change는 다음 조건을 만족해야 한다.

- version 정책에 따른 major 또는 명확한 migration path 제공
- 모바일 앱과 관리자 콘솔 동시 대응
- API 서버 backward compatibility 전략 검토
- DB migration과 rollback 계획 확인
- QA/E2E/UAT 승인

---

## 17. 금지 사항

이 패키지에서는 다음을 금지한다.

1. schema 없이 `unknown` response를 그대로 export
2. `any` 기반 public contract 고정
3. 도메인별 schema 중복 정의
4. route path 문자열을 앱과 API에 각각 따로 작성
5. 클라이언트 계산값을 최종 금액으로 확정하는 계약
6. 음수 금액 입력 허용 계약
7. 소수 금액 입력 허용 계약
8. 납치금액이 0원 미만으로 표시되는 계약
9. 예산 초과를 음수 remaining으로 표현하는 계약
10. 광고 이벤트에 재무 원천 데이터를 넣는 계약
11. public 커뮤니티 응답에 익명 작성자 식별정보를 포함하는 계약
12. 오류 응답 details에 token, secret, DB URL, 원문 PII, 원문 금융정보 포함
13. 관리자 작업에 audit reason이 없는 계약
14. 운영 기능에 RBAC 없는 계약
15. 실제 개인정보 또는 실제 금융정보를 README 예시로 작성

---

## 18. 완료 기준

`packages/api-contract/README.md`는 다음 기준을 충족할 때 파일 단위 완료로 본다.

1. 패키지 목적을 명확히 설명한다.
2. 적용 런타임과 소비자를 설명한다.
3. 폴더와 파일 책임을 설명한다.
4. public export 정책을 설명한다.
5. 인증 계약을 설명한다.
6. 공통 응답 계약을 설명한다.
7. 공통 오류 코드 계약을 설명한다.
8. 커뮤니티 계약을 설명한다.
9. 급여·예산·지출 계약을 설명한다.
10. 서버 권위 계산 원칙을 설명한다.
11. KRW 정수, 음수/소수 금지, 납치금액 floor zero, overAmount 원칙을 설명한다.
12. 개인정보, 보안, 광고 데이터 분리 기준을 설명한다.
13. 개발 명령과 루트 품질 게이트 연결을 설명한다.
14. API route 구현 기준을 설명한다.
15. 클라이언트 사용 기준을 설명한다.
16. QA/E2E 기준을 설명한다.
17. 변경 절차와 금지 사항을 설명한다.
18. 미완료 표식과 임시 작업 지시가 없다.

---

## 19. 최종 판정

이 `README.md`는 `packages/api-contract` 패키지의 목적, 구조, export 정책, 인증, 공통 오류, 공통 응답, 커뮤니티, 급여·예산·지출, 서버 권위 계산, 개인정보·보안, QA/E2E, 변경 절차, 금지 사항을 통합 정의하는 최종 문서다.

문서상·이론상 `packages/api-contract/README.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다.

프로젝트 종합 완성도 100%는 이 문서와 `package.json`, `src/index.ts`, `src/auth/auth.schema.ts`, `src/common/error-code.schema.ts`, `src/common/response.schema.ts`, `src/community/community.schema.ts`, `src/payroll/payroll.schema.ts`, `services/api`, `apps/mobile`, `apps/admin`, DB migration, QA/E2E, CI/CD 검증이 모두 일치하고 실제 환경에서 통과했을 때 최종 확정한다.
