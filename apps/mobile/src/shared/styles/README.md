# 급여납치 Mobile Shared Styles

## 목적

`apps/mobile/src/shared/styles`는 급여납치 모바일 앱의 공통 디자인 토큰, 화면 컴포넌트, 접근성 기준, 개인정보/광고 표시 기준을 정의한다. 현재 출시 우선 UI 방향은 `Salary Hijacking Clean Fintech v1`이다.

## 디자인 방향

- 토스처럼 큰 숫자와 짧은 문장으로 금융 상태를 즉시 이해하게 한다.
- 당근마켓처럼 커뮤니티와 생활 루틴 화면은 친근하고 가볍게 보이게 한다.
- 홈 첫 화면은 사용자가 얻는 가치인 `이번 달 내가 지켜낸 돈`을 가장 먼저 보여준다.
- 카드형 요약, 명확한 CTA, 낮은 정보 밀도, 8pt 간격 체계를 우선한다.
- 광고/제휴는 핵심 금융 정보보다 아래에 두고 `제휴/광고` 라벨을 표시한다.

## 핵심 토큰

```text
theme.name              Salary Hijacking Clean Fintech v1
font.family             var(--font-presentation), Presentation, Pretendard, Noto Sans KR, system-ui
brand.primary           #209252
brand.secondary         #2FA86A
brand.soft              #EAF6EF
brand.dark              #12663A
surface.app             #F7F8FA
surface.card            #FFFFFF
surface.line            #E7EBEF
surface.lineSoft        #EEF0F2
text.primary            #202327
text.secondary          #4B535B
text.muted              #6D737A
text.disabled           #ADB3B8
semantic.danger         #D74B4B
semantic.warning        #F7D34D
bottomTab.height        76
touchTarget.min         44
```

## 공통 컴포넌트

- `salaryHijackingTheme`: 색상, 간격, radius, typography, shadow, layout 토큰
- `appIcons`: 아이콘 라이브러리 미사용 시 적용하는 이모지 fallback
- `CleanFintechScreen`: 급여, 계획, LV, 알림, 커뮤니티, MY, 로그인 공통 화면
- `CleanFintechSplashScreen`: 스플래시/앱 진입 화면
- `CleanFintechSignupScreen`: 회원가입 화면
- `CleanFintechWriteScreen`: 글쓰기 화면
- `CleanFintechLevelDetailScreen`: 독서, 뉴스, 영어, 건강 상세 루틴 화면
- `CleanFintechPostDetailScreen`: 커뮤니티 게시글 상세 화면

## 화면별 기준

- 급여 홈: `이번 달 내가 지켜낸 돈`, 오늘 예산, 수령/지출/납치금액, 고정지출, 변동지출, 지출 추가
- 계획: 목표 달성률, 급여 계획, 고정지출, 고정저축, 생활비, 목표금액을 카드형 UI로 제공
- 알림: 중요 알림과 루틴 알림을 분리하고 읽지 않은 항목은 green dot 또는 soft green 배경으로 표시
- LV UP: 현재 레벨, XP progress, 독서/뉴스/영어/건강 미션 카드, 완료 toast
- LV 상세: 카테고리 pill tabs, 진행률 요약, 콘텐츠 리스트, 광고는 중간 이하
- 커뮤니티: 전체/자유/레벨업 인증/취미 탭, 인기글, 게시글 리스트, 하단 FAB 글쓰기
- 글쓰기: 제목, 본문, 게시판, 익명, 질문, 첨부 옵션과 필수 검증
- MY: 프로필, 누적 납치금액, 레벨업 현황, 자기관리 성과, 관리 메뉴

## 접근성 기준

1. 모든 주요 터치 영역은 최소 44px 이상이어야 한다.
2. 금액 숫자는 screen reader용 label 또는 읽기 쉬운 텍스트를 제공한다.
3. 예산 초과는 빨간색뿐 아니라 `예산 초과` 텍스트로도 전달한다.
4. 탭과 선택 가능한 pill은 선택 상태를 제공한다.
5. 숫자 입력은 numeric keyboard와 음수/소수 입력 방지를 기본으로 한다.

## 개인정보/광고 UI 규칙

- raw 금융 데이터, raw 개인정보, raw 푸시 토큰은 광고/분석/로그/푸시 payload에 넣지 않는다.
- 광고와 제휴는 contextual-only를 기본값으로 한다.
- 금융 금액 기반 광고 타겟팅은 금지한다.
- 개발/검수 화면에는 필요 시 `serverAuthority=true`, `rawFinancialData=false`, `adsFinancialTargeting=false` 같은 guard 문구를 노출할 수 있다.

## 완료 판정

이 문서는 모바일 스타일 계층의 문서상 기준이다. 실제 운영 완성도는 전체 화면 적용, 모바일 360~430px 시각 QA, native E2E, EAS 빌드, 스토어 제출 검수, production API/DB/secret 검증까지 통과한 뒤 별도로 판단한다.
