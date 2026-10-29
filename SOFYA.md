# Sofya 캐릭터 추가

## 운영 배포 완료 · 2026-10-29

- https://le-blanc-noir-2026.web.app 에 Hosting 및 Functions 5개 배포 성공.
- 운영 `sw.js`와 Sofya 이미지 HTTP 200, 캐시 버전 `le-blanc-bac268dacecf` 확인.
- 운영 URL 브라우저 검사 **8개 통과 (43.4초)**: 캐릭터 3개, 실제 온라인 두 브라우저 1개, 질문·노트·교대 화면 4개. 시험 방은 기권으로 종료했다.
- 명령: `LE_BLANC_TEST_URL=https://le-blanc-noir-2026.web.app LE_BLANC_LIVE_TEST=true npx playwright test e2e/characters.spec.ts e2e/five-questions-online.spec.ts e2e/journal-readability.spec.ts` (환경 변수는 PowerShell 방식으로 설정).
- GitHub 푸시는 수행하지 않았다. 현재 체크아웃과 운영 사이트에 반영되어 있다.

## 동작

- AI 대전은 내 성별을 남자/여자로 선택하며, 남자를 고르면 Sofya(여성), 여자를 고르면 Carl(남성)이 상대가 된다. 선택은 대전 중 유지되며 난이도와 추리 정책에는 영향을 주지 않는다.
- AI 차례 문구는 `Carl이 생각 중입니다...` / `Sofya가 생각 중입니다...`이다.
- 친구 대전은 각 참가자가 자신의 남성·여성 외형을 선택한다. 표시 이름은 참가자가 입력한 이름을 그대로 사용한다. 같은 기기 모드도 두 자리의 외형을 각각 선택한다.
- 온라인 서버가 외형 값을 검증하여 방과 게임 상태에 저장한다. 양쪽 개인 뷰와 재접속에서 유지되며, 예전 방과 저장 데이터는 남성 외형으로 읽는다.
- 외형은 공개 표시 정보이며 AI 관측 정보에 포함하지 않는다.
- 얼굴이 위쪽으로 잘리는 기존 인물 위치와 카메라, 이름표 위치를 유지한다. 사용자 확인에 따른 의도적인 구도다.

## 주요 파일

- `src/engine/characters.ts`: 공통 이름·조사·외형·이미지 경로, 무작위 선택과 입력 검증.
- `src/App.tsx`, `src/components/AppearancePicker.tsx`, `src/components/OnlineGame.tsx`, `src/characters.css`: AI 선택·안내, 친구 외형 선택 UI.
- `src/engine/game.ts`, `src/engine/types.ts`, `src/online/types.ts`, `src/online/client.ts`, `functions/src/domain.ts`, `functions/src/index.ts`: 외형 전달·서버 검증·저장·복원.
- `src/tabletop/model.ts`, `src/tabletop/Scene.tsx`, `src/tabletop/Tavern.tsx`, `src/tabletop/Tabletop.tsx`: 상대 자리의 실제 초상화 표시, 간소화 화면에도 동일 이미지 적용.
- `public/materials/sofya-portrait.png`: 생성된 투명 배경 원본, 1,622,840 bytes. 기존 Carl 파일은 유지한다.

## 검증

- `npm test`: 196개 통과. 두 자리의 외형, AI 관측 경계, 서버 외형 검증·직렬화·재접속·기존 데이터 호환 포함.
- `npx tsc -b`, `npx tsc -p functions/tsconfig.json`: 통과.
- `npm run build`, `npm run build:server`: 통과. 기존 대형 번들 안내는 남아 있다.
- 캐릭터 브라우저 검사 3개 통과: Carl/Sofya 이름·생각 중 문구·실제 이미지 로드, 568×320 친구 선택 UI, 같은 기기 외형.
- 기존 질문 팝업·추리 노트·교대 화면 검사 4개 통과.
- Firebase 에뮬레이터의 두 브라우저 온라인 검사 1개 통과: 서로 다른 외형, 사용자 이름 유지, 두 새 질문, 양쪽 기록, 재접속 후 외형 유지.
- 자동 검사 중 브라우저 가시성 변화로 같은 기기의 개인정보 보호 교대 화면이 열린 사례는 실제 준비 버튼을 누르는 경로로 검사에 반영했다.
- 실제 휴대전화에서의 직접 조작은 미실시. Chrome의 가로 모바일 뷰포트에서 검증했다.

## 이미지 생성 기록

도구: 내장 `image_gen` (CLI/API 우회 사용 없음). 기존 `public/materials/karl-portrait.webp`는 구도·광원·화풍 참조로 사용했다. 실존 인물의 초상 재현이 아닌, 이름을 기리는 가상 캐릭터다. 생성 결과의 투명도를 그대로 유지해 프로젝트로 복사했다.

최종 자산 SHA-256: `df6214cadb445baef1c4a79e78adac16560bd9451fdaf2f8790f9331538dddda`.

사용한 프롬프트:

> Use case: stylized-concept. Create a NEW female companion character named Sofya for a vintage mathematical deduction card game in a dim 19th-century European tavern. Image 1 is a composition, lighting and realism reference ONLY, do not reproduce the man's identity. One adult woman around 35, intelligent calm expression, direct gaze toward player, subtly wavy dark brown hair pinned up, period high-neck ivory blouse, dark warm-brown tailored wool jacket and understated burgundy waistcoat or dress, a small antique brooch. Match the reference's seated frontal pose, complete head and shoulders, torso down through lap, hands resting low at the sides. Centered silhouette with tiny clear margin above head, same near-square wide composition and scale as reference. Warm amber candle illumination from image left, restrained cinematic realism, natural face and fabric texture. Genuine transparent background with clean alpha silhouette, no scenery, no chair back extending past silhouette, no table, no cards, no lettering, no watermark. This is an original fictional character, her name honors a female mathematician; no historical likeness required.


2026-10-29 후속: AI 대전은 내 성별을 남자/여자로 선택하고 상대를 반대 성별로 고정한다. 무작위 상대 선택은 더 이상 적용하지 않는다.
