# 르블랑 음성 구현 · 2026-10-29

## 게임에서 달라진 흐름

질문 확정 → 질문자 쪽 말풍선과 음성 → 답변자 쪽 말풍선과 음성 → 기존 YES/NO 결과 팝업.

- 확정된 엔진/서버 이벤트만 사용한다. 질문 선택이나 카드 선택만으로는 말하지 않는다.
- 음성이 켜져 있으면 실제 재생 시작·종료에 맞춰 말풍선을 진행한다. 음성을 끈 경우에는 짧은 읽기 시간만 적용한다. `결과 바로 보기`와 Escape로 즉시 넘길 수 있다. 턴 판정과 제한시간은 기존 규칙을 따른다.
- 음성은 부가 기능이지만, 켜진 대사를 다운로드가 늦다는 이유로 생략하지 않는다. 650ms 폐기 제한을 제거했다. 질문 선택 중 대상·질문과 양쪽의 기본 답변을 미리 준비하고, 준비 후 말풍선과 함께 끝까지 재생한다. 정적 파일 다운로드는 실패 시 한 번 재시도한다. 계속 실패하면 조용히 넘어가지 않고 다시 재생할 수 있도록 표시한다. 사용자는 언제든 결과 바로 보기를 선택할 수 있다.
- 현재 질문과 카드 위치를 크게 표시하며, 답변 중에도 직전 질문이 남는다. 대전 기록과 추리 노트의 공개 정보는 유지한다.
- 게임 화면에는 Carl / Sofya만 표시한다. Carl은 종대, Sofya는 아엘이다. AI 대전 메뉴는 남자/여자만 선택하며, 미리듣기와 소개 문구는 표시하지 않는다. 선택한 성별의 반대 캐릭터가 상대가 된다. 친구 모드는 남성/여성 외형에 목소리가 함께 연결된다. 같은 목소리 두 명도 지원한다.
- 설정에서 다음 대전의 내 캐릭터 목소리, 전체 대사/상대 대사만/끄기, 음성 음량을 선택한다. 기본 대사 설정은 끄기이며, 기존 음소거 설정을 존중한다. 목소리 미리듣기는 사용자 조작으로 오디오를 활성화한다.
- 음성 재생 중 BGM을 낮추고 종료·건너뛰기·음소거·화면 이탈 시 복원한다.

## 확인한 게임 규칙과 데이터

카드는 1~20, 중복 없이 각 5장, 위치는 내부 0~4 / 화면 1~5번이다. 음성의 위치는 행동 확정 당시 공개 이벤트의 `a`, `b`를 사용한다.

| 표시 이름 | ID | 판정 | N |
|---|---|---|---|
| 간격 | distance | abs(a-b) ≤ N | 1~18, 기본 3 |
| 합의 크기 | sumAtMost | a+b ≤ N | 3~38, 기본 20 |
| 합의 배수 | sumMultiple | (a+b) % N = 0 | 2~10, 기본 3 |
| 배수 포함 | containsMultiple | a % N = 0 또는 b % N = 0 | 2~10, 기본 3 |
| 서로소 | coprime | gcd(a,b) = 1 | 없음 |

질문 결과는 모두 예/아니오다. 정확한 합·차이·개수를 공개하는 게임 질문을 추가하지 않았다. `near`, `sum3`는 원래 의미로 정규화한다. 과거 `multiple`은 큰 수가 작은 수의 배수인지 묻는 질문이며 새 `containsMultiple`과 구분한다. 기존 `ratio`와 부정 질문 기록도 음성 데이터에 대응한다.

`INF_01~03`, `INF_06~07`은 미확정으로 제외한다. AMB_02, END_03 및 대안 4개도 기본 제작에서 제외한다. 비교 전용 AUD_02의 “합은 십사.”는 게임 이벤트와 연결하지 않는다. 마지막 공격이 승패를 확정하면 마지막 정답·마무리를 쌓지 않고 승자 → 패자 대사만 사용한다.

