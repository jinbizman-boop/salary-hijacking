# `packages/db`

급여납치 Salary Hijacking Platform의 **서버 권위 데이터베이스 계약 패키지**입니다. 이 패키지는 Neon/PostgreSQL 기반 운영을 전제로 하며, 사용자·인증·급여·예산·지출·저축·알림·LV UP·커뮤니티·운영/감사/보안 정책을 API, migration, scheduler, mobile/admin, QA 도구가 동일한 계약으로 참조하도록 고정합니다.

이 README는 `packages/db` 패키지의 사용법, 경계, 검증 기준, 보안 원칙, 배포 전 확인 절차를 문서화하는 최종 운영 문서입니다.

---

## 1. 패키지 역할

`@salary-hijacking/db`는 실제 데이터베이스 연결 클라이언트가 아니라, 다음을 제공하는 **DB schema contract package**입니다.

- 6개 도메인 schema contract
- PostgreSQL DDL bundle
- RLS/RBAC policy SQL
- seed metadata
- 서버 권위 계산 정책
- KRW 정수 금액 정책
- 멱등성/idempotency 정책
- 감사/audit 정책
- 개인정보·토큰·원문 금융 데이터 분리 정책
- schema completeness assertion
- API/migration/worker/QA에서 사용할 public export map

DB에 직접 migration을 실행하는 책임은 이 패키지가 아니라 `database/migrations` 또는 별도 migration runner가 가집니다. 이 패키지는 검증된 DDL과 schema metadata를 제공합니다.

---

## 2. 도메인 구성

| 도메인                | 파일                                 | 책임                                                                                  |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| users/auth/admin      | `src/schema/users.schema.ts`         | 사용자, 로그인, social identity, session, device, consent, MFA, admin RBAC, audit     |
| payroll/budget/saving | `src/schema/payroll.schema.ts`       | 급여 주기, 급여 납치 금액, 예산/저축 계획, 서버 권위 급여 계산                        |
| expenses              | `src/schema/expenses.schema.ts`      | 고정지출, 변동지출, 일일 예산, 월별 지출, 환불, 가져오기, reconciliation, 첨부, audit |
| growth/LV UP          | `src/schema/growth.schema.ts`        | 독서·뉴스·영어·건강 미션, 경험치, 레벨, streak, 인증 첨부, 일별 요약                  |
| community             | `src/schema/community.schema.ts`     | 커뮤니티, 글쓰기, 댓글, 반응, 신고, moderation, writer safety, audit                  |
| notifications         | `src/schema/notifications.schema.ts` | 알림 템플릿, 예약, 발송, preference, push/email/in-app 이벤트, audit                  |

통합 진입점은 `src/index.ts`이며, 모든 domain schema를 namespace export와 default package export로 제공합니다.

---

## 3. 공개 export 계약

`package.json`의 export map은 다음 subpath를 지원합니다.

```ts
import dbPackage, { dbSchemaDdl, dbSchemaModules, getDbPackageCompletenessReport, assertDbPackageCompleteness } from "@salary-hijacking/db";

import { payrollSchema } from "@salary-hijacking/db/payroll";
import { usersSchema } from "@salary-hijacking/db/users";
import { expensesSchema } from "@salary-hijacking/db/expenses";
import { growthSchema } from "@salary-hijacking/db/growth";
import { communitySchema } from "@salary-hijacking/db/community";
import { notificationsSchema } from "@salary-hijacking/db/notifications";
```

지원 subpath:

- `@salary-hijacking/db`
- `@salary-hijacking/db/users`
- `@salary-hijacking/db/payroll`
- `@salary-hijacking/db/expenses`
- `@salary-hijacking/db/growth`
- `@salary-hijacking/db/community`
- `@salary-hijacking/db/notifications`
- `@salary-hijacking/db/schema/users`
- `@salary-hijacking/db/schema/payroll`
- `@salary-hijacking/db/schema/expenses`
- `@salary-hijacking/db/schema/growth`
- `@salary-hijacking/db/schema/community`
- `@salary-hijacking/db/schema/notifications`
- `@salary-hijacking/db/schema/users.schema`
- `@salary-hijacking/db/schema/payroll.schema`
- `@salary-hijacking/db/schema/expenses.schema`
- `@salary-hijacking/db/schema/growth.schema`
- `@salary-hijacking/db/schema/community.schema`
- `@salary-hijacking/db/schema/notifications.schema`
- `@salary-hijacking/db/package.json`

