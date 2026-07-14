# Salary Hijacking Conversation And Work History

생성일: 2026-07-12 KST  
작업 기준 폴더: `C:\Users\PC\Desktop\salary-hijacking-platform`  
주의: Codex가 플랫폼 내부의 원본 채팅 export API를 직접 호출할 수는 없으므로, 이 문서는 현재 스레드에 남아 있는 대화 맥락, 사용자 요청, 로컬 작업 결과, 저장소 상태 확인 내용을 기준으로 재구성한 Markdown 작업 기록이다.

## 1. 최초 목표와 작업 방향

사용자는 급여납치 Salary Hijacking 프로젝트를 출시 직전 수준의 모바일 앱/APK로 완성하고 싶다고 요청했다. 핵심 목표는 다음과 같았다.

- Android에서 설치 가능한 APK 제공
- 앱 실행 즉시 중단되는 문제 해결
- splash, login, salary home, plan, notifications, LV UP, community, profile 등 모바일 화면 구현
- 사용자가 제공한 이미지/HTML/PDF 디자인 시안을 그대로 반영
- 로고, 파비콘, 앱 아이콘, splash, notification icon 교체
- 하단 탭, 상단 로고/알림, 모바일 safe area, 시스템 네비게이션바 충돌 방지
- 급여/예산/지출/저축 계산과 사용 예정/사용 완료 상태 동작
- 서버 권위 계산, 개인정보/광고 분리, 보안, release evidence, QA 증빙 유지
- production AAB, Google Play 제출, 새 EAS 프로젝트, 새 keystore, secret 재발급은 사용자 명시 승인 전 금지

## 2. 사용자가 반복적으로 지적한 문제

사용자는 실제 모바일 환경에서 APK를 설치하고 테스트하면서 다음 문제를 제기했다.

- 다운로드 링크 또는 파일 열기가 모바일 환경에서 실패함
- APK 설치 후 실행하면 앱이 바로 종료됨
- Expo Router 탭 라우트 이름 불일치로 앱 진입이 죽는 것으로 추정됨
- 임시 진단 화면 또는 RC 화면이 보이고, 실제 기획/디자인 반영 앱이 아님
- 앱 아이콘이 요구한 이미지와 다르게 보임
- splash 화면이 사용자가 제공한 디자인과 다름
- 급여 메인 화면은 보이지만 기능이 작동하지 않음
- 메인 화면의 사용 예정/사용 완료 버튼 의미가 반대로 적용됨
- 금일 변동 지출 입력값이 저장되지 않고 화면 이동 후 사라짐
- 키보드가 올라오면 입력 폼이 키보드 아래에 가려짐
- 계획 화면에서 세부 항목 추가/수정이 불가능함
- 알림 화면에 하단 네비게이션바가 노출되면 안 됨
- 시간/날짜가 한국 표준시간과 동기화되지 않음
- 문서/기획서/설계서 의도대로 구현되지 않는다고 피드백함
- 최종 QA용 APK는 겉모습만이 아니라 기능까지 모두 활성화된 출시 직전 앱이어야 한다고 강조함

## 3. 첨부/참고 자산

사용자는 다음 종류의 자료를 제공했다.

- 앱 아이콘/브랜드 로고 이미지
- 앱 아이콘 자산 세트 예시 이미지
- splash/login 화면 이미지
- 급여 메인 화면 이미지
- 계획 화면 이미지
- 알림 화면 이미지
- LV UP, 독서, 뉴스, 영어, 건강 화면 이미지
- 커뮤니티 목록/글쓰기 화면 이미지
- MY/profile 화면 이미지
- `급여납치 어플리케이션 디자인.pdf`
- `급여납치 화면 및 기능 설계 기획안.html`
- 여러 HTML 프로토타입:
  - salary home
  - notifications
  - plan settings
  - level main
  - reading/news/english/health level
  - community write
  - profile/mypage
- 아이콘 자산 경로 정책:
  - Expo 설정용 이미지는 `apps/mobile/assets/`
  - 앱 런타임 아이콘은 `apps/mobile/src/shared/assets/icons/`
  - 앱 런타임 이미지는 `apps/mobile/src/shared/assets/images/`
  - 파일명은 소문자 kebab-case
  - 정적 require registry 사용

## 4. 앱 실행 안정화 관련 진행

대화 중 앱이 계속 중단되는 문제가 가장 큰 이슈였다. 확인 및 조치 방향은 다음과 같았다.

