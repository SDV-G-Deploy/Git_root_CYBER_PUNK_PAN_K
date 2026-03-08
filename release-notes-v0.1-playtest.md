# v0.1 Playtest Release Notes

## Build focus
- Chain Lab first playable with 12 handcrafted levels and win/lose progression.
- Added lightweight meta progression (`tech_parts`, two starter upgrades, local save).
- Added playtest mode toggle for clean UI sessions.

## Telemetry and reporting
- Session telemetry export supports JSON and JSONL.
- Added local report generation for:
  - average session length
  - retry rate
  - level completion funnel (L01-L12)
  - top fail levels
- Added PowerShell report helper: `scripts/telemetry-report.ps1`.

## Stability and UX
- Improved feedback pass: hit flash, screen shake, particle bursts, chain step cues.
- Outcome flow reduced clicks: arena click + keyboard shortcuts for retry/next.

## Notes
- Build is standalone web (vanilla HTML/CSS/JS), no backend and no external SDKs.