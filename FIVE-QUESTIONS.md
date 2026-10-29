# 질문 5종 확장 · 2026-10-29

후속 Carl/Sofya 캐릭터 추가 배포 및 최신 운영 검증은 [SOFYA.md](SOFYA.md)를 참고한다. 아래는 질문 확장 배포 당시의 기록이다.

## 운영 배포 완료 · 2026-10-29

- 운영 주소: https://le-blanc-noir-2026.web.app
- 기존 `le-blanc-noir-2026` 프로젝트에 Functions 5개와 Hosting을 배포했다. 서버 Node 22, 서울 리전 `asia-northeast3`. Firestore 규칙은 변경하지 않았다.
- 기존 운영 웹 앱 설정을 검증한 뒤 무시되는 `.env.production.local`에 적용하고 프로덕션 빌드를 다시 생성했다. 에뮬레이터 모드는 꺼져 있다.
- 운영 `sw.js` HTTP 200 및 캐시 버전 `le-blanc-6708e661cb30`을 확인했다.
- 운영 URL에서 브라우저 검사 **5개 통과**: 새 질문 2종의 서버 답·양쪽 기록·재접속·기권 종료, 568×320 / 844×390 / 1440×900의 상대 질문 강조와 노트 탭, 같은 기기 교대·공격 중단 안내. 시험 대전은 기권으로 종료했다.
- 명령: `firebase-tools deploy --only functions,hosting --project le-blanc-noir-2026 --non-interactive`, `LE_BLANC_TEST_URL=https://le-blanc-noir-2026.web.app LE_BLANC_LIVE_TEST=true playwright test e2e/five-questions-online.spec.ts e2e/journal-readability.spec.ts` (각 CLI는 npx로 실행).
- 실제 모바일 기기·Safari와 이번 배포의 무접속 Cloud Tasks 만료는 추가 검증하지 않았다. GitHub 푸시는 수행하지 않았다.

## 후속 개선: 질문 팝업·턴 교대·추리 노트

- 질문과 턴 전환 팝업을 종이 질감, 갈색 잉크, 이중 테두리의 빈티지 안내장으로 변경했다. 상대 질문 본문은 22~29px 굵은 글씨로, 카드 번호는 테두리 표식으로 표시한다. YES/NO는 작은 도장과 한국어 답변으로 표시하고 다음 플레이어를 함께 안내한다.
- 추리 노트에 `나의 단서 / 상대의 질문 / 대전 기록`을 제공한다. 상대 질문은 내 카드에 관한 공개 기록이라는 설명을 붙였다. 최신 기록부터 표시하고 질문 본문은 17px로 키웠다. 탭·닫기 영역을 유지하면서 기록만 스크롤한다.
- AI·같은 기기·온라인이 `DeductionJournal`과 `SharedQuestion`을 공유한다. 교대 화면과 턴 중단 안내에는 다음 플레이어를 명시한다. 비공개 손패의 관찰 경계와 턴 판정은 변경하지 않았다.
- 주요 파일: `SharedQuestion.tsx`, `DeductionJournal.tsx`, `TurnNotice.tsx`, `App.tsx`, `OnlineGame.tsx`, `dispatches.css`, `main.tsx`.
- 최종 검증: 기존 단위·회귀 테스트 191개, 브라우저 14개(질문 흐름·노트 13개 + 온라인 에뮬레이터 1개), 타입 검사, 프로덕션 빌드 통과. 온라인 첫 검사에서 서버 응답이 5초 검증 대기시간을 넘겨, 비동기 응답 대기를 15초로 조정한 뒤 재검증했다. 이후 운영 배포와 운영 검증은 위 기록처럼 완료했다. 실제 휴대전화 검증은 수행하지 않았다.
- 실제 화면: `screenshots/readable-opponent-question-*.png`, `readable-opponent-journal-*.png`, `vintage-handover.png`, `vintage-turn-notice.png`.

이 채팅의 시작 폴더에는 체크아웃이 없어 GitHub 기본 브랜치 `01ef18acbfd05bdfb736ba4756486747e33847f7`을 `outputs/le-blanc`에 복제해 작업했다. 저장소 내 `AGENTS.md`는 없었다. 기존 다른 작업 폴더는 변경하지 않았다.

## 구현