---

## 4. 설치 및 실행 전제

필수 런타임:

- Node.js `>=20.11.0 <25`
- pnpm `>=10.0.0 <11`
- TypeScript `>=5.8.0 <6`

패키지 내부는 ESM입니다.

```json
{
  "type": "module"
}
```

---

## 5. 주요 명령어

| 명령어                      | 목적                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `pnpm run clean`            | `dist`, coverage, test-results, turbo cache 등 삭제           |
| `pnpm run typecheck`        | `src/index.ts` 기준 strict TypeScript 검증                    |
| `pnpm run build`            | `tsup`으로 ESM JS와 `.d.ts` 산출                              |
| `pnpm run validate:package` | package metadata 필수 키 검증                                 |
| `pnpm run validate:exports` | export map 누락 검증                                          |
| `pnpm run validate:dist`    | build 결과물 누락 검증                                        |
| `pnpm run schema:assert`    | build된 `dist/index.js`에서 통합 schema completeness 검증     |
| `pnpm run security:scan`    | 원문 토큰/비밀/PII/광고·커뮤니티 연결 flag의 위험 기본값 검출 |
| `pnpm run privacy:check`    | privacy/calculation/data-separation 계약 검증                 |
| `pnpm run db:validate`      | package/export/type/build/schema/security/privacy 통합 검증   |
| `pnpm run quality`          | release 전 전체 quality gate                                  |
| `pnpm run release`          | release gate alias                                            |

`db:migrate`, `db:seed`, `db:reset`, `db:backup`은 이 패키지에서 직접 운영 DB 작업을 수행하지 않습니다. 실제 실행은 migration/infra 계층이 소유합니다.

---

## 6. 통합 completeness 검증

패키지는 import 시점과 명시 호출 시점에 schema completeness를 검증할 수 있습니다.

```ts
import { assertDbPackageCompleteness, getDbPackageCompletenessReport } from "@salary-hijacking/db";

assertDbPackageCompleteness();

const report = getDbPackageCompletenessReport();
if (!report.ok) {
  throw new Error(report.missing.join(", "));
}
```

검증 범위:

- 6개 schema domain 존재 여부
- table/index/policy export 존재 여부
- 각 domain 자체 completeness report
- 통합 DDL bundle 존재 여부
- `users` domain 우선 순서
- `pgcrypto` extension DDL 포함 여부
- 도메인별 missing list aggregation

완료 기준:

```txt
schemaDomainCount: 6
tableCount: 72
indexCount: 131
policyCount: 150
ddlStatementCount: 426
missing: []
ok: true
```

---

## 7. DDL bundle 사용 방식

이 패키지는 통합 DDL을 제공합니다.

```ts
import { dbSchemaDdl } from "@salary-hijacking/db";

const ddlStatements = dbSchemaDdl.all;
```

DDL 순서:

1. extension
2. table
3. index
4. RLS enable
5. policy

도메인 순서:

1. users
2. payroll
3. expenses
4. growth
5. community
6. notifications

주의:

- 운영 DB에 직접 실행하기 전 migration runner가 transaction, lock, rollback, drift detection, environment guard를 책임져야 합니다.
- 이 패키지는 destructive reset을 수행하지 않습니다.
- DDL 실행은 `database/migrations` 또는 운영 migration service에서만 수행해야 합니다.

---

## 8. 서버 권위 계산 원칙

급여납치의 금액·예산·지출·저축 관련 최종 계산은 클라이언트가 확정하지 않습니다.

필수 원칙:

- 금액 단위는 KRW 정수입니다.
- DB 금액 원천 타입은 `BIGINT`입니다.
- 음수 금액 입력은 금지합니다.
- 소수 금액 입력은 금지합니다.
- 최종 급여/예산/지출/저축 계산은 서버 권위입니다.
- 일일 예산 초과는 음수 잔액이 아니라 `over_amount_krw`로 표현합니다.
- write 계열 작업은 idempotency key를 요구합니다.

`package.json`의 `salaryHijacking.calculationContract`와 각 schema의 자체 계산 smoke test가 이 정책을 고정합니다.

---

## 9. 개인정보·보안·데이터 분리 원칙

이 패키지는 다음을 금지합니다.

- browser direct database access
- raw access token 저장/응답
- raw refresh token 저장/응답
- raw secret 저장/응답
- raw PII log 저장
- auth domain에 raw financial source data 저장
- community payload에 raw financial source data 결합
- ads event에 raw financial source data 결합
- notification payload에 raw financial source data 직접 포함
- growth payload에 raw financial source data 직접 포함