## Typecast 확인 및 생성 결과

인증된 `/v3/voices`의 한국어 이름으로 정확히 한 후보씩 확인했다. 두 보이스 모두 `ssfm-v30`과 normal을 지원한다.

| 게임 캐릭터 | Typecast 보이스 | 확인한 voice_id | 파일 | 문자 |
|---|---|---|---:|---:|
| Carl | 종대 | tc_67e38d8c771b5511659c4534 | 295 | 5,127 |
| Sofya | 아엘 | tc_676cda78bde49be9d17f38e0 | 295 | 5,010 |

- SDK: 제작 전용 devDependency `@neosapience/typecast-js@0.4.15`. API 기본 주소 `https://api.typecast.ai`, `X-API-KEY`, 한국어 `kor`.
- 모델 `ssfm-v30`, `emotion_type: preset`, `emotion_preset: normal`, `emotion_intensity: 0`, MP3, volume 100, pitch 0, tempo 1.
- 지원 감정: angry, happy, normal, sad, tonedown, toneup, whisper. 이번 제작은 전부 normal로 고정했다.
- attribution: `source=api-page`, `generated_by=codex`. SDK 옵션과 `voice-production/config.json`에 보존했다.
- 비교용 12개 → 혼동 숫자 10/12 확인용 4개 → 게임용 신규 574개 순서로 생성했다. 운영 대사 588개 참조 중 14개는 앞서 생성한 파일을 재사용했다.
- 최종 **590개, 66,420,067 bytes, 10,137자**. 실패·미생성 운영 항목 0개. 재실행 검증은 **재사용 590, 신규 합성 0, TTS 호출 0**이었다.
- API Lite 계정 포함 크레딧 200,000, 동시 요청 한도 5를 확인했다. 제작은 최대 2개, 재개 시 1개로 제한했다. 최종 조회 사용 10,137 / 잔여 189,863. 금액 환산이나 별도 결제는 수행하지 않았다.
- Windows 파일 교체 오류로 한 차례 중단했지만, 정상 오디오 파일의 해시와 형식을 확인해 복구했다. 그 요청을 다시 합성하지 않았다. 최종 불확실/실패 항목은 없다.

## 주요 코드

- `src/voice/catalog.ts`, `korean.ts`, `types.ts`: ID·역할·양쪽 원고·화면 문구·변수 범위·기본/대안·중요도·합성 상태. 숫자/순서/장수를 구분하고 영으로·일로·칠로·십으로·십이로를 처리한다.
- `scripts/voice.ts`, `scripts/voice/core.ts`: 인증된 보이스 탐색, 계정 조회, dry-run, 명시적 생성 상한, 요청 전체 기반 해시, 정상 파일 재사용, 임시 파일 검사, 실패/불확실 상태, 실행 잠금. 요청당 45초 제한이며 자동 재시도하지 않는다.
- `public/audio/voice/manifest.json`, `files/`, `src/voice/durations.json`: 590개 음성과 파일별 해시·문구·대사 ID·상태·바이트·길이 및 제작 길이 요약. 변경된 원고/설정의 ID는 새 파일로 옮겨 이전 파일과 혼용하지 않는다.
- `src/voice/events.ts`, `player.ts`, `presentation.ts`, `src/components/QuestionConversation.tsx`: 확정 이벤트 기반 순서, 중복 억제, 말풍선, 만료·취소, 누락 처리. 비공개 정답이나 정답과의 거리를 음성에 추가하지 않는다.
- `src/App.tsx`, `components/OnlineGame.tsx`, `audio.ts`, `soundtrack.ts`: 로컬/온라인 연동, BGM 낮춤/복원, 이동·재대결·숨김 시 정리.
- `engine/game.ts`, `online/types.ts`, `online/client.ts`, `functions/src/domain.ts`, `functions/src/index.ts`: 플레이어별 음성을 서버 상태와 뷰에 저장/전달. 재접속은 과거 기록을 기준 상태로만 읽는다. 음성 필드가 없는 예전 상태는 외형으로 보완한다. 질문 답은 계속 서버가 계산한다.
- `VoicePicker.tsx`, `AppearancePicker.tsx`, `AudioSettingsControls.tsx`, `voice.css`: 캐릭터 이름, 외형과 목소리 연결, 미리듣기, 음량, 가로 모바일 배치.
- `public/voice-preview.html`: 두 보이스의 비교용 6상황과 10/12 발음을 나란히 재생. 전체 운영 에셋도 확인 가능.
- `scripts/build-sw.mjs`: 66MB 음성 전체를 설치 때 미리 내려받지 않는다. 필요한 정적 파일만 재생한다.

