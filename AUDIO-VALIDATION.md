> 2026-10-28 통합 검증: 단위 129개, 로컬 브라우저 22개, 운영 브라우저 9개 통과. 아래는 원래 음악 브랜치에서의 검증 기록이며, 스테이지 테스트는 최신 솔로 5판의 식별자와 액션 구조로 갱신했습니다.

# Local audio validation — 2026-10-28

## Confirmed

- `npm test`: **122 tests passed in 9 files**, including 14 new audio unit tests.
- `npm run build`: strict TypeScript and production build passed; the existing
  >500 kB chunk-size warning remains. Six OGGs are included in `dist/audio` and
  the generated offline cache.
- `npm run check:audio`: all six original attachment files pass expected byte
  size, `OggS` header and recorded SHA-256 checks (6,320,475 bytes total).
- Existing `game.spec.ts`, `solo.spec.ts`, `hud-controls.spec.ts`: **32 passed**.
- New `audio.spec.ts`: **6 passed, 0 skipped** on installed Chrome. Includes
  native Web Audio game-flow playback as well as mock lifecycle/state tests.
- Settings visually inspected at 390×844 and 844×390. Lower controls are
  reachable by scrolling in landscape; keyboard focus remains in the dialog.
- `git diff --check`: passed. No lint command is configured in this repository.

## Actual source files

| File | Decoded seconds | Channels | Boundary observation |
| --- | ---: | ---: | --- |
| bgm_menu.ogg | 104 | 2 | Loop still running after crossing file end |
| bgm_solo.ogg | 160 | 2 | Loop still running after crossing file end |
| bgm_duel.ogg | 144 | 2 | Loop still running after crossing file end |
| cue_victory.ogg | 6 | 2 | One-shot ended at file end |
| cue_defeat.ogg | 4.5 | 2 | One-shot ended at file end |
| amb_tavern.ogg | 96 | 2 | Loop still running after crossing file end |

The browser's Ogg/Vorbis capability probe returned `probably`. Boundary checks
used the real decoded buffers, a running AudioContext, a muted output, and
started 100 ms before the end, observing the source after 250 ms. They verify
loop execution, not perceived seamlessness.

A separate native playback test observed the actual ambience/menu, solo,
victory cue, menu return, and AI duel buffer-source starts through the UI.
It also checks real context suspension/resumption on tab hiding and full mute,
zero-volume silence, exactly one cue on each of two solo completions, no cue on
unmute/tab return, no solo loop restart on replay, and one shared native
AudioContext despite React StrictMode. No production-only test hooks were
added. Online waiting/play/defeat/duplicate updates were tested
through an injected room feed; shared-device and AI game flows were exercised.

Unit tests cover gesture gating, crossfade after decoding, stale requests,
rapid return to a fading song, result deduplication and ducking, visibility,
mute/zero volume, independent layers, original synthesized notes, failure
containment, autoplay retry, disposal and settings migration.

## Transfer and evidence limits

All six installed OGGs came from the user's fresh attachments using the current
supported Library transfer helper on this PC. Default Python 3.14 rejected a
certificate with `Missing Authority Key Identifier`; the installed Codex Python
3.12 succeeded with its normal TLS verification. The original Library-file
metadata path separately fails on Windows because `os.setxattr` is unavailable.
No access denial was bypassed and no certificate verification was disabled.
Original Library identities remain in the manifest as provenance; no Library
writeback was attempted.

The initial browser run accidentally reused another contributor's server on
4173 and was discarded. Valid results above use this worktree's exclusive
4317 server. Early test-only selector mistakes and randomized first-player
selection were fixed before the final audio run.

Direct listening, perceptual loop/mix quality, physical speaker output,
Safari/iOS/Firefox, and live two-client Firebase networking remain unverified.
No deployment was performed. Publishing still requires separate approval.
