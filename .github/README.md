# GitHub 운영 구조

이 디렉터리는 급여납치(`salary-hijacking-platform`) 프로젝트의 GitHub 기반 협업·품질·보안·배포 운영 정책을 관리한다. `.github` 하위 파일은 단순 보조 문서가 아니라 PR 품질 게이트, 코드 오너 승인, 이슈 접수 품질, CI/CD, 보안 스캔, 릴리즈 통제의 기준점이다.

## 운영 원칙

급여납치 프로젝트는 급여, 예산, 지출, 저축, 대출, 납치금액, 알림, 레벨업, 커뮤니티, 광고·제휴, 관리자 운영 데이터를 다루는 재무 자기관리 플랫폼이다. 따라서 GitHub 운영 구조는 다음 원칙을 기본값으로 둔다.

- 모든 변경은 Pull Request를 통해 검토한다.
- 서버 권위 계산 로직, 인증·인가, 개인정보·민감정보, 광고 데이터 분리, 배포·릴리즈 자동화 변경은 반드시 담당 코드 오너의 리뷰를 받는다.
- PR은 lint, typecheck, test, build, E2E/QA, 보안 스캔, 의존성 검토를 통과해야 한다.
- 급여·예산·지출·저축·납치금액 등 재무성 개인정보는 로그, 이슈, PR 설명, 테스트 fixture, 빌드 산출물에 원문으로 남기지 않는다.
- 광고·제휴 분석 데이터는 사용자의 재무 원천 데이터와 분리한다.
- 운영 자동화 파일은 최소 권한, 명시적 timeout, 재현 가능한 lockfile 설치, 실패 시 원인 추적 가능한 리포트를 제공해야 한다.

## 디렉터리 구성

```text
.github/
├── CODEOWNERS
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── docs_task.yml
│   └── feature_request.yml
├── PULL_REQUEST_TEMPLATE.md
├── README.md
└── workflows/
    ├── ci.yml
    ├── deploy-admin.yml
    ├── deploy-api.yml
    ├── mobile-build.yml
    ├── release.yml
    └── security-scan.yml
```

## 파일별 책임

| 파일                                 | 목적             | 주요 책임                                                                        |
| ------------------------------------ | ---------------- | -------------------------------------------------------------------------------- |
| `CODEOWNERS`                         | 코드 오너 지정   | 앱, API, DB, 인프라, 보안, 문서, QA, 릴리즈 변경에 대한 승인 책임자 지정         |
| `PULL_REQUEST_TEMPLATE.md`           | PR 품질 표준화   | 변경 목적, 영향 범위, 검증 결과, 보안·개인정보 영향, 배포·롤백 계획 확인         |
| `ISSUE_TEMPLATE/bug_report.yml`      | 버그 신고 표준화 | 재현 절차, 영향도, 환경, 로그 마스킹, 급여 계산/보안/성능 이슈 수집              |
| `ISSUE_TEMPLATE/docs_task.yml`       | 문서 작업 표준화 | 문서 범위, 대상 독자, 요구사항 출처, 수락 기준 관리                              |
| `ISSUE_TEMPLATE/feature_request.yml` | 기능 요청 표준화 | 사용자 가치, 화면/기능/데이터/API/운영/보안 요구사항 수집                        |
| `workflows/ci.yml`                   | 기본 품질 게이트 | 설치, lint, typecheck, test, build, E2E, audit, 템플릿 회귀 방지                 |
| `workflows/deploy-admin.yml`         | 관리자 콘솔 배포 | 관리자 앱 검증, OpenNext 산출물 검사, Cloudflare Worker 배포                     |
| `workflows/deploy-api.yml`           | API 배포         | API 검증, Wrangler 설정, DB migration hook, Cloudflare Workers 배포, healthcheck |
| `workflows/mobile-build.yml`         | 모바일 빌드      | Expo/EAS 설정 검증, 모바일 lint/test/build, Android/iOS EAS Build                |
| `workflows/release.yml`              | 릴리즈 게이트    | 릴리즈 후보 검증, 릴리즈 노트, 체크섬, GitHub Release 생성                       |
| `workflows/security-scan.yml`        | 보안 게이트      | 의존성 감사, Dependency Review, CodeQL, secret-like scan, 개인정보 정책 스캔     |

## Issue 운영 기준

