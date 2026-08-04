# Project brief

## Description

A PT Serif and Open Sans variant of the Melbourne Counter Field gallery clock.

## Build brief

Purpose:
Create a separate production repository for the Counter Field clock variant using PT Serif and Open Sans.

Reference build:
https://creative-innovation-labs-bmc.github.io/Melbl8-Clock03-Split-flap/counter-field/

Typography:
- Use PT Serif Bold as the serif reference for the large numeral matrix silhouettes.
- Use PT Serif Bold for the tiny counter numbers inside the field and colon matrices.
- Use Open Sans Regular for supporting labels, date, location and interface copy.
- Keep all large digits on a shared baseline and cap height.
- Load the fonts from the official Google Fonts service, with safe local serif and sans-serif fallbacks.

Design and behaviour:
- Preserve the final Counter Field brand colours and layout.
- Fixed 3840 × 804 artwork canvas.
- Large digit silhouette changes immediately at each clock tick.
- Tiny numbers inside each new silhouette resolve left to right, top to bottom over half of that digit position's natural interval.
- Each colon dot is a fixed 3 × 3 matrix. Its tiny numbers update once per second with staggered left-to-right, top-to-bottom timing.
- Full-width minute progress line.
- Melbourne time zone.
- Automatic viewport scaling for mobile preview.

Production constraints:
- NVIDIA Shield signage playback is the production target.
- Vanilla HTML, CSS and JavaScript.
- Canvas 2D only. No WebGL or heavy frameworks.
- Cap rendering at approximately 18 fps.
- Pause when hidden and continually resynchronise to system time.
- Include noindex, nofollow, noarchive, nosnippet and noimageindex metadata.
- Include robots.txt with Disallow: / and no-referrer policy.
- Include a reduced-motion fallback.
- QC native 3840 × 804, 1920 × 1080 scaling and mobile preview.
