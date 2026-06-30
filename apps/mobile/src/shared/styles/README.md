# 급여납치 Mobile Shared Styles

## 목적

`apps/mobile/src/shared/styles`는 급여납치 모바일 앱의 디자인 토큰, 색상, 타이포그래피, 간격, radius, shadow, 상태 컬러, 접근성 대비, 반응형 규칙을 정의한다. 모든 화면은 동일한 브랜드 경험과 금융 서비스 수준의 신뢰감을 제공해야 한다.

## 디자인 방향

- 다크 기반의 고대비 금융 앱 UI
- 급여/예산의 긴장감과 LV UP의 성취감을 동시에 표현
- 핵심 CTA는 명확하고 터치하기 쉬운 형태
- 금액과 상태는 과도한 자극 없이 정확하게 표시
- 광고/제휴는 본문 콘텐츠와 시각적으로 구분
- 오류와 경고는 색상뿐 아니라 텍스트로 의미 전달

## 권장 디렉터리 구성

```text
shared/styles/
  README.md
  tokens.ts
  colors.ts
  typography.ts
  spacing.ts
  radius.ts
  shadows.ts
  layout.ts
  accessibility.ts
  themes.ts
  __tests__/
```

## 색상 토큰

```text
background.primary     #020617
background.surface     #0f172a
background.elevated    rgba(255,255,255,0.04)
text.primary           #ffffff
text.secondary         #cbd5e1
text.muted             #94a3b8
brand.primary          #67e8f9
success                #86efac
warning                #fde68a
danger                 #fecdd3
info                   #bfdbfe
border.default         rgba(255,255,255,0.12)
privacy.safe           rgba(16,185,129,0.14)
ad.disclosure          rgba(251,191,36,0.14)
```

## 타이포그래피

- 화면 제목: 24~30, weight 900
- 섹션 제목: 18~22, weight 900
- 본문: 13~15, line-height 19~22
- 보조 문구: 11~13, weight 700~900
- 금액 표시: weight 900, 숫자 가독성 우선
- 오류/경고: 짧은 한국어 문장, 상태 텍스트 포함

## 간격과 형태

- 기본 화면 padding: 16~20
- 카드 padding: 14~18
- 컴포넌트 gap: 8~14
- 터치 최소 높이: 44
- 주요 카드 radius: 20~28
- pill radius: 999
- border width: 1

## 상태 컬러 의미

```text
success: 완료, 안전, 서버 확정
warning: 예산 초과 임박, 검토 필요, 인증 필요
critical/danger: 차단, 실패, 계정 제한, 삭제 위험
info: 안내, 학습, 중립 정보
privacy: 민감 데이터 보호 상태
ad: 광고/제휴 표시
```

## 접근성 기준

1. 텍스트 대비는 WCAG AA 수준을 목표로 한다.
2. 색상만으로 상태를 전달하지 않는다.
3. 중요 액션은 최소 44px 터치 영역을 제공한다.
4. disabled 상태는 opacity와 텍스트로 함께 표현한다.
5. skeleton과 loading은 화면 낭독 시 의미 있는 label을 제공한다.
6. 금액은 screen reader에서 원 단위로 읽기 쉬운 문자열을 제공한다.

## 반응형 기준

- 작은 모바일 화면에서는 단일 컬럼 카드 흐름을 기본으로 한다.
- 넓은 화면이나 태블릿에서는 2열 카드 배치를 허용한다.
- 하단 탭과 주요 CTA는 엄지 조작 영역을 고려한다.
- 긴 커뮤니티/알림/지출 목록은 가상화 또는 페이지네이션을 사용한다.
- safe area와 keyboard overlap을 항상 고려한다.

## 개인정보/광고 UI 규칙

- 개인정보 보호 상태는 `Privacy Guard` 또는 동등한 UI로 표시할 수 있다.
- raw 금융 데이터 미노출, raw 개인정보 미노출, raw 푸시 토큰 미노출, 금융 광고 타겟팅 미사용 상태를 개발/검수에서 확인 가능해야 한다.
- 광고와 제휴는 `광고`, `제휴` 라벨을 명확히 표시한다.
- 광고 카드가 급여/지출/저축 금액과 시각적으로 결합되어 타겟팅처럼 보이지 않도록 분리한다.

## 기능별 스타일 가이드

- 급여 홈: 가장 높은 정보 위계, 요약 카드, 안정적인 색상
- 계획: 입력 폼과 서버 재계산 결과를 분리
- 예산: 남은 금액, 초과 상태, 오늘 기준을 명확히 표시
- 지출: 카테고리, 날짜, 삭제 위험 액션을 구분
- 저축: 목표 달성률과 자동 저축 상태를 긍정적으로 표시
- 알림: 읽음/안읽음 차이를 명확히 표시
- LV UP: 성취, streak, XP를 가볍고 동기부여되게 표시
- 커뮤니티: 익명성, 신고, 검토 상태를 신뢰감 있게 표시
- 프로필: 보안/개인정보 설정 접근성을 높게 유지

## 테스트 완료 기준

- 토큰 import 순환 없음
- 모든 색상 토큰 사용처 타입 검증 통과
- 접근성 대비 검수 통과
- 작은 화면/일반 화면/태블릿 레이아웃 검수 통과
- 광고/제휴 라벨 시각 구분 검수 통과
- 로딩/오류/오프라인/점검 상태 스타일 검수 통과
- Expo iOS/Android 스냅샷 또는 시각 QA 통과

## 완료 판정

이 README는 `shared/styles` 계층이 문서상·이론상 갖춰야 할 디자인 토큰, 접근성, 반응형, 상태 표현, 개인정보/광고 UI 기준을 정의한다. 실제 운영 완성도는 토큰 구현, 전체 화면 적용, 디바이스별 시각 QA, Expo 빌드, E2E/QA 통과 후 확정된다.
