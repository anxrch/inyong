# 인용 이미지 생성기
바이브 코딩에 손코딩이 10% 정도 들어갔습니다..
Made with Claude Code

<img width="2504" height="1944" alt="2026-01-29 15 26 07 inyong-6o5 pages dev fa9b54f4f2ea" src="https://github.com/user-attachments/assets/19f7ae41-daa5-4f0e-9392-6ab83bd80483" />

## Cloudflare Pages 배포

이 프로젝트는 빌드 없이 정적 파일 그대로 배포할 수 있습니다.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages**.
2. Git 저장소를 연결하고 프로젝트를 선택합니다.
3. 빌드 설정:
   - **Build command**: _(비워두기)_
   - **Build output directory**: `.`
4. 배포 후 발급된 HTTPS 도메인으로 접속합니다.

### OAuth 사용 시 주의사항

- Mastodon/Misskey OAuth 콜백 URL은 현재 접속한 페이지 주소(`origin + pathname`)를 사용합니다.
- 배포 도메인에서 처음 로그인하면 세션에 계정 토큰이 저장됩니다.
- 보안 강화를 위해 액세스 토큰은 `localStorage`가 아닌 `sessionStorage`에만 저장됩니다.
  - 브라우저 탭/세션 종료 후에는 다시 로그인해야 합니다.