- Expo Router 탭 등록 이름이 실제 폴더 구조와 달라 앱 시작 시 라우터 초기화가 죽는 문제를 우선 의심
- 실제 탭 route name은 `salary`, `plan`, `level`, `community`, `profile` 구조여야 함
- 이전 APK 이름으로 `salary-hijacking-real-app-router-fix-debug.apk`가 언급됨
- 이전 확인 결과:
  - 라우트 이름 수정
  - 테스트 25개 PASS
  - typecheck PASS
  - format check PASS
  - Android APK build PASS
  - APK 서명 검증 PASS
  - APK 링크 HTTP 200 확인
- 그럼에도 사용자 실기기에서는 계속 중단됨이 보고되어, 실제 기기 logcat 검증이 필요하다고 판단됨

## 5. UI/UX 반영 진행 요약

사용자는 여러 화면을 순차적으로 요청했고, 작업은 우선순위별로 진행되었다.

### 5.1 Splash/Login

요구사항:

- 기존 진단 splash 또는 단순 로고 화면 대신 사용자 이미지와 같은 splash 구현
- 신규 로고 사용
- Eureka World 로고는 사용자가 제공한 이미지 사용
- 모바일 기기 비율이 달라도 중앙 정렬, 크기, 하단 로고 위치가 깨지지 않아야 함
- login 화면에는 아이디/비밀번호 입력, SNS 버튼, 회원가입, 자동 로그인 표시 필요

반영 상태:

- 신규 로고 기반 splash/login 디자인이 일부 반영됨
- 사용자 요청에 따라 첫 진입 화면이 진단 화면이 아니라 브랜드 splash가 되도록 방향 수정
- 다만 모든 기기 해상도에서 1:1 픽셀 수준 검증은 아직 충분하지 않음

### 5.2 Salary Home

요구사항:

- 상단 시스템바를 가리지 않음
- 상단 로고와 알림 버튼이 안전 영역 안에 있어야 함
- 하단 탭은 Android 시스템 네비게이션바를 가리면 안 됨
- 급여 현황 카드:
  - 날짜
  - 이번 달 급여일
  - 다음 달 급여일
  - 수령 금액
  - 지출 금액
  - 납치 금액
  - 전체 누적 납치 금액
- Google Ad 영역
- 금일 고정 지출
- 일일 사용 예산
- 금일 변동 지출
- `사용 예정`, `사용 완료` 상태 동작
- 변동 지출 추가/저장

반영 상태:

- 급여 메인 화면 시각 디자인은 사용자 피드백 기준 많이 개선됨
- 하단 탭/상단 로고/알림 배치도 개선됨
- 그러나 사용자가 지적한 기능 동작은 아직 완성 기준에 미달:
  - 버튼 의미 반전 문제 발생
  - 입력값 저장 유지 문제 발생
  - 세부 항목 수정/추가 UX 부족
  - 키보드 회피 문제 발생

### 5.3 Plan

요구사항:

- 목표 달성률 카드
- 내 급여 납치 계획/설정
- 월별 고정 지출 계획/설정
- 월별 고정 적금 계획/설정
- 일일 생활비 계획/설정
- 각 섹션 설정 버튼
- 설정 버튼 클릭 시 총액뿐 아니라 세부 항목 추가/수정 가능
- 세부 항목에서 카테고리, 금액, 내용 수정 가능
- 계획에서 설정한 항목은 메인 화면과 날짜 기준으로 동기화
- 완료 처리한 고정 지출/적금은 해당 월 메인에서 미노출
- 다음 월에는 다시 사용 예정으로 노출
- 날짜가 지났는데 미완료면 주황색 표시

반영 상태:

- 계획 화면 디자인은 제공 이미지 기준으로 상당 부분 반영됨
- 그러나 각 세부 항목의 실제 수정/추가/동기화 기능은 부분 구현 또는 미완성 상태
- 사용자가 요구한 “계획 화면 설정 버튼과 메인 화면 설정 버튼의 동일한 동작”은 아직 완성 검증 필요

### 5.4 Notifications

요구사항:

- 알림 화면은 별도 화면으로 보여야 함
- 하단 네비게이션바는 없어야 함
- 각 알림 클릭 시 해당 화면으로 이동해야 함
- 디자인은 첨부 이미지와 동일해야 함

반영 상태:

- 알림 화면 디자인 반영 작업이 진행됨
- 하단 탭 제거 요구가 추가됨
- 알림별 deep link 이동은 구현/검증이 추가로 필요함

### 5.5 LV UP / Community / Profile

요구사항:

- LV UP 메인
- 독서/뉴스/영어/건강 레벨업 화면
- 커뮤니티 전체/자유/레벨업 인증/취미 탭
- 커뮤니티 글쓰기:
  - 제목
  - 본문
  - 첨부
  - 질문
  - 익명
  - 게시판 유형
  - 완료
