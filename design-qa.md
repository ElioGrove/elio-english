# Visual verification — 2026-10-23

final result: passed

## Target and evidence
- Source: user attachment `/var/folders/y4/djfh74j95678x401w3mycx5m0000gn/T/codex-clipboard-c306993c-3b27-4945-88bd-fd80115dcfa9.png` (1905 × 907).
- Implementation: `/Users/xiaolin/.codex/visualizations/2026/10/23/01a166c9-90e0-7032-9258-2c51f1157ca3/english-redesign/desktop.png`.
- Desktop comparison: 1905 × 907 CSS pixels, 1905 × 907 screenshot pixels, density 1. Both images were viewed together in one comparison tool result.
- Additional full-page evidence: `/tmp/xiaolin-desktop.png`, 1280px CSS viewport.
- Mobile evidence: `/Users/xiaolin/.codex/visualizations/2026/10/23/01a166c9-90e0-7032-9258-2c51f1157ca3/english-redesign/mobile.png`, 390 × 844 CSS viewport, density 1, full-page capture.
- State: local demo vocabulary study, resilient, learning selected. Source shows an idle speed test. This is an intentional style transfer to a different product, not a clone of its content or information architecture.

## Findings and required surfaces
No actionable P0/P1/P2 differences within the requested style-transfer scope.
- Typography: neutral sans-serif UI, dark primary text, muted small labels, restrained weights and clear word hierarchy. Existing decorative serif font import removed; no new font dependency.
- Layout: centered 1120px content matches source width, 16px card gaps, white flat cards with 16–20px radii and generous internal spacing. Existing learning column and narrower queue remain intentional product constraints.
- Color: cool #f5f6f8 canvas, white surfaces, near-black actions, limited blue and orange accents. No decorative shadows on content cards.
- Assets: reference has no raster imagery to reproduce. Reused existing Phosphor icons; removed the previous warm spring illustration.
- Copy: retained vocabulary content and Chinese study labels; no speed-test copy introduced.
- Focused check: word card, segmented status control, search results, and settings were inspected through screenshots and accessibility state. Additional cropped comparisons were unnecessary because controls and typography were readable in the full-size images.
- Responsive: mobile switches to a single column, retains book selection and queue, and provides a fixed status control. DOM width and viewport width both 390px; no horizontal overflow.

## Comparison history
- Initial 1280px screenshot established card rhythm and style match. Preventively constrained the word title width at desktop to reserve space for the status control on longer words.
- Captured the final desktop at the source's exact dimensions and viewed it alongside the source. The above content adaptations are intentional; no remaining blocking visual issues.

## Validation and limitations
- Browser: status switching updates selected state; search for `art` returns articulate; settings opens and closes correctly.
- Browser error/warning log: empty during interaction checks.
- `npm run build`, `npm run check` (TypeScript and all 4 Sites tests) pass.
- Production authentication/API persistence were not exercised; backend and hosting files were not modified. Existing demo navigation limitations remain outside this visual change.

## Implementation checklist
- [x] Shared CSS tokens and reusable existing React components.
- [x] Desktop and mobile rendered verification.
- [x] Existing build and compatibility checks.
- [x] Durable design decisions recorded in AGENTS.md.
