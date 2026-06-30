# Security Policy

> 문서 상태: 최종본  
> 파일 위치: `SECURITY.md`  
> 프로젝트: 급여납치 Salary Hijacking Platform  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수  
> 보안 원칙: 비공개 신고, 신속 triage, 서버 권위 계산 보호, RLS/RBAC 우회 금지, 감사 가능성, 민감정보 최소화, 광고 데이터 분리, 재발 방지

---

## 1. 목적

이 문서는 급여납치 플랫폼의 보안 정책, 취약점 신고 절차, 위험도 분류, 대응 SLA, 민감정보 보호 기준, 핫픽스와 롤백 기준, 공개 금지 정보, 관리자 감사 원칙을 정의한다.

급여납치 플랫폼은 급여, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 알림, LV UP 자기계발, 커뮤니티, 광고/제휴, 관리자 운영 데이터를 다룬다. 이 중 급여액, 지출액, 저축액, 예산, 납치금액, 계산 스냅샷, 인증정보, 소셜 로그인 식별자, 푸시 토큰, 동의 이력, 관리자 감사로그는 고위험 데이터로 취급한다.

모든 보안 취약점은 공개 issue, 공개 PR, 커뮤니티, 채팅방, 스크린샷, 외부 문서로 공개하지 않고 비공개 채널로만 접수한다.

---

## 2. 보안 적용 범위

이 정책은 저장소의 모든 코드, 문서, 설정, 자동화, 인프라, 데이터베이스, 앱, 서비스, 운영 파일에 적용한다.

| 영역              | 적용 대상                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| 모바일 앱         | `apps/mobile`                                                                                                  |
| 관리자 콘솔       | `apps/admin`                                                                                                   |
| API 서비스        | `services/api`                                                                                                 |
| 알림 서비스       | `services/notifications`                                                                                       |
| 스케줄러          | `services/scheduler`                                                                                           |
| 공통 패키지       | `packages/api-contract`, `packages/db`, `packages/security`, `packages/types`, `packages/ui`, `packages/utils` |
| 데이터베이스      | `database/erd`, `database/migrations`, `database/policies`, `database/seeds`                                   |
| 인프라            | `infra/cloudflare`, `infra/neon`, `infra/env`, `infra/github`, `infra/domain`                                  |
| CI/CD             | `.github/workflows`, `turbo.json`, `package.json`, `pnpm-workspace.yaml`                                       |
| 운영/QA/보안 문서 | `docs`, `qa`, `ops`, `security`, `observability`, `release`                                                    |

---

## 3. 지원 보안 상태

| 구분            | 상태      | 비고                             |
| --------------- | --------- | -------------------------------- |
| `main`          | 지원      | 운영/릴리즈 기준 브랜치          |
| `develop`       | 지원      | 통합 개발 기준 브랜치            |
| release branch  | 제한 지원 | 릴리즈 기간 중 보안 패치 대상    |
| feature branch  | 제한 지원 | 보안 취약점 발견 시 병합 전 수정 |
| archived branch | 미지원    | 별도 승인 없이는 패치하지 않음   |

보안 패치는 영향 범위에 따라 `hotfix/*`, `security/*`, `release/*` 브랜치에서 진행할 수 있다.

---

## 4. 취약점 신고 원칙

보안 취약점은 반드시 비공개로 신고한다.

공개 금지 채널:

1. GitHub public issue
2. 공개 pull request 본문
3. 공개 comment thread
4. 외부 커뮤니티
5. 블로그, SNS, 영상, 스크린샷
6. 공개 QA 리포트
7. 광고/제휴 운영 문서
8. 앱스토어/플레이스토어 리뷰 답변

비공개 신고에 포함해야 할 정보:

| 항목            | 설명                                                             |
| --------------- | ---------------------------------------------------------------- |
| 제목            | 취약점 유형과 영향 영역 요약                                     |
| 발견 일시       | `Asia/Seoul` 기준                                                |
| 영향 영역       | mobile, admin, API, DB, notification, scheduler, CI/CD, infra 등 |
| 환경            | local, staging, UAT, production 여부                             |
| 재현 단계       | 최소 재현 경로                                                   |
| 기대 결과       | 정상적으로 차단되어야 하는 동작                                  |
| 실제 결과       | 관찰된 취약 동작                                                 |
| 영향 데이터     | 급여, 지출, 저축, 알림, 커뮤니티, 광고, 관리자 등                |
| requestId       | 가능한 경우 포함                                                 |
| userId/targetId | 실제 개인정보가 아닌 식별 가능한 최소값 또는 마스킹값            |
| 로그            | secret, token, 개인정보, 재무 원천 데이터를 제거한 로그          |
| 증거자료        | 민감정보가 제거된 캡처 또는 설명                                 |
| 제안 대응       | 가능한 경우 완화 방안                                            |