이슈는 단순 요청이 아니라 제품·기술·운영 요구사항의 원천으로 사용한다. 모든 이슈는 다음 기준을 지켜야 한다.

- 재현 가능한 정보와 수락 기준을 포함한다.
- 실제 급여, 계좌, 카드, 대출, 저축, 소비 내역, 토큰, 세션, 쿠키, API key를 포함하지 않는다.
- 금액 계산 이슈는 입력값, 기대 결과, 실제 결과, 적용 공식, 기준 일자와 시간대를 명확히 적는다.
- 보안 이슈는 공개 이슈로 민감한 세부 payload를 공유하지 않는다.
- 성능 이슈는 p95, p99, 발생 환경, 데이터 규모, 재현 절차를 포함한다.

## Pull Request 운영 기준

PR은 다음 조건을 만족해야 리뷰와 병합이 가능하다.

- 변경 목적과 사용자 가치가 명확하다.
- 영향 범위가 앱, API, DB, 인프라, 문서, QA, 보안, 운영 항목으로 분리되어 있다.
- 서버 권위 계산 로직 변경 시 계산 공식, 반올림/절삭 정책, KRW 정수 처리, 음수 처리, 시간대 기준을 명시한다.
- DB 변경 시 migration, rollback, 데이터 보존, 인덱스, 성능 영향을 명시한다.
- 개인정보·민감정보 처리 변경 시 로그 마스킹, 접근 제어, 보존 기간, 광고 데이터 분리 여부를 검토한다.
- 관리자 기능 변경 시 RBAC, 감사 로그, 운영자 오남용 방지, 장애 대응 절차를 검토한다.
- 배포 영향이 있으면 rollout, rollback, healthcheck, feature flag, 모니터링 계획을 포함한다.

## Branch Protection / Rulesets 권장 설정

`main`과 `develop` 브랜치는 보호되어야 한다. 권장 설정은 다음과 같다.

- Require a pull request before merging.
- Require approvals.
- Require review from Code Owners.
- Dismiss stale pull request approvals when new commits are pushed.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes.
- Block deletions.
- Restrict bypass 권한은 최소 인원에게만 부여한다.

필수 상태 체크 예시는 다음과 같다.

- `ci / verify`
- `ci / dependency-review`
- `security-scan / security-contract`
- `security-scan / dependency-audit`
- `security-scan / codeql`
- `security-scan / security-tests`
- `security-scan / security-summary`
- `release / release-quality-gate`

배포 대상 변경 PR에서는 아래 workflow 결과도 확인한다.

- `deploy-admin / verify-admin`
- `deploy-api / verify-api`
- `mobile-build / verify-mobile`

## CI/CD 운영 기준

모든 workflow는 다음 기준을 따른다.

- `permissions`는 최소 권한으로 명시한다.
- `timeout-minutes`를 지정해 무한 실행을 방지한다.
- `concurrency`를 적용해 오래된 실행을 취소한다.
- `pnpm install --frozen-lockfile`로 재현 가능한 설치를 보장한다.
- Node.js와 pnpm 버전은 workflow에서 명시한다.
- 리포트와 빌드 산출물은 artifact로 보관하되, secret이나 민감정보가 포함되지 않도록 검사한다.
- 배포 workflow는 검증 job과 배포 job을 분리한다.
- production 배포는 GitHub Environment 승인과 secret 검증을 통과해야 한다.

## 보안·개인정보 기준

급여납치의 GitHub 운영은 보안과 개인정보 보호를 기본 전제로 한다.

- secret은 repository에 커밋하지 않는다.
- 실제 사용자 금액, 급여일, 계좌성 데이터, 대출 정보, 소비 내역은 이슈·PR·테스트 로그에 포함하지 않는다.
- `.env*`, private key, signing key, service account, Expo token, Cloudflare token, database URL은 GitHub Secrets 또는 안전한 비밀 관리 체계로만 관리한다.
- 광고·제휴 데이터 처리 변경은 재무 원천 데이터와의 결합 여부를 반드시 검토한다.
- 관리자 기능 변경은 권한 상승, 감사 로그, 민감 데이터 접근, 운영자 오남용 가능성을 확인한다.
- 보안 취약점은 공개 이슈보다 지정된 보안 신고 채널 또는 비공개 절차를 우선한다.

## 코드 오너 책임 기준

`CODEOWNERS`는 다음 영역의 최종 리뷰 책임을 정의한다.

