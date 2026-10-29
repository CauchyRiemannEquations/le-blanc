# LE BLANC app icon

`le-blanc-icon.png` is the generated master artwork: an oxblood leather field, antique gold frame, and ivory cards bearing an LB monogram.

Regenerate the runtime sizes with `node scripts/create-icons.mjs` (installed Chrome required). This only resizes the master and packages the 32/48px PNGs into an ICO.

- 32/48px: browser tab and bookmark icons
- 180px: Apple home-screen icon
- 192/512px: installed PWA icons

The full-bleed opaque background and central card emblem allow circular/adaptive masks; the outer gold frame is decorative and may be cropped. The manifest uses new asset paths so existing browser icon caches can refresh. No API call or image generation occurs during build or gameplay.