---

## 5. 신고 금지 데이터

취약점 신고, issue, PR, QA 문서, 테스트 증거, 스크린샷, 로그에 아래 원문을 포함하면 안 된다.

| 금지 데이터                      | 처리 기준                          |
| -------------------------------- | ---------------------------------- |
| 비밀번호                         | 절대 포함 금지                     |
| access token / refresh token     | 절대 포함 금지                     |
| push token                       | hash 또는 마스킹만 허용            |
| API key / secret key             | 절대 포함 금지                     |
| DB URL / password                | 절대 포함 금지                     |
| 실제 이메일                      | 마스킹 또는 `example.invalid` 사용 |
| 실제 전화번호                    | hash 또는 마스킹만 허용            |
| IP 원문                          | hash만 허용                        |
| User-Agent 원문                  | hash 또는 요약값만 허용            |
| 급여액 원문                      | 테스트 합성값만 허용               |
| 지출액/저축액/예산/납치금액 원문 | 테스트 합성값만 허용               |
| 광고용 재무 원천 데이터          | 저장/전송/첨부 금지                |
| 관리자 감사로그 원문             | 민감정보 제거 후 최소 발췌만 허용  |

---

## 6. 민감정보 분류

| 등급 | 데이터                                                                | 기준                  |
| ---- | --------------------------------------------------------------------- | --------------------- |
| S1   | 급여액, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷 | 최고 민감 재무 데이터 |
| S2   | 이메일, 전화번호, 소셜 identity, 인증 이력, 동의 이력, 기기 hash      | 개인정보/식별 데이터  |
| S3   | 알림, 푸시 발송 이력, 커뮤니티 글/댓글/신고/첨부                      | 사용자 활동 데이터    |
| S4   | 관리자 감사로그, 운영 장애, 공지, 배포 이력                           | 운영 감사 데이터      |
| S5   | 광고 캠페인, 광고 이벤트, 파트너, 정산 집계                           | 광고/제휴 운영 데이터 |

보호 기준:

1. S1은 광고 이벤트, 커뮤니티, 로그, 스크린샷, public issue에 원문 저장하지 않는다.
2. S2는 원문보다 hash, 마스킹, 최소 보존을 우선한다.
3. S3는 익명/비식별 표시와 신고 처리 기준을 적용한다.
4. S4는 장기 감사 가능성을 유지하되 민감정보 원문을 제거한다.
5. S5는 S1 원천 데이터와 분리하고 동의 스냅샷만 최소 보존한다.

---

## 7. 취약점 심각도 분류

| 등급 | 명칭          | 예시                                                                                                    | 목표 대응                   |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| SEV1 | Critical      | 인증 우회, RLS 우회, 타 사용자 급여/지출 조회, production secret 노출, 원격 코드 실행, 관리자 권한 탈취 | 즉시 대응, 핫픽스/차단 우선 |
| SEV2 | High          | 금액 계산 오류, 권한 상승, 푸시 토큰 노출, 관리자 감사로그 누락, 광고 이벤트에 재무 원천 데이터 저장    | 긴급 패치 및 영향 조사      |
| SEV3 | Medium        | 특정 조건의 정보 과다 노출, rate limit 미흡, 커뮤니티 익명 표시 오류, 파일 업로드 검증 미흡             | 계획 패치                   |
| SEV4 | Low           | 보안 헤더 누락, 문서 오류, 민감하지 않은 dependency warning                                             | 일반 보완                   |
| SEV5 | Informational | 개선 제안, hardening 권고, 운영 문서 보강                                                               | 백로그 반영                 |

---

## 8. 대응 SLA

| 등급 |  triage 시작 |    완화 조치 |               최종 패치 목표 | 보고/후속 조치                           |
| ---- | -----------: | -----------: | ---------------------------: | ---------------------------------------- |
| SEV1 |         즉시 |         당일 |                  24시간 이내 | incident 기록, 감사로그, postmortem 필수 |
| SEV2 |         당일 |  24시간 이내 |                  72시간 이내 | 영향 범위 조사 및 회귀 테스트 필수       |
| SEV3 | 2영업일 이내 | 5영업일 이내 | 다음 정기 릴리즈 또는 핫픽스 | QA 회귀 테스트                           |
| SEV4 | 5영업일 이내 |    계획 반영 |               정기 hardening | 문서/체크리스트 갱신                     |
| SEV5 |      필요 시 |      필요 시 |                  백로그 기준 | 개선 항목 기록                           |