- `core-team`: 프로젝트 전체 아키텍처, 릴리즈 기준, 공통 품질 정책.
- `platform`: CI/CD, 인프라, 배포, 모노레포, 개발자 경험.
- `security`: 개인정보, 인증·인가, secret, 보안 스캔, 위협 모델, 정책.
- `backend`: API, 서버 권위 계산, DB, scheduler, notification, integration.
- `mobile`: 모바일 앱, Expo/EAS, 사용자 앱 UX, 앱 배포.
- `admin`: 관리자 콘솔, 운영자 기능, 운영 데이터, RBAC 화면.
- `product`: 기획 문서, 화면 설계, QA 시나리오, 기능 요구사항, 사용자 경험.

## 릴리즈 운영 기준

릴리즈는 `release.yml`을 기준으로 관리한다.

- 릴리즈 전 `lint`, `typecheck`, `test`, `test:e2e`, `build`, `audit`가 통과해야 한다.
- 릴리즈 노트는 기능, 버그, 보안, DB, 운영, 마이그레이션, 롤백 정보를 포함한다.
- 산출물은 SHA256 체크섬으로 무결성을 검증한다.
- production 릴리즈는 승인된 태그와 GitHub Release로 추적한다.
- 장애 대응을 위해 배포 커밋, 릴리즈 태그, 산출물, 체크섬, 변경 요약을 보관한다.

## 급여납치 특화 품질 게이트

다음 변경은 반드시 추가 검토가 필요하다.

- 급여, 예산, 지출, 저축, 납치금액 계산 공식 변경.
- KRW 원 단위 정수 처리, 음수 처리, 일일 예산 계산 변경.
- 고정지출, 고정저축, 변동지출 분류 로직 변경.
- 알림 발송, scheduler, notification queue 변경.
- LV UP, 커뮤니티, 글쓰기, 마이페이지, 관리자 콘솔 권한 변경.
- 광고·제휴 측정, 사용자 세그먼트, 추천, 분석 이벤트 변경.
- DB schema, migration, index, retention, backup, restore 정책 변경.
- 인증, 세션, 토큰, RBAC, 관리자 감사 로그 변경.
- Cloudflare, Expo, domain, environment, secret, release 자동화 변경.

## 운영 Definition of Done

PR이 완료되려면 다음을 충족해야 한다.

- 요구사항과 수락 기준이 PR에 명시되어 있다.
- 관련 코드 오너가 리뷰했다.
- CI와 보안 스캔이 통과했다.
- 계산 로직 변경은 테스트가 추가되었다.
- DB 변경은 migration과 rollback 또는 복구 전략이 있다.
- 보안·개인정보 영향이 검토되었다.
- 사용자 화면 변경은 모바일/관리자 반응형 영향을 확인했다.
- 운영 영향이 있는 변경은 배포·롤백·모니터링 계획이 있다.
- 관련 문서와 QA 체크리스트가 갱신되었다.

## 금지 사항

- 실제 사용자 재무 데이터를 이슈, PR, 로그, 테스트 fixture로 업로드하는 행위.
- secret을 코드, 문서, workflow, issue, PR description에 직접 작성하는 행위.
- 코드 오너 리뷰 없이 보안·DB·배포·계산 로직을 변경하는 행위.
- 실패한 CI/CD나 security scan을 근거 없이 우회하는 행위.
- 광고 데이터와 재무 원천 데이터를 명확한 정책 없이 결합하는 행위.
- 관리자 권한 변경을 감사 로그 없이 배포하는 행위.

## 관련 파일

- `.github/CODEOWNERS`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/docs_task.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-admin.yml`
- `.github/workflows/deploy-api.yml`
- `.github/workflows/mobile-build.yml`
- `.github/workflows/release.yml`
- `.github/workflows/security-scan.yml`

## 완성도 기준

이 README는 `.github` 운영 구조의 목적, 책임, 리뷰 정책, CI/CD, 보안, 개인정보, 릴리즈, 급여납치 도메인 특화 품질 게이트를 설명한다. 실제 운영 완성도는 이 문서와 함께 `CODEOWNERS`, PR 템플릿, Issue Form, workflow, 브랜치 보호 규칙, GitHub Secrets, GitHub Environments, 조직 팀 권한이 일관되게 설정되었을 때 달성된다.
