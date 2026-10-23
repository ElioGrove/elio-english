# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Product decisions

- The visual direction follows the user's speed-test screenshot (2026-10-23): cool light-gray canvas, flat white rounded cards, generous whitespace, neutral sans-serif typography, near-black primary actions, and restrained blue/orange accents. Retain the vocabulary study column and learning-queue rail while applying this shared card language across desktop, mobile, login, and settings.
- Reuse the existing React and Phosphor components; keep component source editable in the repo, centralize design tokens, and avoid duplicate UI/icon dependencies.
- The primary action is studying one word deeply, then assigning 已学会 / 学习中 / 未学习.
- “学习中” is a dedicated manual-review library, not a spaced-repetition score.
- Vocabulary books are ordered from foundational school English through GRE-level vocabulary.
- Cloudflare Workers + D1 is the production runtime; the bundled Sites worker remains intact only for prototype compatibility.
