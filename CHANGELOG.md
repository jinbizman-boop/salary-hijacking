# Changelog · 급여납치 Salary Hijacking Platform

문서 상태: 최종본  
파일 위치: `CHANGELOG.md`  
프로젝트: 급여납치 Salary Hijacking Platform  
기준 시간대: `Asia/Seoul`  
변경 기록 원칙: 사용자 가치, 서버 권위 계산, 보안·개인정보 보호, 운영 안정성, 릴리즈 추적 가능성

---

## 변경 기록 정책

이 문서는 급여납치 플랫폼의 제품, 문서, 코드, 데이터베이스, 인프라, 보안, QA, 운영, 출시 변경 이력을 추적한다.

급여납치 플랫폼은 사용자의 급여, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 알림, LV UP 자기계발 활동, 커뮤니티, 광고/제휴, 관리자 운영 데이터를 다루므로 모든 변경 기록은 다음 기준을 따른다.

1. 급여·예산·지출·저축 계산 변경은 반드시 서버 권위 계산 영향으로 분류한다.
2. DB migration, seed, RLS, RBAC, audit log, retention, index 변경은 별도 항목으로 기록한다.
3. 개인정보, 민감정보, 광고/제휴 데이터 분리, 보안 취약점, secret 노출 관련 변경은 축약하되 추적 가능하게 기록한다.
4. 운영 장애, rollback, hotfix, release gate, QA/UAT 결과는 릴리즈별로 연결한다.
5. 실제 사용자 데이터, secret, token, credential, 원문 급여/지출/저축/납치금액은 이 파일에 기록하지 않는다.

---

## 버전 분류 기준

| 버전 유형 | 기준                                                           | 예시                       |
| --------- | -------------------------------------------------------------- | -------------------------- |
| Major     | 사용자 기능, DB 계약, API 계약, 보안 정책, 운영 구조의 큰 변경 | `1.0.0` 상용화 기준선      |
| Minor     | 하위 호환 기능 추가, 관리자 기능 추가, QA/운영 기능 확장       | `1.1.0` 신규 분석 대시보드 |
| Patch     | 버그 수정, 문서 보정, 테스트 보강, 보안 패치                   | `1.0.1` 계산 스냅샷 보정   |
| Hotfix    | 운영 중 긴급 장애·보안·계산 오류 수정                          | `1.0.1-hotfix.1`           |

---

## 변경 유형

- `Added`: 새 기능, 새 문서, 새 구조, 새 자동화
- `Changed`: 기존 기능, 정책, 구조, UX, 스크립트 변경
- `Fixed`: 버그, 계산 오류, 문서 오류, 설정 오류 수정
- `Security`: 인증, 권한, 개인정보, secret, 취약점, 감사로그 관련 변경
- `Database`: migration, seed, ERD, RLS, index, retention, backup 변경
- `Operations`: CI/CD, 배포, 관측성, 장애 대응, 운영 정책 변경
- `Deprecated`: 제거 예정 기능 또는 계약
- `Removed`: 제거된 기능, 파일, 정책, 의존성

---

## [1.0.0] - 2026-06-16

### Added

