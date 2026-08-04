# Melbourne Counter Field Clock — PT Serif

A separate PT Serif and Open Sans version of the 3840 × 804 gallery-screen Counter Field clock.

## Live URLs

- Production: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock05-Counter-Field-PT-Serif/`
- Mobile preview: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock05-Counter-Field-PT-Serif/?preview=1`
- Accelerated transition test: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock05-Counter-Field-PT-Serif/?preview=1&demo=1`

## Typography

- PT Serif Bold is used for all tiny counter numerals and is the source for the custom 15 × 17 large-digit masks.
- Open Sans Regular is used for the header, date, location and preview note.
- Fonts load from the official Google Fonts service with Georgia and Arial fallbacks.
- All large numerals share the same cap height, baseline and matrix dimensions.

## Behaviour

- The large digit silhouette changes immediately at each clock tick.
- Tiny numbers inside the new silhouette resolve left to right, top to bottom.
- Each transition takes half of the natural interval for that digit position.
- Each colon dot is a fixed 3 × 3 counter matrix.
- Colon counter values advance once per second over approximately 520 ms.
- The full-width bottom line shows progress through the current minute.

## Production constraints

- Fixed artwork canvas: 3840 × 804
- Default render buffer: 1920 × 402
- Vanilla HTML, CSS and JavaScript
- Canvas 2D only
- 18 fps cap
- No WebGL or heavy frameworks
- Australia/Melbourne time zone
- Continuous system-time resynchronisation
- Rendering pauses while the page is hidden
- Designed for Chromium on NVIDIA Shield signage playback

## Search protection

- `noindex`
- `nofollow`
- `noarchive`
- `nosnippet`
- `noimageindex`
- Separate Googlebot and Bingbot directives
- `no-referrer`
- `robots.txt` blocks all crawlers

This is search-engine exclusion, not password protection. Anyone with the direct URL can still open the public site.

## URL options

- `?preview=1` top-aligns the artwork and adds a mobile viewing note
- `?demo=1` runs time at 8× speed
- `?quality=high` uses a native 3840 × 804 render buffer
- `?quality=low` uses a 1440 × 302 render buffer
- `?motion=0` disables micro-motion and staggered colon changes
- `?time=12:34:56` locks the time for layout testing

## Final build

- Build identifier: `20260804b`
- Main files: `index.html`, `styles.css`, `config.js`, `model.js`, `app.js`