- MY/Profile:
  - 프로필
  - 누적 납치금액
  - 레벨
  - 자기관리 성과
  - 게시글 관리
  - 레벨업 관리
  - 문의
  - 공지

반영 상태:

- 문서와 라우트 구조상 화면들은 존재하거나 계획되어 있음
- 일부 UI 반영은 진행되었으나, 전체 화면이 사용자 제공 이미지와 동일하며 모든 기능이 활성화됐다고 보기는 어려움

## 6. 기능 요구사항 정리

사용자가 기대한 실제 동작은 다음과 같다.

- splash에서 login/home으로 자동 전환
- 로그인/회원가입 화면 표시
- 하단 탭 이동
- 급여 홈에서 지출 추가 시 오늘 사용금액/남은금액 즉시 변경
- 일일 예산 세부 항목 추가/수정/삭제
- 사용 예정/사용 완료 상태 변경
- 금일 변동 지출 입력값 저장
- 계획 탭에서 급여/지출/저축/생활비 계획 추가/수정/삭제
- 계획 데이터가 메인 화면에 날짜 기준으로 동기화
- LV UP 콘텐츠 완료 시 XP/상태 변경
- 커뮤니티 글쓰기/댓글/좋아요/신고
- 알림 클릭 시 해당 화면 이동
- 앱 재실행 후 빈 화면 없이 진입
- 서버/API 실패 시 fallback UI 표시
- 예산 초과 시 빨간색/문구 표시
- 광고/제휴 영역은 금융 원문 기반 타겟팅 없이 분리 표시
- 민감 금융정보 원문 노출 금지

## 7. 보안/개인정보/운영 원칙

대화 중 사용자가 명시한 금지 사항과 프로젝트 문서 원칙은 다음과 같다.

- secret 원문 요구 금지
- `google-services.json`, Firebase service account JSON, keystore, `DATABASE_URL` 원문 커밋 금지
- Cloudflare/GitHub/Expo/Firebase/Neon secret 원문 출력 금지
- production AAB 빌드 금지
- `eas submit` 금지
- Google Play 최종 제출 금지
- 새 EAS 프로젝트 생성 금지
- 새 keystore 생성 금지
- Firebase 재설정/secret 재발급 금지
- DB destructive migration 금지
- Git force push/rebase 금지
- 광고/분석/푸시/로그에 raw financial data 금지

## 8. 저장소 통합 작업 기록

사용자는 `salary-hijacking-work`와 `salary-hijacking-main`이 혼재되어 혼선이 생기므로 하나로 합치라고 요청했다.

진행 결과:

- 새 기준 폴더: `C:\Users\PC\Desktop\salary-hijacking-platform`
- 실제 Git repo는 `salary-hijacking-work` 기준으로 복사
- 생성/빌드/캐시성 대형 폴더는 제외:
  - `node_modules`
  - `.tools`
  - `.turbo`
  - `.tmp`
  - `.expo`
  - `.cache`
  - `.gradle`
  - `.cxx`
  - `.next`
  - `.open-next`
  - `dist`
  - `coverage`
  - `build`
  - `Pods`
- `salary-hijacking-main`의 main-only 파일 33개를 platform에 병합
- 충돌 파일 132개는 아래에 보존:
  - `C:\Users\PC\Desktop\salary-hijacking-platform\.merged-from-salary-hijacking-main\conflicts`
- 병합 manifest:
  - `C:\Users\PC\Desktop\salary-hijacking-platform\.merged-from-salary-hijacking-main\merge-manifest.json`
- 통합 안내 파일:
  - `C:\Users\PC\Desktop\salary-hijacking-platform\WORKSPACE_CONSOLIDATION_NOTE.txt`
- 이전 폴더들은 내용물 제거 후 Windows/Codex 프로세스 핸들 때문에 빈 디렉터리 shell만 남음

## 9. 현재 작업 기준 확인

확인된 기준:

- 현재 작업 루트: `C:\Users\PC\Desktop\salary-hijacking-platform`
- Git top-level: `C:/Users/PC/Desktop/salary-hijacking-platform`
- HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
- working tree: dirty
- 주의: platform 통합 과정에서 의존성/빌드 캐시를 제외했으므로 전체 테스트/빌드 전 `pnpm install` 계열 복원이 필요함

## 10. docs 브리핑 결과

`C:\Users\PC\Desktop\salary-hijacking-platform\docs` 기준 문서 158개를 확인했다.

문서 그룹:

