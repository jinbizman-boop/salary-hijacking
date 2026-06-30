---
프로젝트: 급여납치
문서상태: 최종본
작성기준일: 2026-06-15
적용범위: 모바일 앱, API 서버, Neon DB, Cloudflare, GitHub 기반 개발 협업
승인상태: 문서상·이론상 최종 승인본
---

# GitHub 이슈 템플릿 최종본

## 1. 문서 목적

본 문서는 급여납치 플랫폼의 모든 개발·기획·디자인·QA·운영 작업을 GitHub Issue 단위로 관리하기 위한 최종 기준이다.  
모든 작업은 Issue 등록 → 우선순위 지정 → 담당자 배정 → 작업 브랜치 생성 → Pull Request → 리뷰 → 병합 → 종료 순서로 처리한다.

## 2. Issue 운영 원칙

| 항목            | 기준                                                 |
| --------------- | ---------------------------------------------------- |
| Issue 필수 여부 | 모든 작업은 Issue가 있어야 한다                      |
| Issue 번호 사용 | 브랜치명, 커밋, PR 제목에 Issue 번호를 연결한다      |
| Issue 단위      | 1개 Issue는 1개 명확한 작업 결과물을 가진다          |
| Issue 크기      | 1영업일 이상 작업이면 하위 Task로 분해한다           |
| 중복 Issue      | 기존 Issue 검색 후 중복이면 링크 후 종료한다         |
| 승인 필요 Issue | 범위 변경, 보안, 개인정보, 결제/광고, DB 스키마 변경 |
| 완료 조건       | 수락 기준 충족, 테스트 완료, PR 병합, 문서 반영      |

## 3. 공통 라벨 체계

| 라벨               | 의미       | 사용 기준                |
| ------------------ | ---------- | ------------------------ |
| `type:feature`     | 신규 기능  | 기능 추가                |
| `type:bug`         | 버그       | 의도와 다른 동작         |
| `type:improvement` | 개선       | 기존 기능 품질 개선      |
| `type:docs`        | 문서       | 문서 작성/수정           |
| `type:design`      | 디자인     | UI/UX, 에셋, 컴포넌트    |
| `type:test`        | 테스트     | QA, 자동화 테스트        |
| `type:infra`       | 인프라     | 배포, 환경, CI/CD        |
| `type:security`    | 보안       | 인증, 권한, 취약점       |
| `area:payroll`     | 급여 관리  | 급여 홈, 계획, 납치금액  |
| `area:expense`     | 지출       | 고정지출, 변동지출, 예산 |
| `area:levelup`     | 레벨업     | 독서, 뉴스, 영어, 건강   |
| `area:community`   | 커뮤니티   | 게시글, 댓글, 신고       |
| `area:mypage`      | 마이페이지 | 프로필, 내 활동          |
| `area:admin`       | 관리자     | 운영툴                   |
| `priority:P0`      | 즉시 처리  | 장애/보안/출시 차단      |
| `priority:P1`      | 높음       | MVP 핵심                 |
| `priority:P2`      | 보통       | 고도화                   |
| `priority:P3`      | 낮음       | 후순위                   |
| `status:ready`     | 작업 가능  | 요구사항 확정            |
| `status:blocked`   | 차단       | 외부 의존성 존재         |
| `status:in-review` | 리뷰 중    | PR 리뷰 진행             |
| `status:done`      | 완료       | 병합 및 검증 완료        |

## 4. 기능 요청 Issue Form

파일 위치: `.github/ISSUE_TEMPLATE/feature_request.yml`

```yaml
name: 기능 요청
description: 급여납치 플랫폼의 신규 기능 개발 요청
title: "[FEATURE] "
labels: ["type:feature", "status:ready"]
body:
  - type: input
    id: feature_id
    attributes:
      label: 기능 ID
      description: 기능 명세서의 FUN-XXX 또는 신규 임시 ID를 입력한다.
      placeholder: "FUN-002"
    validations:
      required: true

  - type: dropdown
    id: area
    attributes:
      label: 기능 영역
      options:
        - 급여 관리
        - 고정지출
        - 고정저축
        - 일일 예산
        - 변동지출
        - 알림
        - 레벨업
        - 커뮤니티
        - 글쓰기
        - 마이페이지
        - 광고/제휴
        - 관리자
    validations:
      required: true

  - type: textarea
    id: summary
    attributes:
      label: 요청 요약
      description: 사용자가 무엇을 할 수 있어야 하는지 한 문단으로 작성한다.
      placeholder: "사용자는 급여일과 수령 예정 급여를 입력하고 예상 납치금액을 확인할 수 있어야 한다."
    validations:
      required: true

  - type: textarea
    id: user_story
    attributes:
      label: 사용자 스토리
      placeholder: "직장인 사용자로서, 나는 월급 수령 후 지출 계획을 세우기 위해 급여 정보를 등록하고 싶다."
    validations:
      required: true

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: 수락 기준
      value: |
        - [ ] 정상 입력 시 저장된다.
        - [ ] 필수값 누락 시 오류 메시지가 표시된다.
        - [ ] 저장 후 관련 화면의 금액이 즉시 갱신된다.
        - [ ] API 오류 시 재시도 또는 안내 문구가 표시된다.
        - [ ] 테스트 케이스가 통과한다.
    validations:
      required: true

  - type: textarea
    id: dependencies
    attributes:
      label: 의존 문서/화면/API
      placeholder: "화면 ID: SCR-003, API: POST /v1/payroll-plans, DB: payroll_plans"
    validations:
      required: true
```