필수 flag는 기본값 `false`와 check constraint로 보호합니다.

검증 명령:

```bash
pnpm run security:scan
pnpm run privacy:check
```

---

## 10. RLS/RBAC/Audit 원칙

모든 domain schema는 다음을 요구합니다.

- RLS required
- audit required
- server authority required
- service role 또는 admin 전용 운영 policy
- owner 기반 authenticated select/insert/update policy
- 관리자 console 운영 추적 가능성
- request_id, actor, created_at, updated_at 또는 audit event 기록

관리자 권한은 `users.schema.ts`의 admin RBAC 계약을 기준으로 확장합니다.

---

## 11. Migration 계층과의 경계

이 패키지의 책임:

- schema metadata 제공
- DDL SQL bundle 제공
- seed metadata 제공
- completeness gate 제공
- API/worker/admin/mobile에서 참조 가능한 타입/계약 제공

이 패키지의 책임이 아닌 것:

- 운영 DB 연결 생성
- migration 직접 실행
- production reset
- backup/restore 직접 수행
- secrets loading
- environment variable resolution
- Neon branch provisioning

운영 실행 계층은 다음을 별도로 가져야 합니다.

- database connection manager
- migration runner
- environment guard
- rollback policy
- backup policy
- drift detection
- migration history table
- CI/CD approval gate

---

## 12. API/service 사용 예시

```ts
import { assertDbPackageCompleteness, dbSchemaDdl, dbSchemas } from "@salary-hijacking/db";

export const bootDatabaseContracts = () => {
  assertDbPackageCompleteness();

  return {
    schemas: dbSchemas,
    ddl: dbSchemaDdl,
  };
};
```

---

## 13. QA/CI release gate

DB 패키지 단위 release 전 최소 명령:

```bash
pnpm run db:validate
pnpm run test
pnpm run quality
```

루트 모노레포에서는 이 패키지의 `quality`를 API, mobile, admin, migration, E2E pipeline의 선행 gate로 사용해야 합니다.

---

## 14. 문제 해결

### `validate:dist`가 실패하는 경우

`pnpm run build`가 먼저 실행되었는지 확인합니다. `dist/index.js`, `dist/index.d.ts`, `dist/schema/*.js`, `dist/schema/*.d.ts`가 모두 생성되어야 합니다.

### `schema:assert`가 실패하는 경우

schema 파일 중 하나의 자체 completeness report가 실패했거나 `dist/index.js`가 오래된 상태일 수 있습니다.

해결 순서:

```bash
pnpm run clean
pnpm run build
pnpm run schema:assert
```

### `privacy:check`가 실패하는 경우

`salaryHijacking.securityContract`, `calculationContract`, `dataSeparationContract` 값이 보안 정책과 일치하는지 확인합니다. 정책상 허용값을 임의로 `true`로 변경하면 안 됩니다.

### `security:scan`이 실패하는 경우

schema source 안에 raw token, raw secret, raw PII, ads/community payload link flag의 기본값이 `true`로 들어갔을 가능성이 큽니다. 해당 default/check constraint를 즉시 수정해야 합니다.

---

## 15. 파일 단위 완료 기준

`packages/db` 범위에서 이 README가 기준으로 삼는 완료 상태:

- `src/schema/users.schema.ts` 완료
- `src/schema/payroll.schema.ts` 완료
- `src/schema/expenses.schema.ts` 완료
- `src/schema/growth.schema.ts` 완료
- `src/schema/community.schema.ts` 완료
- `src/schema/notifications.schema.ts` 완료
- `src/index.ts` 완료
- `package.json` 완료
- `README.md` 운영 문서 완료

이 README 파일 단위에서는 추가 작업이 필요하지 않은 최종본을 목표로 작성되어 있습니다.

---

## 16. 객관적 범위 고지

현재 문서는 `packages/db` 패키지의 문서와 계약을 다룹니다. 프로젝트 전체 100%는 다음 영역까지 완료되어야 사실로 확정할 수 있습니다.

- migration 실제 반영
- API service 구현
- notification/scheduler service 구현
- mobile 화면 구현
- admin console 구현
- E2E/QA 자동화
- 배포/운영/모니터링 인프라

따라서 이 문서의 최종성은 `packages/db/README.md` 파일 단위와 DB 패키지 문서 범위에 한정됩니다.