- 최상위 구조 문서 5개
- `docs/codex` 16개
- 최상위 기획 문서 7개
- 사용자·시장·전략 문서 8개
- UX/UI 기획 문서 14개
- 기능 기획 문서 17개
- 데이터·DB 문서 9개
- API·백엔드 문서 9개
- 기술 설계 문서 11개
- 보안·개인정보·정책 문서 11개
- QA·테스트 문서 12개
- 운영·관리자 문서 11개
- 출시 문서 8개
- 개발 협업 문서 10개
- governance 문서 3개
- references 3개
- superpowers 문서 2개
- LV UP 콘텐츠 운영 정책 1개

문서상 핵심 방향:

- 한국형 모바일 급여/예산/자기관리 플랫폼
- “이번 월급 중 지켜낸 돈”을 중심 지표로 사용
- 서버 권위 계산
- KRW 정수 처리
- UTC 저장, Asia/Seoul 표시
- 민감 금융정보 보호
- 광고/제휴는 금융 원문 데이터와 분리
- 모바일 앱, API, DB, Admin, Notifications, Scheduler, Release evidence까지 포함하는 플랫폼

## 11. 반영된 것과 덜 반영된 것

### 반영된 것

- 모노레포 구조
- Expo 모바일 앱 구조
- API/DB/Admin/Notifications/Scheduler 패키지 구조
- 모바일 주요 route 구조
- 일부 화면 디자인:
  - splash
  - login
  - salary home
  - plan
  - notifications
- 로고/아이콘 교체 작업 일부
- release evidence/check script 구조
- 개인정보/광고/보안 문서와 일부 테스트
- 서버 권위 원칙 문서화
- APK 빌드 및 서명 검증 이력

### 덜 반영된 것

- 모든 화면의 완전한 반응형 검증
- 실기기 전체 QA
- 키보드 회피 공통 처리
- 메인 화면 설정/세부 항목 수정/추가/저장
- 계획 화면 설정/세부 항목 수정/추가/저장
- 메인과 계획의 날짜 기반 데이터 동기화
- 사용 예정/완료 월별 반복 처리
- KST 날짜/시간 실시간 동기화
- 알림 deep link 이동
- LV UP XP/상태 변경의 완전한 서버 권위 동작
- 커뮤니티 글쓰기/댓글/좋아요/신고의 실기기 E2E 검증
- Admin 운영 플로우 실사용 QA
- Google Play 제출 직전 최종 실기기 QA

## 12. 객관적 완성도 판단

이전 브리핑에서 현재 플랫폼 완성도는 다음처럼 분리해 판단했다.

- 문서상/기획상 완성도: 96%
- release evidence 스크립트 기준 준비도: 약 95%
- 현재 소스 구현 완성도: 72%
- 통합 작업폴더 기준 검증 완료도: 58%
- Google Play 출시 직전 실운영 완성도: 100% 아님

종합 완성도는 거짓 없이 객관적으로 약 72%로 판단했다.

이유:

- 문서와 구조는 매우 풍부하고 넓게 갖춰져 있음
- 모바일 UI도 일부 핵심 화면은 많이 개선됨
- 그러나 사용자가 직접 테스트한 결과 기능 저장, 설정, 동기화, 실기기 안정성, 키보드 대응, 세부 화면 완성도에서 아직 명확한 결함이 있음
- 최신 통합 루트에서 전체 install/typecheck/test/build/APK/logcat 검증이 아직 다시 완료되지 않음

## 13. 현재 남은 핵심 작업

우선순위:

1. `salary-hijacking-platform`에서 의존성 복원
2. 앱 중단 원인 logcat 또는 재현 테스트로 확정
3. splash/login/salary/plan/notifications 기능과 safe area 재검증
4. 메인 화면:
   - 사용 예정/완료 의미 수정
   - 일일 예산 설정
   - 세부 항목 추가/수정/삭제
   - 변동 지출 저장 유지
   - KST 날짜 동기화
5. 계획 화면:
   - 급여/고정지출/고정저축/일일생활비 세부 설정
   - 메인 화면 날짜 기반 동기화
   - 완료/미완료/기한 경과 상태 처리
6. 공통 키보드 회피/반응형 처리
7. 알림 화면 하단 탭 제거 및 deep link 연결
8. 전체 typecheck/test/build/export 검증
9. Android preview APK 재빌드
10. 실기기 설치/실행/logcat QA
11. docs/codex completion log와 release evidence 갱신

## 14. 다운로드/열람 안내

이 파일은 아래 위치에 생성되었다.

`C:\Users\PC\Desktop\salary-hijacking-platform\docs\codex\CONVERSATION_WORK_HISTORY_2026-07-12.md`

Codex/Windows에서 이 Markdown 파일을 열거나, 필요하면 브라우저/에디터에서 바로 확인할 수 있다.
