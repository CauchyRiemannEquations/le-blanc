# 이미지 에셋 적용 — 2026-10-28

사용자가 제공한 7개 이미지 모두 실제 게임에 연결했습니다.

| 에셋 | 적용 위치 |
| --- | --- |
| title-mobile | 모바일/태블릿 타이틀 사진 |
| title-desktop | 900px 이상 타이틀 사진 |
| ceramic-ivory | 공개된 숫자 타일 앞면 |
| lacquer-dark | 비공개 타일, 뒤집는 면, 배분 중 타일 |
| paper-warm | 기본 배경, 질문·공격·결과 시트 |
| felt-oxblood | 타원 테이블 안쪽 표면 |
| walnut-dark | 데스크톱 테이블 테두리 |

원본 Downloads 파일은 변경하지 않았습니다. 크기와 구도를 유지한 WebP(품질 88) 사본을 `public/materials`에 저장했습니다. 합계 18,722,995 → 1,531,012바이트, 약 92% 감소. 출처 파일명·원본 SHA-256·크기는 `public/materials/sources.json`에 기록했습니다.

타이틀의 기존 가상 타일 정물은 사진으로 대체했습니다. 로고·버튼·숫자는 계속 HTML UI이므로 선택과 접근성을 유지합니다. 모든 비공개 타일의 재질 크기·샘플 위치는 동일하며 숨겨진 숫자를 참조하지 않습니다. 게임 규칙과 AI, 서버 코드는 바꾸지 않았습니다.

검증: TypeScript/프로덕션 빌드 성공, Playwright 21개 시나리오 통과. 360×800, 390×844, 320×640, 768×1024, 1440×900 및 작은 공격창을 확인했습니다. 별도 모바일·데스크톱 타이틀/게임판 스크린샷을 직접 검토했습니다. 온라인 에뮬레이터 검증은 이번 재질 변경에서는 다시 실행하지 않았습니다. 기존 Firebase 지연 로드 번들 크기 경고는 남아 있습니다.

GitHub 및 로컬 적용입니다. 기존 요청에 따라 공개 Sites/Firebase 배포는 보류 상태입니다.

확인용 파일: `screenshots/materials-title-mobile.png`, `materials-title-desktop.png`, `materials-board-mobile.png`, `materials-board-desktop.png`.
