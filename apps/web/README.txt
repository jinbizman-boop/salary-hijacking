급여납치 소개 홈페이지 - 정적 HTML 패키지

1. 로컬 확인
   - index.html을 브라우저에서 직접 열면 됩니다.
   - 모든 CSS/JS/이미지는 상대경로이므로 별도 서버 없이도 표시됩니다.

2. 배포
   - 폴더 전체를 웹 루트에 업로드합니다.
   - 정적 페이지 파일명은 index.html, privacy.html, terms.html, support.html, partners.html 입니다.
   - 운영 라우터가 /privacy, /terms, /support, /partners 형태를 사용한다면 각 HTML에 rewrite를 연결하면 됩니다.

3. 제휴 문의 폼
   - 정적 패키지이므로 서버에 개인정보를 저장하지 않습니다.
   - 제출하면 사용자의 이메일 프로그램에서 support@salaryhijacking.com 수신 메일을 작성합니다.

4. 콘텐츠/자산
   - 프로젝트의 급여납치 앱 로고와 실제 Stitch 앱 화면 시안을 로컬 assets에 포함했습니다.
   - 외부 CDN/폰트/스크립트 의존성이 없습니다.
