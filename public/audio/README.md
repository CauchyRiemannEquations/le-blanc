# LE BLANC audio

Five music/ambience web assets (4,378,266 bytes total), plus the 36 short
[SFX assets](sfx/README.md) in `sfx/`. WAV masters, source sample libraries,
and production ZIPs are intentionally not distributed with the game.

| Asset | Duration | Playback |
| --- | ---: | --- |
| bgm_menu.ogg | 104 s | Full-buffer loop; menus, duel how-to, friend lobby |
| bgm_duel.ogg | 144 s | Full-buffer loop; AI, online and shared-device duel |
| cue_victory.ogg | 6 s | Once on duel victory result entry |
| cue_defeat.ogg | 4.5 s | Once on defeat result entry |
| amb_tavern.ogg | 96 s | Independent quiet full-buffer loop |

The supplied files are Ogg Vorbis q5, stereo, 48 kHz. The production notes
describe original compositions rendered with VSCO 2 Community Edition piano,
cello and viola samples, and synthesized ambience without field recordings.
No external paid generation service was used. The music shares the
D4–F4–E4–A3 motif. This is sampled-instrument rendering, not a new live recording.

## Sources and licensing

- Sample library: [VSCO 2 Community Edition, fixed revision 440300901dfe9275fd84e0b7763af1f8443ae62e](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e).
- Sample license: [CC0 1.0 Universal](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE).
- Credits from the supplied production notes: Recorded by Sam Gossner & Simon
  Dalzell; sample cutting by Elan Hickler / Soundemote.
- The CC0 statement applies to the instrument samples. This document does not
  assign a new license to the composed score, recordings, or game code.
- Asset hashes in `manifest.json` verify the five shipped music/ambience files.
  Private transfer identifiers and workstation-specific download notes are not
  part of the distributed asset metadata.

For integration behavior and local verification, see [AUDIO-INTEGRATION.md](../../AUDIO-INTEGRATION.md).
