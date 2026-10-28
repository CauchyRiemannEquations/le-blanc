# LE BLANC 대전 효과음

원본 SFX v1의 **18개 이벤트 / 36개 OGG**만 런타임에 포함합니다.
WAV 마스터·미리듣기·제작 도구는 별도 원본 패키지에 보관합니다.

- 경로: `ogg/`; 원본 이벤트·변주·SHA-256: `manifest.json`
- 형식: 48 kHz, 스테레오, Ogg Vorbis q5, 원샷
- 출처: 외부 녹음/샘플 없이 제작한 원본 절차 합성. [제작 방식](SOURCE_AND_METHOD_KO.md)
- `manifest.json`의 `integration_status`는 원본 패키지 작성 시점의 기록입니다.
  실제 코드 연결 및 검증 상태는 저장소 루트 `SFX-INTEGRATION.md`를 따릅니다.
- `npm run check:audio`로 기존 음악 5개와 SFX 36개의 원본 해시를 검사합니다.

비공개 패 열람은 로컬에서 카드 묶음당 한 번(-7 dB)만 재생하며,
카드 값이나 숨은 정보를 변주·음정·길이로 표현하지 않습니다.
