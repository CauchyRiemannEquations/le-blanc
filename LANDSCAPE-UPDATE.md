# 가로 탁상 화면과 메인 키 아트 · 2026-10-28

운영 배포 없이 현재 작업 트리에 통합했다. 게임 규칙·스테이지 데이터·저장 형식은 이번 시각 작업에서 변경하지 않았다.

## 바뀐 경험

- 메인·모드·난이도·솔로 목록·튜토리얼·결과를 가로 화면 우선으로 정리했다. 세로 브라우저에서도 실행할 수 있다. PWA manifest는 landscape를 요청하지만 일반 브라우저의 방향을 강제로 잠그지는 않는다.
- 메인은 별도로 생성한 선술집 정물 키 아트를 사용한다. 촛불·카드 케이스·암호 카드를 오른쪽에, 실제 로고·버튼을 왼쪽에 배치했다. 메인에서 WebGL을 로드하지 않는다.
- 대전은 처음부터 전체 화면의 3D 탁자다. 기존 Canvas 안에서 카드 뭉치에서 슬롯으로 배분하며, 배분 종료 때 새 게임판으로 교체하지 않는다. 로컬 교대는 배분 후 불투명 가림을 유지한다.
- 질문·공격 도구는 탁자 위에 떠 있다. Canvas, 카메라, 카드 크기·위치와 내 숫자 확인 상태를 유지한다. 숫자 선택은 화면 하단의 가로 스크롤 띠이며, 제출은 별도 버튼이다.
- 실제 카드 위의 투명 접근성 버튼을 활성 대화상자 안으로 포털 이동한다. 게임판을 중복 생성하지 않으면서 키보드 포커스와 타일 선택을 유지한다.
- 별도 내 패 숫자 목록을 제거했다. 가까운 3D 카드 자체로 확인한다. 공개된 카드는 계속 앞면이며 행동 확정·교대·탭 숨김 시 개인 확인을 닫는다.
- 솔로도 같은 고정 카메라에 숫자·메모·질문 도구를 띄운다. 제외 숫자 페이지 넘김은 숫자 입력과 겹치지 않게 둔다.
- 애니메이션은 표현만 담당한다. 간격 사용 여부, 벌칙, 승패, 서버 시각은 기존 엔진이 결정한다. 연속 공격·도구 열기로 턴 마감 시각을 늘리지 않는다.

## 디자인 파일

[Figma — Landscape Tavern](https://www.figma.com/design/mvAvNdfuy4m1GzypWTX3sx?node-id=22-89)

기존 세로 페이지를 보존하고 `02 · Landscape Tavern`에 844×390 / 1440×810 각각 10개 프레임을 추가했다. 기존 타일·버튼 컴포넌트와 색상 토큰을 재사용했다. 메인 이미지만 래스터 자산이며 로고, 메뉴와 게임 UI는 편집 가능한 레이어다. Figma 게임 프레임은 배치 명세이며 실제 3D 렌더링은 로컬 구현에서 확인한다.

## 키 아트

- 생성: 이 대화의 OpenAI image generation 도구. 외부 유료 서비스 의존성 없음.
- 파일: `public/materials/title-tavern-v2.webp`, 1672×944, 165,348 bytes.
- 원본 PNG는 Codex generated_images 폴더에 보존. 배포용 사본만 Pillow로 WebP 인코딩했다.
- 숫자·글자·UI가 없는 정물 그림이다. 게임 숫자와 무관하며 플레이 중 생성 API를 호출하지 않는다.

프롬프트:

> Landscape main-menu key art for LE BLANC, an intimate numerical deduction card game in a quiet French tavern. Cinematic painterly yet physically convincing, wide 16:9. Low seated viewpoint diagonally across a dark walnut table. Right two-thirds: thick ivory and deep oxblood cipher cards, burgundy felt, restrained brass linework, aged candle holder with warm candle, almost-closed wooden card case, smoky background and empty shadowed chair. Loose intriguing arrangement, not gameplay rows or a screenshot. Blank ivory or abstract geometric markings only: no numbers, letters, logo, UI or watermark. Left 40 percent: low-detail warm charcoal shadow with subtle wood grain for real logo and menu. Amber light, burgundy, ivory, restrained chiaroscuro, tactile materials. No people or hands, no neon or fantasy spectacle.

## 검증

- Vitest: 7개 파일, 103개 테스트 통과.
- 솔로 6개 대표 풀이를 새 화면에서 모두 3성 클리어. 오답·메모·힌트 저장/이어하기, 연쇄 중 잠금과 새로고침 복구 확인.
- 가로 800×360, 844×390, 1440×900에서 메인 그림 로딩, 동일 Canvas 유지, 질문/공격 전후 카드 좌표 일치, 내 숫자 확인 유지, 입력과 카드 분리 확인.
- 세로 320×568, 360×800, 390×844에서도 숫자 입력과 클리어 흐름 확인.
- 실제 캡처를 열어 메인, 질문, 공격, 솔로 화면을 검토했다. 대표 캡처는 `screenshots/landscape-*`에 있다.
- TypeScript 및 Vite 빌드 성공. 기존 Three/Firebase 분할 청크에 500 kB 경고가 남는다.

- Playwright 최종 검사: 가로·솔로 12개 + 일반 대전·타이머 23개 + 온라인 1개 = 서로 다른 36개 시나리오 통과. 솔로 단서 넘김 버튼 위치 수정 후 가로 2개를 추가 재검증했다.
- 온라인은 실제 로컬 Firebase 에뮬레이터와 독립 브라우저 두 개로 질문 비공개, 재접속, 간격 사용 유지, 같은 턴 연쇄, 기권 승리까지 확인했다. 첫 검사에서 배분 완료 전 차례를 고르던 테스트의 경쟁 상태를 수정한 뒤 통과했다.
- 운영용 빌드의 서비스 워커 설치 → 오프라인 재접속 → 실제 3D 대전 → 직접 질문과 응답을 확인했다. 페이지 오류 없음. 캐시 162개 파일.
- 초기 반복 중 대체 화면과 CSS 우선순위 오류를 발견해 수정했다. 최종 결과만 통과로 기록했으며, 실기기 검증으로 해석하지 않는다.

## 실행과 한계

`npm run dev -- --port 4173` → http://127.0.0.1:4173/

`npm test`, `npm run build`, `npx playwright test`를 사용한다. 온라인 브라우저 테스트는 Firebase 에뮬레이터와 `VITE_USE_FIREBASE_EMULATORS=true`가 필요하다.

실물 휴대폰·Safari의 GPU 성능과 설치형 PWA 방향 전환은 확인하지 않았다. 화면 검증은 Windows Chrome의 뷰포트 변경으로 수행했다. 운영 서버 배포나 실제 Firebase 클라우드 매칭은 이번 범위에 포함하지 않았다.