API 키는 무시되는 `.env.typecast.local` 또는 제작 프로세스의 `TYPECAST_API_KEY`에만 둔다. 브라우저 환경변수, 번들, 매니페스트에는 넣지 않는다. 게임 실행 중 Typecast 요청이나 대체 보이스로의 자동 전환은 없다.

## 재현 명령

저장소 루트에서 실행한다. `.env.typecast.local`에는 개인적으로 키를 설정하며 채팅이나 Git에 올리지 않는다.

```powershell
$env:NODE_USE_SYSTEM_CA='1'
npm run voice:discover
npm run voice:plan -- --scope all --max-files 12 --max-chars 500
npm run voice:generate -- --scope all --max-files 12 --max-chars 500 --concurrency 1
npm run voice:verify
npm run voice:verify:browser
npm run voice:preview
```

`plan`은 보이스별 수·문자·재사용·신규·제외 항목·계정 한도를 표시한다. 변경분이 12개/500자를 넘으면 generate는 시작하지 않는다. 계획을 확인한 후 필요한 상한을 명시적으로 바꾼다. 원고·설정이 같은 파일은 상한 안에서도 재합성하지 않는다.

처음부터 제작하는 환경의 단계별 명령:

```powershell
npm run voice:generate -- --scope audition --max-files 12 --max-chars 500 --concurrency 1
npm run voice:generate -- --scope numbers --max-files 4 --max-chars 100 --concurrency 1
npm run voice:plan -- --scope game --max-files 600 --max-chars 20000
npm run voice:generate -- --scope game --max-files 600 --max-chars 20000 --concurrency 1
```

이 Windows 환경은 Node 24의 시스템 인증서를 사용하도록 `NODE_USE_SYSTEM_CA=1`을 설정해야 API에 연결된다. 인증서 검증을 끄지 않는다.

캐시만 검증하고 합성을 금지하는 재실행:

```powershell
npm run voice:generate -- --scope all --max-files 0 --max-chars 0 --concurrency 1
```

불확실한 요청은 자동 재시도하지 않는다. 계정 사용량을 따로 확인하고 재합성 여부를 판단한 경우에만 `--retry-uncertain`을 명시한다. 제작 후 `voice:verify`가 시간표를 갱신하며, 게임 반영은 `npm run build`로 한다.

## 배포

Firebase 프로젝트 `le-blanc-noir-2026`에 Hosting과 5개 서버 함수를 배포했다. 운영 주소는 https://le-blanc-noir-2026.web.app 이고, 비교 페이지는 https://le-blanc-noir-2026.web.app/voice-preview.html 이다. 배포 SW 버전은 `le-blanc-559ec0830f2b`이다. 운영 매니페스트 590개와 미리듣기 페이지 HTTP 200을 확인했다.

## 검증과 남은 확인