SLA는 실제 사업/법무/개인정보 영향도에 따라 단축할 수 있다.

---

## 9. 서버 권위 계산 보안 기준

급여·예산·지출·저축·납치금액 계산은 클라이언트가 확정하지 않는다.

필수 기준:

1. 금액은 KRW `BIGINT` 정수로 처리한다.
2. 음수 금액과 소수점 금액은 거부한다.
3. 납치금액 표시값은 0원 미만으로 내려가지 않는다.
4. 일일예산 초과는 `remaining_amount = 0`, `over_amount > 0`으로 표현한다.
5. 변동지출은 `idempotency_key`로 중복 등록을 방지한다.
6. 급여계획, 고정지출, 고정저축, 일일예산, 변동지출 변경 후 서버/DB 재계산을 수행한다.
7. 계산 결과는 `payroll_calculation_snapshots` 또는 동등한 감사 가능한 기록으로 추적한다.
8. 계산 입력과 결과를 광고 이벤트, 앱 로그, public issue에 원문 저장하지 않는다.

보안상 치명적인 계산 오류 예시:

- 다른 사용자의 급여계획으로 계산됨
- 고정저축이 납치금액에서 중복 차감됨
- 음수 지출로 납치금액을 증가시킬 수 있음
- 클라이언트 조작으로 `used_amount`, `remaining_amount`, `over_amount`가 확정됨
- idempotency 미적용으로 지출이 중복 반영됨

---

## 10. 인증과 인가 기준

인증/인가 보안 기준:

1. 모든 사용자 요청은 인증 주체를 확인한다.
2. DB transaction에서는 `app.current_user_id`, `app.is_admin`, `app.request_id` 컨텍스트를 설정한다.
3. 사용자는 본인 `user_id` 데이터만 접근한다.
4. 관리자는 활성 `admin_role_members`와 권한 정책을 통과해야 한다.
5. 관리자 작업은 감사로그에 남긴다.
6. social login provider key는 중복되지 않아야 한다.
7. access token, refresh token, session secret은 로그에 남기지 않는다.
8. 계정 정지, 탈퇴, 삭제 상태의 사용자는 보호 정책에 따라 접근을 제한한다.

---

## 11. RLS / RBAC / Audit 기준

데이터베이스 보안 기준:

| 항목         | 기준                                                   |
| ------------ | ------------------------------------------------------ |
| RLS          | 사용자 소유 데이터는 owner/admin 정책 필수             |
| 관리자 RBAC  | 역할 기반 접근통제 필수                                |
| 감사로그     | 관리자 변경, 광고 승인, 신고 처리, 운영 장애 조치 기록 |
| requestId    | API, DB, 관리자 콘솔, 운영 로그 추적에 사용            |
| before/after | 민감정보 제거 또는 마스킹 후 기록                      |
| DELETE       | 삭제 감사 시 OLD 참조 안전성 보장                      |

금지:

1. RLS 없이 사용자 재무 데이터 조회
2. admin flag만으로 모든 관리자 작업 허용
3. 감사로그 없는 권한 변경
4. 민감정보 원문이 포함된 before/after 저장
5. production DB에서 임의 superuser 작업 수행

---

## 12. 광고/제휴 데이터 분리 기준

광고/제휴 시스템은 재무 원천 데이터와 분리한다.

허용:

- 광고 캠페인 ID
- placement
- event type
- requestId
- consent snapshot
- 비식별 session/device hash
- 비재무성 context
- 집계 성과 지표

금지:

- 급여액 원문
- 지출액 원문
- 저축액 원문
- 일일예산 원문
- 납치금액 원문
- 계산 스냅샷 원문
- 대출/보험/저축 상품명 기반 민감 타겟팅
- 커뮤니티 민감글과 광고 타겟 직접 결합

광고 관련 취약점은 SEV2 이상으로 분류할 수 있다. 재무 원천 데이터가 광고 이벤트나 파트너 데이터로 이동한 경우 SEV1로 상향한다.

---

## 13. 로깅과 관측 보안 기준

로그는 문제 해결과 감사 목적에 필요한 최소 정보만 포함한다.

허용 로그:

- requestId
- hashed user id 또는 내부 UUID
- route name
- status code
- latency
- error code
- sanitized message
- environment
- build version

금지 로그:

- password
- token
- secret
- DB URL
- raw email
- raw phone
- raw IP
- raw User-Agent
- raw salary/expense/saving/budget/hijack amount
- raw payroll calculation snapshot
- push token 원문

오류 메시지는 사용자에게 과도한 내부 정보를 노출하지 않는다.

