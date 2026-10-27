# 온라인 대전 · 턴 제한시간 (2026-10-27)

## 현재 상태

- GitHub: https://github.com/CauchyRiemannEquations/le-blanc (비공개).
- Firebase 프로젝트 `le-blanc-noir-2026`, 웹 앱, 서울 Firestore 데이터베이스 생성 및 접근 규칙 배포 완료.
- 사용자 요청으로 **Cloud Functions/Hosting 배포 보류**. 기존 Sites 서비스도 이번 수정으로 업데이트하지 않았습니다.
- Functions 배포는 Blaze 미연결로 거절되었습니다. 익명 로그인 설정도 프로젝트 인증 초기화가 필요합니다. 실제 인터넷 대전은 아직 이용할 수 없습니다.
- 로컬 Firebase Emulator Suite에서 두 브라우저 대전을 검증했습니다. AI 대전은 Firebase 없이 실행됩니다.

## 기능과 정보 경계

8자리 방 코드·초대 링크, 익명 참가, 개인 보드, 실시간 동기화, 같은 브라우저/탭 새로고침 후 복귀, 기권·결과 화면을 구현했습니다. 핫시트는 ‘같은 기기로 연습’으로 남겼습니다.

한 턴은 60초입니다. 연속 정답도 같은 제한시간을 쓰며 질문·공격·결과창에서도 시간이 흐릅니다. 시간 초과 시 차례를 넘깁니다. 온라인에서 자기 차례를 세 번 연속 놓치면 패배하고 정상 행동 시 이 횟수가 초기화됩니다. 최초 배분은 3초 준비 시간을 더 줍니다. 상수는 `src/online/types.ts`에 있습니다.

온라인 정답 판정·무작위 페널티·턴 전환은 서버가 수행합니다. 전체 정답은 서버 문서에만 저장하고 클라이언트에는 자기 손패·공개 숫자·자기 질문만 담은 개인 문서를 전달합니다. Firestore는 본인 문서 읽기만 허용합니다. 직접 쓰기, 다른 참가자 문서, 전체 방 읽기는 거절합니다. 서버 마감 후 공격, 낡은 버전, 중복 요청을 처리합니다.

Cloud Tasks로 두 클라이언트가 닫혀도 시간 초과가 처리되도록 구성했지만 운영 Cloud Tasks/IAM은 실제 배포 후 검증이 남았습니다. 에뮬레이터에서는 클라이언트 sync 요청이 시간 초과를 실행하고, 무접속 만료 로직은 순수 함수 테스트로 검증합니다.

## 로컬 실행 (PowerShell)

Node.js 22.12 이상, Java 21 이상, Chrome이 필요합니다. 배포 런타임은 Node 22입니다.

```powershell
npm ci
npm --prefix functions ci
npm run build:server
```

터미널 1:

```powershell
npx firebase-tools emulators:start --only auth,firestore,functions --project demo-le-blanc
```

터미널 2:

```powershell
$env:VITE_USE_FIREBASE_EMULATORS='true'
npm run dev -- --port 4173
```

http://127.0.0.1:4173 을 일반 창과 시크릿 창에서 열고 방 코드로 입장합니다. 계정이 같아지지 않도록 서로 다른 브라우저 프로필을 사용하세요. 이 에뮬레이터 설정은 같은 컴퓨터용입니다.

테스트:

```powershell
npm test
npm run build
npx tsc -p functions/tsconfig.json
# 위 서버가 실행 중일 때
$env:VITE_USE_FIREBASE_EMULATORS='true'
npx playwright test
node scripts/test-firestore-rules.mjs
```

일반 브라우저 테스트는 에뮬레이터 환경변수가 없으면 온라인 시나리오를 건너뜁니다. 설치 중 Functions 감시 프로세스가 종료될 수 있으므로 의존성 설치를 완료한 후 에뮬레이터를 시작하세요.

## 운영 전 남은 단계

1. Firebase 콘솔에서 Blaze 연결 및 Authentication 시작 → 익명 로그인 활성화.
2. 웹 앱 SDK 설정을 `.env.example`에 따라 `.env.local`에 저장. 에뮬레이터 설정은 false. 관리자 토큰/서비스 계정 키는 클라이언트 환경변수에 넣지 않습니다.
3. 빌드 후 `firebase deploy --only functions,firestore:rules,hosting --project le-blanc-noir-2026`. Cloud Tasks enqueue/함수 호출 서비스 계정 권한, 무접속 시간 초과, 재접속을 운영 서버에서 검증합니다.
4. 공개 운영 전에 App Check, 요청 남용 제한, 데이터 보존/삭제 정책, 비용 알림을 설정합니다. 현재는 방 코드 기반 친구 대전 프로토타입이며 매칭·계정 복구·전적 저장은 없습니다.

질문은 여전히 비공개·무제한입니다. 간격 연결/연쇄 해독 규칙과 AI 전략은 바꾸지 않았습니다. 새 밸런스 전후 비교를 주장하지 않으며 자동 대전 회귀 검증을 수행했습니다.


## 최종 검증

- Vitest 78개 통과: 고정 시드 AI 대전 100판과 서버 도메인 12개 포함.
- 기존 브라우저 시나리오 19개 및 60초 타이머 시나리오 통과. 온라인 2기기 시나리오는 에뮬레이터 재시작 후 재검증 통과(총 21개 시나리오).
- Firestore 보안 규칙 7개 단언 통과. 허용된 본인 읽기와 비인가 읽기/쓰기 거절 확인.
- TypeScript 프론트/서버 검사 및 프로덕션 빌드 성공. Firebase 번들 크기 경고는 남지만 온라인 화면을 열 때만 지연 로드합니다.
- 루트/서버 프로덕션 의존성 audit 취약점 0개.
- 운영 Firebase 대전·Cloud Tasks·실제 모바일 기기는 검증하지 않았습니다.