| 순서 | 이름 | 식별자 | 판정 | N 범위 / 기본값 |
|---|---|---|---|---|
| 1 | 간격 | `distance` | `Math.abs(a - b) <= N` | 1~18 / 3 |
| 2 | 합의 크기 | `sumAtMost` | `a + b <= N` | 3~38 / 20 |
| 3 | 합의 배수 | `sumMultiple` | `(a + b) % N === 0` | 2~10 / 3 |
| 4 | 배수 포함 | `containsMultiple` | `a % N === 0` 또는 `b % N === 0` | 2~10 / 3 |
| 5 | 서로소 | `coprime` | `gcd(a, b) === 1` | 조절 없음 |

합의 크기 범위는 중복 없는 연속 정수 카드 규칙의 `2 * min + 1`~`2 * max - 2`로 계산하고 기본값 20을 유효 범위 안으로 제한한다. 배수 포함은 한 장 또는 두 장 모두 배수이면 예다. 합의 배수와 별개로 판정·기록·중복 검사한다.

## 주요 코드와 연결 경로

- `src/engine/questions.ts`, `types.ts`: 식별자, 메뉴 순서와 설명, 공통 N 범위·기본값·정수 검증, 답 계산, 문구, AI 선택지. `near → distance(3)`, `sum3 → sumMultiple(3)` 정규화와 과거 `multiple`·`ratio` 판정은 유지했다. `multiple`은 여전히 큰 수가 작은 수의 배수인지를 묻는다.
- `src/components/QuestionSheet.tsx`, `src/tabletop/tabletop.css`: 질문 종류 변경 시 기준값과 카드 선택 초기화, 현재 N·범위·선택 카드·최종 문장 표시, 중복 제출 방지. 작은 가로 화면에서 질문 목록을 가로로 스크롤하고 44px 조절·확정 버튼을 유지한다. 700px 이하에서는 손패 버튼과 N 조절 영역이 겹치지 않게 배치했다.
- `src/App.tsx`, `src/components/Tutorial.tsx`, `src/engine/questionParser.ts`: 도움말·튜토리얼과 호환용 문장 해석 갱신. 결과 팝업·대전 기록의 `SharedQuestion`, 추리 노트는 기존 공통 `questionLabel()`을 통해 새 문구를 표시한다. 이전 3종 문서는 과거 기록임을 표시했다.
- `src/ai/inference.ts`: 모든 난이도에 5종 기본 후보를 포함한다. 중급·고급은 모든 허용 N을 평가한다. 예/아니오 후보 필터링과 정보량 평가는 공통 `answerQuestion()`을 사용한다. 같은 숫자 쌍의 빈도를 재사용해 질문 증가 비용을 줄였고, 전체 손패를 직접 평가한 정보량과 같음을 테스트했다. 초급이 기존에 질문 기록을 무시하는 난이도 정책과 숫자·간격 공격 정책은 유지했다.
- 온라인은 `sendOnlineAction → roomCommand → actInRoom → applyAction → validQuestion / canTargetPair / answerQuestion → projectRoom → viewGame`을 사용한다. 서버가 참가자·턴·버전·대상·N을 검증하고 비공개 손패로 답을 계산한다. 클라이언트가 덧붙인 답은 사용하지 않는다. 공유 타입과 엔진이 서버 번들에 포함되므로 별도의 판정 복제나 데이터 변환은 필요하지 않았다.
- `tests/five-questions.test.ts`, `e2e/five-questions.spec.ts`, `e2e/five-questions-online.spec.ts`: 수학적 의미, 중복, 호환 기록, AI, 서버 요청, 터치 UI, 두 브라우저 복원 검증. 기존 질문 테스트와 초급 정책 테스트도 5종 후보에 맞췄다.

기존 방의 저장 구조와 `rules.version: 3`은 유지한다. 새 식별자를 추가하는 변경이며, 업데이트된 서버·클라이언트가 기존 기록을 그대로 읽는다. 배포할 때는 서버와 프런트엔드를 함께 갱신해야 한다. 구버전 클라이언트와 신버전 클라이언트의 혼합 실행은 검증하지 않았다.

## 검증 결과