---

## 14. 파일 업로드와 첨부 보안

커뮤니티 첨부, 프로필 이미지, 운영 자료 업로드는 다음 기준을 따른다.

1. 허용 MIME type만 업로드한다.
2. 확장자와 실제 content type을 모두 검증한다.
3. 파일 크기 제한을 둔다.
4. 저장 key는 예측 불가능하게 생성한다.
5. 업로드 파일은 공개 bucket에 직접 노출하지 않는다.
6. 악성 파일, script, HTML, SVG active content 업로드를 제한한다.
7. 첨부 파일 URL에 secret, token, 개인정보를 포함하지 않는다.
8. 삭제/탈퇴/신고 처리 시 첨부 보존 정책을 따른다.

---

## 15. Dependency와 Supply Chain 기준

모든 dependency는 최소 권한과 검증 가능한 버전을 사용한다.

필수 기준:

1. `pnpm-lock.yaml`을 기준으로 재현 가능한 설치를 유지한다.
2. root `package.json`은 `latest` 남발을 금지한다.
3. CI에서 dependency review와 security scan을 수행한다.
4. 악성 패키지, typosquatting, deprecated critical dependency를 점검한다.
5. build script, postinstall script, binary download는 특별히 검토한다.
6. 오픈소스 라이선스와 proprietary license 충돌을 확인한다.

---

## 16. CI/CD 보안 기준

CI/CD 보안 기준:

| 항목                | 기준                                              |
| ------------------- | ------------------------------------------------- |
| secrets             | GitHub Actions secret/environment secret로만 관리 |
| logs                | secret masking 필수                               |
| pull_request_target | 외부 코드 실행과 결합 금지                        |
| deploy              | protected environment 승인 적용                   |
| DB migration        | 선행 검증 후 적용                                 |
| release             | quality, security, privacy, E2E gate 통과 후 진행 |
| artifact            | 민감정보 포함 여부 검사                           |

필수 workflow gate:

1. lint
2. typecheck
3. test
4. db:validate
5. api:contract
6. security:scan
7. privacy:check
8. test:e2e
9. release verification

---

## 17. 환경변수와 Secret 관리

환경변수는 `.env.example`에 이름과 용도만 문서화하고 실제 값은 저장하지 않는다.

금지:

- `.env` commit
- DB URL commit
- API key commit
- private key commit
- token 원문 로그 출력
- secret이 포함된 screenshot 공유
- public issue에 환경변수 값 붙여넣기

Secret rotation이 필요한 상황:

1. secret 노출 의심
2. GitHub Actions log 노출
3. dependency compromise
4. 퇴사/계약 종료자 접근 권한 회수
5. production incident
6. 파트너/광고 credential 변경
7. DB snapshot 또는 backup 접근 권한 변경

---

## 18. Seed와 테스트 데이터 보안

local/staging/UAT seed는 합성 데이터만 사용한다.

필수 기준:

1. 실제 사용자 이메일 금지
2. 실제 전화번호 금지
3. 실제 금융정보 금지
4. 실제 급여/대출/저축/지출 내역 금지
5. `example.invalid` 또는 명확한 테스트 도메인 사용
6. deterministic UUID 사용
7. push token 원문 금지, hash만 사용
8. `ON CONFLICT` 또는 `WHERE NOT EXISTS`로 멱등성 보장
9. seed 실행 후 서버 권위 재계산 수행
10. production DB에서 seed 실행 금지

---

## 19. 보안 핫픽스 절차

SEV1 또는 SEV2는 핫픽스 절차를 적용한다.

절차:

1. 취약점 비공개 접수
2. severity 분류
3. 영향 범위 식별
4. 악용 여부 확인
5. 임시 차단 또는 feature flag off
6. `security/*` 또는 `hotfix/*` 브랜치 생성
7. 최소 수정 패치 작성
8. 단위/통합/보안/회귀 테스트 실행
9. DB 변경이 있으면 migration/rollback 검증
10. staging/UAT 검증
11. protected environment 승인
12. production 배포
13. 배포 후 모니터링
14. incident와 admin audit 기록
15. postmortem과 재발 방지 조치 등록

---

## 20. 롤백 기준

다음 상황에서는 즉시 롤백 또는 기능 차단을 검토한다.

1. 인증 우회
2. 관리자 권한 상승
3. 타 사용자 재무 데이터 노출
4. 급여/예산/지출 계산 대량 오류
5. 광고 이벤트에 재무 원천 데이터 저장
6. production secret 노출
7. DB migration으로 데이터 손상
8. 알림 대량 오발송
9. 커뮤니티 익명성 훼손
10. 관리자 감사로그 미기록

