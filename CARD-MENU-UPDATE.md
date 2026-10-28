# 카드 디자인·메뉴 정리 — 2026-10-28

## 반영

- 메인은 **솔로 모드 / 듀얼 모드**. 이어하기는 솔로 내부에만 유지한다.
- 메인, 솔로 스테이지, 듀얼 종류, AI 난이도는 동일한 왼쪽 기준선과 행동 영역을 쓴다. 로고는 유지하고 하단 선택만 바뀐다. 가로 800×360, 844×390, 1440×900에서 좌표와 전체 버튼 노출을 검증한다.
- 슬로건, A GAME OF RELATIONS, LE BLANC / 01, 역사 소개, 불필요한 메뉴 부연 문구를 제거했다. 실제 규칙·오류·개인정보 가림 안내·퍼즐 단서는 유지한다.
- 기본 AI는 모든 난이도에서 가운데 카드 공개. 전역 설정에서는 공개 옵션을 제거한다. 기존 음소거·동작 줄이기 설정은 유지하고 예전 `initial` 설정은 읽지 않는다.
- 친구 대전은 온라인 방 만들기와 같은 기기 준비 화면에서 가운데 카드 공개를 선택한다. 온라인은 서버 RoomState에 저장하며 참가 시 게임 규칙으로 반영하고 두 참가자 뷰에 투영한다. 기존 방은 공개 기본값을 적용하며, 이미 시작한 방은 실제 게임 규칙을 따르고 변경하지 않는다.
- M. NOIR는 별도 역사적 인물 설정 없이 쓰던 분위기용 이름이었다. 사용자 요청에 따라 가우스의 이름에서 **카를**을 가져왔다. 캐릭터가 가우스 본인이라는 설정은 추가하지 않았다.
- 내 탁상 카드의 앞면 방향은 상대를 향한다. 원래 슬롯·순서를 유지한다. 개인 확인 시 비공개 카드만 나에게 돌려 보여주고, 공개된 카드는 원래 방향을 유지한다. 솔로 참고 카드는 플레이어를 향한다.
- LB 모노그램을 없애고 두 타원·중앙 마름모·네 점으로 만든 공통 뒷면 SVG를 3D 카드, 실제 카드 크기의 소품 더미, 2D 폴백에 공유한다.
- 앞면은 기존 Georgia 숫자 스타일을 유지하며 황갈색 종이 바탕과 짙은 숫자를 사용한다. 6·9에는 밑줄을 유지한다. 메뉴/도움말의 밝은 바탕도 조금 진하게 했다.
- 메인 그림은 기존 구도·촛불·나무 질감을 유지하면서 새 뒷면 문양과 숫자 4·12·17을 넣었다. 원본 v2도 보존한다.

## 자산

- `public/materials/card-back.svg`: 직접 작성한 벡터 문양. 정적 자산이며 비공개 숫자와 무관하다.
- `public/materials/title-tavern-v3.webp`: OpenAI imagegen 편집 모드. 기존 v2와 직접 작성한 카드 참조 이미지를 입력했다. 생성 PNG 원본은 Codex generated_images에 보존하고 Pillow로 포맷만 WebP 변환했다. 실시간 이미지 생성 호출은 없다.
- 카드 참조 생성: `node scripts/card-reference.mjs` (4173 개발 서버 필요).
- 이미지 편집 프롬프트:

> Edit target: first image, the existing LE BLANC tavern main-menu illustration. Second image is the exact new card design reference only, not a layout reference. Preserve the first image's wide landscape composition, candle, card case, wood grain, burgundy cloth, warm amber illumination, quiet dark left 40 percent for live UI, and painterly realistic quality. Change ONLY the cards: all card backs must match the reference's deep oxblood surface, fine double gold rectangular border, two perpendicular intersecting ellipses, central thin diamond with small filled diamond, four tiny nodes. No LB, letters, extra occult diagrams or arbitrary ornaments. The three face-up cards must have muted darker warm parchment fronts with a simple fine double border and one large elegant dark bold serif Arabic number centered: 4, 12, and 17, each on a different card. No abstract face graphics, no letters or logo, no suit symbols, no corner numbers, no words. Cards have matching rectangular proportions roughly 2:3, subtle thickness and natural photographic perspective. The right-hand stack top uses the same exact new back design. Keep everything else as close as possible to the existing art. The output is the full illustration, not a comparison sheet and not a UI screenshot.

그림의 조명·질감·원근은 일러스트이므로 실시간 3D와 픽셀 단위로 같지는 않다. 문양과 앞면 숫자 체계를 통일했다.

## 검증

- Vitest **105개 통과**: 기존 고정 시드 100판, 솔로 6개 논리 검증, 온라인 도메인, 추가 공개 설정·카드 방향 검증 포함.
- Playwright **43개 통과**: 대전 질문·연쇄·벌칙·교대·타이머, 솔로 6개 완주·저장·힌트·이어하기, 모바일/데스크톱, 온라인 두 브라우저의 비공개 시작·질문 비밀·재접속·연쇄·결과 포함.
- 새 메뉴 위치는 실제 버튼 좌표로 검증한다. 스크린샷을 직접 검토해 난이도 열 배치와 온라인 입력란 위치를 추가 수정했다. 해당 7개 시나리오도 재실행하여 모두 통과했다. 솔로 메뉴 통합 뒤 메뉴·솔로 12개 시나리오를 추가 재실행해 모두 통과했다.
- 프론트 TypeScript/프로덕션 빌드, 서버 번들 및 서버 TypeScript 통과.
- PWA 캐시 후 오프라인 새로고침, 3D 카드/탁자와 선택형 질문·답 확인 통과.
- Firestore 보안 규칙 **7개 단언 통과**.
- 운영 배포는 하지 않았다. 실제 휴대폰과 운영 Firebase는 미검증. 온라인 검증은 로컬 에뮬레이터와 격리된 Chrome 브라우저 두 개다. 기존 큰 Three/Firebase 청크 경고는 남아 있다.

## 실행

`npm run dev -- --port 4173` → http://127.0.0.1:4173/

온라인 로컬 서버는 ONLINE-UPDATE.md를 따른다. 이 환경에서 Java 경로는 `../../work/java21/jdk-21.0.12.1+1-jre/bin`이다. Windows PATH에 이 경로를 추가한 터미널에서 에뮬레이터를 실행한다.

화면: `screenshots/cards-title-844.png`, `cards-mode-844.png`, `cards-difficulty-844.png`, `cards-board-1440.png`, `cards-peek-1440.png`, `cards-online-setup-800.png`.
