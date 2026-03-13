# CyberPunkPuzzleWars

## Active Runtime
- Entry path: `index.html -> src/bootstrap.js -> src/engine.js`
- Live gameplay, campaign content, UI, and persistence are in `src/`
- Root-level `game.js`, `main.js`, and `levels.js` are legacy and are not used by the live runtime

## Campaign Flow
- Runtime loads the full authored campaign from `src/levels.js`
- Current authored campaign size: 46 levels (`L1`-`L46`)
- Player progression uses save data in local storage (`src/persistence.js`)

## Authored Campaign vs Structured Pack
- `src/levels.js` = full authored campaign used in the live game
- `tools/qa/build-pack.mjs` = structured pack curation tool for QA and balancing diagnostics
- Pack output does not replace the live campaign list unless explicitly wired into runtime

## QA Commands
- Validate authored levels:
  - `powershell -ExecutionPolicy Bypass -File scripts\validate-levels.ps1`
- Build structured QA pack report:
  - `powershell -ExecutionPolicy Bypass -File scripts\build-pack.ps1`
- Runtime smoke checks:
  - `powershell -ExecutionPolicy Bypass -File scripts\runtime-smoke.ps1`

## Sprite Assets`r`n- Main gameplay node sprites are loaded from `SPRITES_IMAGES/` via `src/sprites.js` with primitive fallback in `src/render.js``r`n`r`n## Safe Editing Notes
- For gameplay/content changes, edit `src/levels.js` and rerun all QA commands above
- For player-facing HUD/tutorial behavior, edit `index.html`, `styles.css`, and `src/ui.js`
- Keep protected mechanics stable unless intentionally scoped: Splitter, Fuse/Stabilizer, Delay, and classifier/slot semantics