롤백 후에도 사용자 데이터 정합성은 별도 재계산과 감사 절차로 확인한다.

---

## 21. 보안 테스트 체크리스트

보안 변경 또는 릴리즈 전 확인한다.

- [ ] 인증 없는 요청이 차단된다.
- [ ] 사용자는 본인 데이터만 조회한다.
- [ ] 관리자는 RBAC를 통과해야 한다.
- [ ] 관리자 변경은 감사로그에 남는다.
- [ ] 급여/지출/저축/예산/납치금액은 서버 권위로 계산된다.
- [ ] 음수 금액과 소수점 금액이 차단된다.
- [ ] idempotency key 중복 지출이 차단된다.
- [ ] 광고 이벤트에 재무 원천 데이터가 없다.
- [ ] 로그에 secret/token/PII/재무 원문이 없다.
- [ ] 커뮤니티 익명글 작성자 정보가 API 응답에 노출되지 않는다.
- [ ] 파일 업로드는 MIME, 크기, 확장자, 저장 key 정책을 통과한다.
- [ ] dependency scan이 통과한다.
- [ ] DB migration rollback 또는 복구 계획이 있다.
- [ ] seed는 production에서 실행되지 않는다.
- [ ] backup/restore 정책이 탈퇴/삭제 요청과 충돌하지 않는다.

---

## 22. 커뮤니케이션 기준

보안 이슈 커뮤니케이션은 최소 공개 원칙을 따른다.

| 대상             | 공유 내용                               |
| ---------------- | --------------------------------------- |
| 보안 담당자      | 전체 재현 정보, 영향 범위, 패치 계획    |
| 개발 담당자      | 수정에 필요한 최소 기술 정보            |
| 운영 담당자      | 사용자 영향, 공지 여부, 대응 Runbook    |
| 경영/사업 담당자 | 위험도, 일정, 고객 영향, 법무 필요 여부 |
| 외부 사용자      | 필요 시 검토된 공지와 조치 결과         |

공개 공지는 실제 악용을 유도할 수 있는 상세 payload, exploit path, secret, 내부 구조를 포함하지 않는다.

---

## 23. 보안 완료 기준

보안 이슈는 다음 조건을 충족해야 종료한다.

1. 원인이 확인되었다.
2. 영향 범위가 기록되었다.
3. 패치가 적용되었다.
4. 테스트가 통과했다.
5. 로그/DB/광고 이벤트/백업의 민감정보 노출 여부를 확인했다.
6. 필요한 경우 token/secret을 rotation했다.
7. 사용자 영향이 있으면 안내 기준을 검토했다.
8. admin audit 또는 incident 기록이 남았다.
9. 재발 방지 작업이 등록되었다.
10. 관련 문서/테스트/정책이 갱신되었다.

---

## 24. 파일 단위 완료 기준

`SECURITY.md`는 다음 기준을 충족할 때 파일 단위 완료로 본다.

1. 보안 정책의 목적과 범위를 설명한다.
2. 취약점 비공개 신고 원칙을 정의한다.
3. 신고에 포함할 정보와 포함 금지 데이터를 정의한다.
4. 급여·지출·저축·예산·납치금액 등 고위험 데이터를 분류한다.
5. severity와 대응 SLA를 정의한다.
6. 서버 권위 계산 보호 기준을 정의한다.
7. RLS/RBAC/감사로그 기준을 정의한다.
8. 광고/제휴 데이터와 재무 원천 데이터 분리 기준을 정의한다.
9. 로그, secret, dependency, CI/CD, seed 보안 기준을 포함한다.
10. 핫픽스와 롤백 기준을 포함한다.
11. 보안 테스트 체크리스트를 포함한다.
12. 보안 이슈 종료 기준을 포함한다.
13. 미완료 표식, 임시 메모, placeholder가 없다.

---

## 25. 최종 판정

이 `SECURITY.md`는 급여납치 플랫폼의 루트 보안 정책 문서로서 취약점 신고, 민감정보 보호, 서버 권위 계산 보호, RLS/RBAC, 감사로그, 광고 데이터 분리, 로그/secret 관리, CI/CD 보안, seed 보안, 핫픽스, 롤백, 보안 테스트, 이슈 종료 기준을 통합 정의한다.

문서상·이론상 `SECURITY.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다.

단, 프로젝트 종합 완성도 100%는 실제 저장소의 코드, DB migration, API/RBAC, E2E/QA, CI/CD, 보안 스캔, 운영 incident 대응 훈련이 본 문서와 일치하게 통과했을 때 최종 확정한다.
