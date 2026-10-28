# User-supplied materials

Seven PNG images supplied by the project owner on 2026-10-28. Their original files in Downloads are unchanged. These WebP copies preserve dimensions/composition; quality 88 encoding reduces the aggregate payload from 18,722,995 to 1,531,012 bytes (about 92%). File hashes and source names are recorded in sources.json.

- ceramic-ivory: revealed tile faces
- lacquer-dark: identical hidden tile faces, backs and dealing stack
- paper-warm: page and sheet material
- felt-oxblood: elliptical table surface, inside the original Figma border
- walnut-dark: desktop table edge
- title-mobile / title-desktop: responsive title photograph, with live text and controls above it

Hidden tiles all share the exact same texture size/position. No image selection or sampling depends on a hidden number. Runtime assets are local; no image-generation service is called.

The 2026-10-28 3D tabletop reuses felt-oxblood and walnut-dark on actual meshes. Its numbered card faces are drawn from public game data; the original ceramic/lacquer assets remain in the 2D tutorial, summaries and fallback. No additional redistribution license for the owner-supplied images is inferred. See 3D-UPDATE.md for procedural glove/card sources.

The tavern revision uses walnut-dark for the 3D wooden tabletop. Felt remains available to existing 2D screens. The locally authored torso, sleeves, candle and decorative deck need no downloaded model assets. See TAVERN-UPDATE.md.


## Landscape menu key art

`title-tavern-v2.webp` (1672×944, 165,348 bytes) was generated with OpenAI image generation in this conversation on 2026-10-28, at the owner's request. It is a discrete still-life illustration with no UI or game numbers. The original generated PNG is retained outside the repository; this local WebP copy was format-optimized using Pillow. See `LANDSCAPE-UPDATE.md` for the prompt. No third-party downloaded model/image or runtime generation service was introduced. Older user-supplied title images remain available; that revision used the v2 tavern illustration.


## Current card/menu revision

Current menus use `title-tavern-v3.webp`, an OpenAI imagegen edit of v2 using the locally authored card design reference. The artwork now shows numerical faces 4, 12, 17 and the same two-ellipse/diamond motif as `card-back.svg`. Original generated PNG is retained in Codex generated_images. SVG is directly authored code, shared by 3D card backs, the rectangular decorative stack, and 2D fallback; it has no hidden-number-dependent details. Numbered 3D fronts are drawn at runtime from permitted view data on muted parchment. Original supplied textures and v2 illustration are preserved. See `CARD-MENU-UPDATE.md` for prompt, attribution and validation.


## Vintage surfaces and illustrated Karl

`card-front-vintage.webp`, `card-back-vintage.webp`, and `karl-portrait.webp` were generated with built-in OpenAI imagegen in this conversation at the owner's request. Texture fronts contain no numerals; visible numbers are drawn from the lawful view at runtime. All backs share identical wear. The Karl cutout retains alpha and is a static image plane in the 3D scene, replacing the procedural torso/sleeves/head. Existing materials remain intact. See `VINTAGE-ASSET-PROMPTS.json` and `VINTAGE-RESULT-UPDATE.md` in the repository root for exact prompts, source PNG names, processing and limitations.
