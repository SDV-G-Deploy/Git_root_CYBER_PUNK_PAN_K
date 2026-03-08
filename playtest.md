# Playtest Build Instructions (v0.1)

1. Start local server from project root:
   - `python -m http.server 8080`
2. Open:
   - `http://localhost:8080/`
3. Enable **Playtest mode (clean UI)** toggle in the playtest panel.
4. Run sessions through levels.
5. Export telemetry:
   - `Export telemetry JSON` or `Export telemetry JSONL`
6. Generate report:
   - Click `Build telemetry report` in-game, or
   - Run `powershell -ExecutionPolicy Bypass -File scripts/telemetry-report.ps1 -InputPath <telemetry.json|jsonl>`