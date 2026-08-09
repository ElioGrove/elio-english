# Design QA

**Artifacts**

- Source visual truth: `/Users/xiaolin/projects/xiaolin-english/design-reference-option-2.png`
- Browser-rendered desktop implementation: `/Users/xiaolin/projects/xiaolin-english/implementation-desktop.png`
- Browser-rendered mobile implementation: `/Users/xiaolin/projects/xiaolin-english/implementation-mobile.png`
- Combined comparison evidence: `/Users/xiaolin/projects/xiaolin-english/design-qa-comparison.png`
- Source pixels: 1487 × 1058
- Desktop implementation pixels: 1440 × 1024
- Mobile implementation pixels: 390 × 844
- Desktop CSS viewport: 1440 × 1024; device pixel ratio 1
- Mobile CSS viewport: 390 × 844; device pixel ratio 1
- Density normalization: the source and desktop implementation have the same 1.406 aspect ratio. The source was displayed at the implementation's normalized aspect and scale in the combined comparison; no density-only differences were filed.
- State: high-school vocabulary book, word `resilient`, status `learning`, warm-light theme, authenticated/demo study view.

**Findings**

- No remaining P0, P1, or P2 findings.
- [P3] The generated spring illustration has a slightly more visible rectangular paper backdrop than the reference.
  Location: memory tip panel, `public/assets/resilient-spring-memory.png`.
  Evidence: the reference illustration blends almost entirely into its panel; the implementation retains a faint tonal boundary around the raster asset.
  Impact: minor polish only; the subject, palette, crop, size, and reading hierarchy remain faithful.
  Fix: if desired, regenerate the same spring motif with a transparent or exactly `#f8f6f1` background.
- [P3] The implementation replaces several reference-only metadata labels with the requested usage scenarios.
  Location: word metadata line below the core meaning.
  Evidence: the reference includes exam-level labels and star difficulty; the implementation shows frequency plus exam/academic/usage-scene metadata.
  Impact: intentional product-content adaptation with negligible visual drift.
  Fix: none required unless exact reference copy becomes a goal.

**Required Fidelity Surfaces**

- Fonts and typography: the Instrument Serif display face closely matches the reference's editorial word treatment; body/UI text uses a restrained system sans stack and serif Chinese headings. Weights, line height, letter spacing, wrapping, and hierarchy remain legible at desktop and mobile sizes. No truncation remains in the checked states.
- Spacing and layout rhythm: the 1440 × 1024 composition preserves the reference's header, wide reading pane, 366 px progress rail, section dividers, status control, and persistent footer. Mobile collapses the rail, stacks learning sections, and keeps status actions reachable without overlap.
- Colors and visual tokens: warm paper, ink, clay, amber, green, stone, and hairline borders map closely to the source. There are no gradients or generic elevated card treatments. Contrast and semantic status colors are clear.
- Image quality and asset fidelity: all visible imagery is a real generated raster asset, not CSS/div/SVG art. The spring subject, scale, crop, and muted palette match the source direction; the faint background seam is retained as P3 polish.
- Copy and content: static interface copy is coherent in Chinese and reflects the requested learning model. Dynamic English examples and Chinese explanations are realistic and readable.
- Icons: visible actions use one Phosphor icon family with consistent line weight, size, alignment, hover/focus affordance, and semantic labels.
- Accessibility and behavior: native buttons/inputs/selects are keyboard reachable, focus-visible outlines are present, imagery has alt text, reduced-motion is honored, and mobile targets are practically sized.

**Full-view Comparison Evidence**

The combined comparison shows the source and implementation in the same input at normalized scale. Major-region proportions, editorial hierarchy, status placement, right-rail density, warm palette, separators, queue rows, daily-progress bar, and bottom controls align closely. The implementation deliberately exposes slightly more readable lower-panel copy while preserving the source's density and composition.

**Focused Region Comparison Evidence**

- Header / word / status region: wordmark, book selector, progress line, search, settings, word title, pronunciation, metadata, and three-state selector align in position and hierarchy. The display font and clay learning indicator are faithful.
- Learning content / right rail: example rows, authentic-context block, root/collocation/memory columns, queue, statistics, and plan bar preserve the same grid, visual weight, and reading order. Phosphor icons replace source icons consistently rather than using text glyphs.

**Primary Interactions Tested**

- Switched the word state to mastered and back to learning.
- Searched for `art` and opened a result.
- Opened and closed the settings dialog.
- Switched the active vocabulary book.
- Confirmed desktop and 390 × 844 mobile rendering.
- Browser console checked: zero errors; only Vite development/debug and React DevTools informational messages.

**Comparison History**

1. Initial desktop pass found a P2 persistent-control issue: the reading footer could fall below the 1024 px viewport and partially cover lower word-family content. Fix: converted the footer to a viewport-fixed paper surface, added bottom content clearance, and recaptured at 1440 × 1024. Post-fix evidence: all three controls remain fully visible while the final content row remains readable in `implementation-desktop.png`.
2. Initial mobile pass found P2 responsive drift at 390 px: the title scale and intrinsic grid sizing could crowd long content, and search was not usable as an input. Fix: constrained mobile widths, reduced the display scale, added `minmax(0, 1fr)`/wrapping safeguards, and restored a compact search input. Post-fix evidence: `implementation-mobile.png` shows clean wrapping, intact examples, visible search, and a non-overlapping fixed status selector.
3. Final combined pass found no actionable P0/P1/P2 differences. Remaining deviations are the P3 illustration backdrop and intentional metadata-copy adaptation above.

**Implementation Checklist**

- [x] Match desktop frame, hierarchy, palette, and editorial typography.
- [x] Preserve functional three-state learning control and queue.
- [x] Verify search, settings, book switching, audio controls, and next-word affordance.
- [x] Fix persistent desktop footer behavior.
- [x] Verify responsive mobile layout and tap targets.
- [x] Check browser console and production build.

**Follow-up Polish**

- Optionally regenerate the memory illustration with a perfectly transparent/paper-matched backdrop.

final result: passed
