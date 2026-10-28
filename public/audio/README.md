# LE BLANC audio

Six web assets only (6,320,475 bytes total). WAV masters, source sample libraries,
and production ZIPs are intentionally not distributed with the game.

| Asset | Duration | Playback |
| --- | ---: | --- |
| bgm_menu.ogg | 104 s | Full-buffer loop; menus, solo list, friend lobby |
| bgm_solo.ogg | 160 s | Full-buffer loop; solo play and tutorial |
| bgm_duel.ogg | 144 s | Full-buffer loop; AI, online and shared-device duel |
| cue_victory.ogg | 6 s | Once on victory/solo result entry |
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
- Source notes: the supplied Library `README(1).md`, ID
  `libfile_eed3058a7d54819190a04dbce01703b3`, read on 2026-10-28.
- `manifest.json` retains the original Library references and the hashes of the
  six user-attached files actually installed in this checkout. No Library item
  was replaced or duplicated.

The fresh attachments were downloaded on this PC using the current Library
transfer helper with the installed Codex Python 3.12 runtime, with normal TLS
certificate verification. They were verified as readable, with the expected
sizes and Ogg headers. The initial Python 3.14 download failed certificate
validation. The original Library references additionally require xattrs that
the helper cannot set on Windows (`os.setxattr` unavailable); their identity is
retained here as provenance, not claimed as a successfully applied filesystem
attribute. The newer user attachments had no such xattr requirement.

For integration behavior and local verification, see [AUDIO-INTEGRATION.md](../../AUDIO-INTEGRATION.md).
