# Audio integration

Base: `efdb626da596a863b7c04e19919dc59450c9166e` (main checked 2026-10-28).
Local branch: `codex/audio-integration-20261028`. No push, PR, merge or deployment.

## Runtime

`App` selects menu, tutorial, and local/AI duel scenes. `SoloGame` reports its
actual list/play/result state; no stage count controls audio. `OnlineGame`
reports waiting/closed, playing, and per-player results. Shared-device results
celebrate the displayed winner, matching the existing VICTORY screen.

`GameAudio` owns one Web Audio context for the existing synthesized tones and
the six OGG assets. Pointer/keyboard gestures unlock it. Music crossfades over
450 ms only after the replacement decodes. Same-scene renders and turn changes
do not restart sources. Fetches are aborted on obsolete requests; late decodes
cannot start obsolete music/cues. Only active/fading buffers are retained.
All loops use the entire decoded buffer, without a fade at every boundary.

Music gain is 0.65 and ambience gain 0.30, on separate buses. Result cues duck
music to 0.16, restoring it on completion/cancellation. The current result ID
deduplicates rerenders and server updates; leaving the result permits the next
entry. Leaving, muting or hiding a tab cancels cues and pending synthesized
effects. Returning/unmuting resumes loop positions, without replaying a missed
result. Page hide/show and visibility listeners are removed on teardown.

Settings retain `leblanc-settings-v1` and the existing `sound` preference.
`효과음` controls original tile tones plus result cues; its subtitle states this.
Background music and ambience have separate switches. Full mute and volume
apply to every bus. Missing new fields inherit the old sound preference, so a
previously silent user stays silent; a new profile also starts silent. Turn on
the desired layers in Settings. Settings storage failures remain nonfatal.

Fetch failures, invalid/unsupported OGG decoding, missing AudioContext and
autoplay rejection cannot stop the game. Failed assets are suppressed for this
app mount (reload to retry); autoplay resumes retry on later gestures. Downloads
time out at 15 seconds. No fallback codec or streaming decoder is bundled.

## Verification commands

```
npm ci --ignore-scripts
npm test
npm run build
npm run check:audio
npm run test:browser -- --config playwright.audio.config.ts e2e/audio.spec.ts e2e/game.spec.ts e2e/solo.spec.ts e2e/hud-controls.spec.ts
```

The browser config uses port 4317 with strict port selection and no server reuse,
so an unrelated contributor's development server cannot contaminate results.
The repository has no lint script. `build` includes strict TypeScript checking.
`check:audio` verifies all original OGG sizes/headers/hashes. It must pass before
publishing; the ordinary build does not substitute for this asset check.

## Concurrent work

The original checkout was clean at the start. During validation another worker
modified `src/solo/conditions.ts`, `engine.ts`, `inference.ts`, `stages.ts`,
`storage.ts`, `types.ts` and added solo verification/legacy files. By the final
check this also included `src/solo/SoloGame.tsx`, `src/solo/solo.css`, solo tests,
documentation and `package.json`. In particular, `SoloGame.tsx` and `package.json`
overlap this branch's edits and require deliberate reconciliation on integration.
Those concurrent files
were neither copied into this worktree nor overwritten. Main remained at the
base commit when checked. Audio production code depends only on the solo
screen and run ID, but future integration must retain the audio callback when
merging a redesigned `SoloGame`. New solo walkthrough schemas may require
updating the browser test's solver, not the soundtrack logic.

## Limits

Browser automation is not listening. No claim is made about perceived musical
seamlessness, device speaker output, or mix quality. Actual asset decoding and
loop-boundary execution are recorded in the local validation report. Real
two-client Firebase networking was not run; online audio state updates are
covered with a mock room feed. Safari/iOS/Firefox and physical mobile devices
have not been tested. On unsupported Ogg decoders, the game remains playable
with synthesized SFX.
