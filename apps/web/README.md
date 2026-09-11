# 급여납치 공식 홈페이지

## 구성

첨부된 기업형 홈페이지 HTML 패키지의 반응형 레이아웃, 카드 기반 콘텐츠 구조와 접근성 패턴을 활용해 급여납치 브랜드와 서비스 정보구조로 전면 재작성한 홈페이지입니다.

메인 페이지는 별도 메뉴트리 없이 아래 순서로 스크롤됩니다.

1. 메인 배너
2. 급여납치가 필요한 이유
3. 핵심 기능
4. 급여 관리 흐름
5. LV UP
6. 커뮤니티
7. 제휴 혜택 및 문의 남기기
8. 정책·지원·회사정보 푸터

## 실행

### 가장 간단한 확인

`index.html`을 브라우저에서 직접 엽니다.

### 권장 로컬 서버

- Windows: `start-salary-hijacking-preview.bat`
- macOS·Linux: `./start-salary-hijacking-preview.sh`
- 직접 실행: `python3 serve.py`

기본 주소는 `http://127.0.0.1:8080/index.html`입니다.

## 문의 양식 동작

제휴 문의 양식은 production API의 `POST /api/v1/public/partnership-inquiries`로 전송됩니다. 브라우저 임시 저장을 사용하지 않으며, 운영 서버는 입력 검증, 스팸 방지용 숨김 필드, 운영 큐 적재와 안전한 오류 응답을 담당합니다.

## 상대경로·외부 의존성

- 모든 내부 HTML·CSS·JavaScript·이미지는 상대경로입니다.
- 외부 CDN, 웹폰트, 원격 이미지, 분석 스크립트를 사용하지 않습니다.
- 패키지 폴더를 다른 위치로 이동해도 내부 링크가 유지됩니다.

## 검증

```bash
python3 tests/validate_site.py
node tests/site.test.js
python3 tests/browser_smoke.py
```

브라우저 스모크 테스트는 Python Playwright와 시스템 Chromium을 사용합니다.

## 포함 보고서

- `IMPLEMENTATION_REPORT.md`: 적용 요구사항과 구현 내역
- `QA_REPORT.md`: 정적·단위·Chromium·반응형 검증 결과
- `qa-results.json`: 브라우저 테스트 원본 결과
- `qa-screenshots/contact-sheet-compact.png`: 주요 섹션 요약 이미지