## 5. 버그 Issue Form

파일 위치: `.github/ISSUE_TEMPLATE/bug_report.yml`

```yaml
name: 버그 리포트
description: 앱/서버/운영툴에서 발견된 오류 제보
title: "[BUG] "
labels: ["type:bug"]
body:
  - type: dropdown
    id: severity
    attributes:
      label: 심각도
      options:
        - S0 서비스 중단
        - S1 핵심 기능 불가
        - S2 주요 기능 오류
        - S3 경미한 오류
        - S4 문구/디자인 오류
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: 발생 환경
      placeholder: "iOS 18 / iPhone 15 / 앱 v1.0.0 / API production"
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: 재현 경로
      value: |
        1.
        2.
        3.
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: 기대 결과
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: 실제 결과
    validations:
      required: true

  - type: textarea
    id: evidence
    attributes:
      label: 증빙
      description: 스크린샷, 로그, requestId, 영상 링크를 첨부한다.
    validations:
      required: false
```

## 6. 개선 Issue Form

파일 위치: `.github/ISSUE_TEMPLATE/improvement.yml`

```yaml
name: 개선 요청
description: 기존 기능의 사용성, 성능, 안정성, 운영성 개선
title: "[IMPROVE] "
labels: ["type:improvement"]
body:
  - type: textarea
    id: current
    attributes:
      label: 현재 상태
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: 문제점
    validations:
      required: true

  - type: textarea
    id: proposal
    attributes:
      label: 개선안
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: 영향 범위
      placeholder: "사용자, API, DB, 화면, 운영툴, QA 영향"
    validations:
      required: true
```

## 7. 문서 작업 Issue Form

파일 위치: `.github/ISSUE_TEMPLATE/docs.yml`

```yaml
name: 문서 작업
description: 기획/개발/운영/QA 문서 작성 또는 수정
title: "[DOCS] "
labels: ["type:docs"]
body:
  - type: dropdown
    id: doc_type
    attributes:
      label: 문서 유형
      options:
        - 기획 문서
        - UX/UI 문서
        - 기능 문서
        - 데이터/DB 문서
        - API/백엔드 문서
        - 기술 설계 문서
        - 보안/정책 문서
        - QA 문서
        - 운영 문서
        - 출시 문서
        - 개발 협업 문서
    validations:
      required: true

  - type: textarea
    id: target
    attributes:
      label: 작업 대상 문서
      placeholder: "03_제품_요구사항_정의서_PRD_최종본.md"
    validations:
      required: true

  - type: textarea
    id: change
    attributes:
      label: 변경 내용
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: 완료 체크
      options:
        - label: 기존 문서와 충돌하지 않는다.
        - label: 용어 정의서와 일치한다.
        - label: 관련 문서 링크를 반영했다.
        - label: 변경 이력을 기록했다.
```

## 8. Issue 제목 규칙

```text
[TYPE] 영역 - 작업 요약
```

예시:

```text
[FEATURE] 급여관리 - 급여 계획 생성 API 구현
[BUG] 일일예산 - 변동지출 추가 후 남은금액 미갱신
[DOCS] API - 푸시 알림 명세 보완
[IMPROVE] 커뮤니티 - 게시글 목록 무한스크롤 성능 개선
```

## 9. Issue 종료 기준

Issue는 아래 조건을 모두 만족해야 종료한다.

- 담당 PR이 병합되었다.
- 수락 기준이 모두 충족되었다.
- 테스트 결과가 기록되었다.
- 관련 문서가 업데이트되었다.
- 릴리즈 노트 반영 대상이면 버전 문서에 연결되었다.
- 운영 영향이 있으면 운영 문서 또는 공지 대상 여부가 결정되었다.

## 10. 금지 사항

- Issue 없이 작업 착수 금지
- 하나의 Issue에 여러 기능 묶기 금지
- 버그 Issue에 원인 추정만 작성하고 재현 경로 누락 금지
- 보안/개인정보 이슈를 공개 Issue에 민감정보와 함께 등록 금지
- 운영 장애 이슈를 일반 개선 라벨로 낮춰 등록 금지

## 11. 최종 완료 기준

본 문서에 정의된 Issue Form과 라벨 체계가 GitHub 저장소에 반영되어야 하며, 모든 작업은 본 기준에 따라 접수·추적·종료한다.