- `npm test`: 15개 파일, **191개 테스트 통과**. 필수 여섯 판정 사례, 전체 서로 다른 1~20 카드 쌍의 새 판정, 범위·기본값, 역순·반대 문장 중복, 종류별 구분, 잘못된 N·대상·턴·버전 거부, 위조 답 무시, 한 번의 턴 전환, 양쪽 기록·재접속 복원, 과거 별칭·배수 관계·배율을 포함한다. 기존 100개 고정 시드 AI 대전의 합법적 행동·정답 후보 보존·정상 종료도 통과했다.
- `npx tsc -b`, `npx tsc -p functions/tsconfig.json`: 통과. 새 두 E2E 파일도 별도 strict 타입 검사를 통과했다.
- `npm run build`, `npm run build:server`: 통과. 기존 500kB 초과 번들 경고는 남아 있다.
- `VITE_USE_FIREBASE_EMULATORS=true npx playwright test e2e/five-questions.spec.ts e2e/question-touch.spec.ts e2e/public-questions.spec.ts`: **13개 통과**. 568×320, 844×390, 1440×900의 새 두 질문 전체 흐름, N 최소·최대와 초기화, 서로소의 N UI 부재, 카드 터치, 공개 답과 노트, 기존 3D 진입·질문 회귀를 검증했다. 390×844의 가로 회전 안내와 회전 후 조작도 기존 테스트에서 확인했다. 최종 AI 최적화 후 공개 질문 회귀 2개를 다시 통과했다.
- `VITE_USE_FIREBASE_EMULATORS=true npx playwright test e2e/five-questions-online.spec.ts`: **1개 통과**. 실제 로컬 Auth·Firestore·Functions 에뮬레이터와 별도 두 브라우저 세션에서 새 질문을 서로 한 번씩 실행했다. 카드 소유자가 읽은 값으로 서버 답을 독립 확인하고, 양쪽 문장·대상·답·기록 일치, 새로고침 복원, 턴 교대, 기권 종료를 검증했다.
- `node scripts/test-firestore-rules.mjs`: **접근 제어 단언 7개 통과**.
- `git diff --check`: 통과. `screenshots/five-questions-*.png`는 실제 실행 결과이며 대표 모바일·온라인 이미지를 열어 확인했다.

에뮬레이터 첫 시작의 다운로드 인증서 폐기 확인 오류는 인증서 검증을 유지하는 다운로드와 공식 SHA-256 대조로 해결했다. 함수 최초 로딩 시간 초과 후 서버 번들을 다시 빌드해 정상 로딩을 확인한 뒤 온라인 테스트를 실행했다. 테스트에 사용한 손패 닫기 버튼의 잘못된 접근성 이름도 실제 이름으로 수정해 재실행했다.

## AI 응답 시간

`question-performance.json`에 변경 전 HEAD와 최종 코드의 비교를 저장했다. 동일한 관찰·PRNG 시드를 사용하고, 각 공개 설정·난이도별 5회 준비 실행 후 20개 시작 상태를 측정했다. 별도 테스트가 끝난 뒤 측정한 Windows / Node 24 결과이며 실제 모바일 성능을 뜻하지 않는다.

| 조건 | 변경 전 평균 | 최종 평균 | 최종 p95 |
|---|---:|---:|---:|
| 가운데 공개 · 초급 | 0.88ms | 0.65ms | 1.21ms |
| 가운데 공개 · 중급 | 13.78ms | 5.34ms | 6.95ms |
| 가운데 공개 · 고급 | 17.47ms | 9.64ms | 12.68ms |
| 모두 비공개 · 초급 | 6.24ms | 2.50ms | 2.99ms |
| 모두 비공개 · 중급 | 172.70ms | 35.68ms | 46.41ms |
| 모두 비공개 · 고급 | 221.14ms | 68.77ms | 82.75ms |

측정한 최종 최댓값은 87.51ms였다. 질문 후보는 28개에서 73개로 증가했지만 동일 숫자 쌍을 묶어 평가하는 방식으로 이번 표본에서 지연이 줄었다.

## 미확인 범위

- GitHub 푸시는 수행하지 않았다. 수정은 이 체크아웃에 저장되었고 운영 배포는 완료했다.
- 운영 Firebase 실대전·재접속은 배포 후 확인했다. 무접속 운영 Cloud Tasks, 실제 휴대전화 및 Safari는 이번 변경으로 재검증하지 않았다. 모바일 검증은 Chrome 터치·화면 크기 에뮬레이션이다.
- 로컬 Node는 24이고 서버 배포 런타임은 기존 설정의 Node 22다. 배포 후 운영 서버에서 새 질문 두 종류를 실행해 확인했다.
- 기존 개발 서버의 오디오 manifest 경고는 이번 질문 변경 범위에서 수정하지 않았다.