- 타입 검사, 클라이언트/서버 빌드 성공. 단위 테스트 216개 통과.
- 음성 590개 해시·MP3 구조 검사 성공. Chrome AudioContext로 590개를 실제 디코딩하여 길이와 0이 아닌 PCM을 확인했다. JSON 오류/빈 파일 0개.
- 실제 파일 요청 순서, 말풍선→답변→팝업, 재생 끄기, 누락·지연·건너뛰기, 중복·취소·TTL, 상대 대사만, 동일 보이스 두 명, BGM 복원 검증.
- 568×320 / 844×390 / 1440×900 질문·캐릭터·추리 노트 흐름 검증. 기존 테스트가 즉시 결과를 가정하던 부분은 말풍선 단계를 처리하도록 수정했다.
- 브라우저 검사 29개 통과: 음성 흐름 3개, 질문·캐릭터·추리 노트 14개, 기존 오디오 및 실제 Firebase 에뮬레이터 두 클라이언트 대전 12개. 양쪽 공개 답변, 목소리 보존, 재접속, 기권, 중복 이벤트를 확인했다.
- 배포 후 운영 주소에서도 브라우저 검사 4개 통과: 두 실제 클라이언트 대전/재접속, 음성 흐름/누락 처리, 미리듣기, 작은 화면의 무음 대화.
- 운영 사이트에서 실제 AudioBufferSource 시작 시점을 추가 계측해 질문 말풍선 중 대상·질문 음성 2개, 답변 말풍선 중 답변 음성 1개 순서로 재생되는 검사도 통과했다.
- 전체 음량을 0으로 내린 뒤 복원할 때 대기 중인 resume 때문에 정지가 남는 경우도 수정하고 회귀 검사했다.
- 소스와 배포 번들에서 실제 키 일치 0건. 브라우저 JS에서 Typecast API 주소/인증 헤더/SDK 클라이언트 0건. 게임 브라우저 검증 중 Typecast 요청 0건.
- 직접 사람 귀로 청취하지 않았다. 억양·자연스러움은 미리듣기로 확인해야 한다. 실제 iOS/Safari 기기 재생도 별도 확인이 필요하다.
- 큰 기존 Firebase/Three.js 번들에 대한 Vite 크기 경고는 남아 있으며 빌드 실패는 아니다.

공식 규격 확인: [Quickstart](https://typecast.ai/docs/quickstart), [보이스 목록](https://typecast.ai/docs/api-reference/voices/list-voices), [합성](https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech), [구독](https://typecast.ai/docs/api-reference/subscription/get-subscription), [API 요금](https://typecast.ai/pricing/api/), [llms.txt](https://typecast.ai/docs/llms.txt).


## 후속 조정

- 배분 간격 170→210ms, 전체 연출 2.4→3초. 이동 보간도 배분 중에만 완만하게 조정했다.
- AI 메뉴의 큰 로고 겹침을 없애고 작은 로고, 난이도, 남자/여자 선택, 시작 버튼으로 정리했다. 553×441, 568×320, 844×390, 1440×900에서 겹침과 시작 버튼 접근성을 확인했다.
- 음성 입력 게인을 1.8배로 올리고 전용 컴프레서로 피크를 제어했다. 대표 6개 파일의 기본 음량 출력 RMS는 약 5.0~5.5dB 증가했다. 자동 계측이며 사람 청취 평가는 아니다.
- 질문 음성에 1.5초 다운로드 지연을 주어도 질문 2개 발화와 답변 1개 발화가 해당 말풍선에서 시작·종료되는 브라우저 검증을 통과했다. 파일 오류가 복구되면 같은 단계에서 다시 재생되는 것도 확인했다.
- 해시 이름 MP3는 장기 캐시하고 매니페스트는 재검증하도록 Hosting 헤더를 설정했다. 추가 Typecast 합성은 하지 않았다.

후속 검증: 단위 216개, 음성·오디오·캐릭터 브라우저 16개, 일반 배분·터치 진입 2개 통과. 배포는 Hosting만 갱신하며 온라인 판정 함수는 그대로 유지한다.

후속 운영 검증도 7개 통과: 양쪽 AI 캐릭터 대응, 실제 두 클라이언트 온라인 대전/재접속, 느린 음성 다운로드와 오류 후 재생 복구, 무음 모드, 작은 화면 설정. 운영 SW와 음성 캐시 헤더 적용을 확인했다.