- 급여납치 Salary Hijacking Platform의 문서상·이론상 통합 최종 구조를 확정했다.
- 모바일 중심 급여관리, 예산관리, 지출기록, 고정지출, 고정저축, 일일예산, 납치금액 계산, 알림, LV UP 자기계발, 커뮤니티, 글쓰기, 마이페이지, 관리자 콘솔, 광고/제휴, 운영 시스템을 프로젝트 범위에 포함했다.
- 루트 모노레포 계약 파일을 정비했다.
  - `package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `TREE.txt`
  - `MANIFEST.json`
  - `README.md`
  - `SECURITY.md`
  - `CODE_OF_CONDUCT.md`
  - `LICENSE`
  - `CHANGELOG.md`
- `apps/mobile` 구조를 확정했다.
  - 로그인/회원가입
  - 급여 홈
  - 계획
  - LV UP
  - 커뮤니티
  - 글쓰기
  - 알림
  - 마이페이지
- `apps/admin` 구조를 확정했다.
  - dashboard
  - login
  - users
  - posts
  - reports
  - notices
  - banners
  - events
  - metrics
- `services` 서버 런타임 구조를 확정했다.
  - `services/api`
  - `services/notifications`
  - `services/scheduler`
- `packages` 공통 패키지 구조를 확정했다.
  - `api-contract`
  - `config`
  - `db`
  - `security`
  - `types`
  - `ui`
  - `utils`
- `tools` 내부 검증 도구 구조를 확정했다.
  - `api-contract-check`
  - `db-schema-check`
  - `doc-lint`
  - `security-audit`
- `docs/final-documents` 1~12번 최종 문서 세트를 프로젝트 기준 문서로 확정했다.
- `assets`, `infra`, `observability`, `ops`, `qa`, `release`, `scripts`, `security` 폴더의 역할과 책임을 확정했다.

### Database

- Neon PostgreSQL 기준 데이터베이스 구조를 확정했다.
- `database/README.md`를 데이터베이스 운영 기준서로 확정했다.
- 최종 ERD 문서 `database/erd/salary-hijacking-final-erd.md`를 기준 ERD로 확정했다.
- 네 개의 핵심 migration 범위를 확정했다.
  - `0001_init_users.sql`: 사용자, 인증, 프로필, 설정, 동의, 기기, 관리자 RBAC
  - `0002_payroll_budget_expense.sql`: 급여계획, 고정지출, 고정저축, 일일예산, 변동지출, 계산 스냅샷
  - `0003_growth_community_notifications.sql`: 알림, 알림 발송, LV UP, 성장 통계, 커뮤니티, 댓글, 반응, 신고, 첨부
  - `0004_admin_audit_ads.sql`: 광고/제휴, 광고 이벤트, 관리자 감사로그, 공지, 운영 장애
- `database/policies/index-policy.md`를 인덱스 운영 정책으로 확정했다.
- `database/policies/retention-policy.md`를 데이터 보존·삭제 정책으로 확정했다.
- 환경별 seed 파일을 확정했다.
  - `local.seed.sql`
  - `staging.seed.sql`
  - `uat.seed.sql`
- KRW 1원 단위 정수, `BIGINT`, 음수 금액 금지, 소수점 금지, idempotency, transaction, RLS, admin RBAC, audit log, 계산 스냅샷 기준을 반영했다.
- 납치금액은 표시 기준 0원 미만으로 내려가지 않도록 계산 정책을 확정했다.
- 예산 초과는 남은금액 음수 표시가 아니라 `over_amount` 계열로 추적하는 정책을 확정했다.

### Security

- 급여액, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷을 고위험 재무성 민감정보로 분류했다.
- 이메일, 전화번호, 소셜 로그인 식별자, 기기 정보, push token, consent history를 개인정보·인증정보 보호 대상으로 분류했다.
- `SECURITY.md`에 취약점 신고, 위험 등급, 핫픽스, 롤백, 비공개 보고, 보안 금지 행위를 정의했다.
- `CODE_OF_CONDUCT.md`에 사용자 데이터 보호, 커뮤니티 안전, 보안·개인정보 우선 협업 기준을 정의했다.
- `LICENSE`를 비공개 상용 독점 라이선스 기준으로 확정했다.
- 광고/제휴 데이터와 재무 원천 데이터의 분리 원칙을 명시했다.
- 로그, issue, PR, screenshot, test fixture에 secret, token, 인증정보, 원문 금융정보를 남기지 않는 기준을 확정했다.
- 관리자 기능에 RBAC, audit log, requestId 추적, least privilege 원칙을 적용하는 기준을 확정했다.

### Operations

- GitHub 협업 체계를 확정했다.
  - issue templates
  - PR template
  - CODEOWNERS
  - CI workflow
  - deploy API workflow
  - deploy admin workflow
  - mobile build workflow
  - release workflow
  - security scan workflow
- `turbo.json`에 루트 task graph를 확정했다.
  - build
  - dev
  - lint
  - typecheck
  - test
  - test:unit
  - test:integration
  - test:e2e
  - test:qa
  - db:validate
  - db:migrate
  - db:seed
  - db:backup
  - db:restore:check
  - api:contract
  - security:scan
  - privacy:check
  - docs:lint
  - docs:build
  - quality
  - deploy
  - deploy:api
  - deploy:admin
  - deploy:mobile
  - release
- `pnpm-workspace.yaml`에 workspace 범위를 확정했다.
  - `apps/*`
  - `services/*`
  - `packages/*`
  - `tools/*`
- generated output, build output, cache, coverage, release artifacts, database backup/report, archive 파일을 workspace 탐색에서 제외했다.
- `package.json`에 루트 실행 명령을 확정했다.
- `MANIFEST.json`에 프로젝트 inventory, top-level directory, 작업 순서, 품질 게이트, 보안·개인정보 기준, 완료 기준을 기록했다.
- `TREE.txt`에 전체 구조와 최상위 작업 순서를 기록했다.

### QA

- QA 범위를 API, 계산, 보안, 성능, 회귀, 디바이스, 시나리오, UAT로 확정했다.
- 금액 계산 테스트 기준을 확정했다.
  - 급여 입력
  - 고정지출 합산
  - 고정저축 합산
  - 일일예산 사용금액
  - 변동지출 idempotency
  - 예산 초과
  - 납치금액 clamp
  - 월마감 스냅샷
- 관리자 콘솔 QA 범위를 확정했다.
  - 사용자 관리
  - 게시글/신고 관리
  - 공지 관리
  - 배너/광고 관리
  - 이벤트 관리
  - 운영 지표
  - 감사로그
- UAT seed와 UAT 인수검증 흐름을 문서 기준으로 확정했다.

### Changed

- 프로젝트를 단일 앱 구조가 아닌 상용화 모노레포 구조로 정리했다.
- 급여관리 앱 기능을 단순 가계부가 아니라 급여·가계부·자기계발·커뮤니티·운영·광고/제휴 플랫폼으로 확장했다.
- 계산 주체를 클라이언트 표시값이 아니라 서버/API/DB 함수와 트리거 중심의 서버 권위 구조로 정리했다.
- 보안 정책을 일반 개인정보 보호가 아니라 재무성 민감정보 보호, 광고 데이터 분리, 관리자 감사 가능성 중심으로 확장했다.
- README, SECURITY, CODE_OF_CONDUCT, LICENSE, MANIFEST, TREE, database README, 정책 문서의 역할을 상호 연결했다.

### Fixed

- 루트 `README.md`의 최소 설명을 프로젝트 전체 운영·개발·출시 기준으로 확장했다.
- `LICENSE`의 단순 저작권 문구를 비공개 상용 독점 라이선스 기준으로 확장했다.
- `SECURITY.md`의 단순 보안 문구를 취약점 신고·핫픽스·롤백·위험등급·민감정보 기준으로 확장했다.
- `CODE_OF_CONDUCT.md`의 단순 원칙을 협업·운영·보안·커뮤니티 안전 행동강령으로 확장했다.
- `package.json`의 최소 script 구성을 DB, QA, 보안, 문서, 배포, 릴리즈 실행 계약까지 확장했다.
- `pnpm-workspace.yaml`의 workspace 범위에 `tools/*`를 포함하고 output 제외 기준을 보강했다.
- `turbo.json`의 최소 task graph를 상용화 품질 게이트 중심으로 확장했다.
- `TREE.txt`의 구조 목록을 작업 순서와 완료 기준이 포함된 최종 구조 문서로 확장했다.
- `MANIFEST.json`의 단순 요약을 repository inventory, domain coverage, quality gate, security/privacy controls를 포함하는 구조 매니페스트로 확장했다.

### Release Readiness

- 문서상·이론상 파일 단위 기준으로 루트 구조와 주요 운영 문서가 최종본 기준을 갖추었다.
- 실제 상용 릴리즈 확정 전에는 다음 검증이 필요하다.
  - `pnpm install`
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run quality`
  - `pnpm run build`
  - `pnpm run db:validate`
  - `pnpm run db:migrate`
  - `pnpm run db:seed`
  - `pnpm run test:e2e`
  - `pnpm run security:scan`
  - `pnpm run privacy:check`
  - `pnpm run release`

---

## 완료 기준

이 `CHANGELOG.md`는 다음 기준을 충족할 때 파일 단위 완료로 본다.

1. 프로젝트 버전과 변경 이력을 기록한다.
2. 급여관리, 예산관리, 지출기록, 저축, 알림, LV UP, 커뮤니티, 글쓰기, 마이페이지, 관리자, 광고/제휴, 운영 구조를 포함한다.
3. DB migration, seed, ERD, 정책, RLS, RBAC, audit log, server authority 변경을 포함한다.
4. 보안, 개인정보, 광고 데이터 분리, secret 관리, 취약점 신고 기준을 포함한다.
5. QA, E2E, UAT, 성능, release readiness를 포함한다.
6. 루트 계약 파일 변경을 포함한다.
7. 실제 사용자 개인정보, secret, token, 원문 재무 데이터가 없다.
8. 미완료 표식, 임시 메모, 불명확한 작업 지시가 없다.

---

## 최종 판정

이 `CHANGELOG.md`는 급여납치 플랫폼의 v1.0.0 기준 문서상·이론상 통합 완성 구조, 루트 계약 파일, 데이터베이스, 보안, 운영, QA, 출시 준비 변경 이력을 기록하는 최종 변경 기록 문서다.

문서상·이론상 `CHANGELOG.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다.

프로젝트 종합 완성도 100%는 이 변경 기록에 명시된 구조와 실제 저장소 파일, package scripts, DB migration, seed, API/RBAC/E2E/QA, CI/CD, 배포·운영·릴리즈 검증이 모두 일치하고 실제 환경에서 통과했을 때 최종 확정한다.
