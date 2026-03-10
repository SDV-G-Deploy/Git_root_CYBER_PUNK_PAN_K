# AGENTS.md

## Scope
This file applies only to the CyberPunkPuzzleWars project folder.

## Required Reading Before Any Non-Trivial Task
Always read these files first:
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md` (if present)

Use repository state as source of truth if docs are stale.
If docs are stale, update them before finalizing a meaningful pass.

## Working Directory Rule
Work only inside the local CyberPunkPuzzleWars repository folder.
Do not switch to unrelated sibling projects.
Do not assume cloud-only state as source of truth.
If any task needs files outside this repo root, ask the user first.

## Git Workflow
Default workflow:
1. Inspect current branch and `git status`.
2. Make minimal, scoped local changes.
3. Run relevant validation/check commands.
4. Commit only scoped changes.
5. Push only when explicitly requested by the user.

Do not mix unrelated local files into the same commit.
Do not commit asset folders or unrelated root-level files unless the task explicitly requires it.

## Scope Discipline
Do not expand scope without explicit instruction.
Do not rewrite unrelated systems.
Prefer minimal, surgical edits over broad refactors.

## Protected Systems
Do not touch these unless explicitly requested:
- Splitter
- Fuse/Stabilizer
- Delay
- Campaign systems
- Unrelated asset folders
- Unrelated root-level experimental files

## Validation Workflow
Before reporting completion, run relevant existing checks.

Current known commands:
- `powershell -ExecutionPolicy Bypass -File scripts\build-pack.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts\validate-levels.ps1`

If validation cannot be run, say so explicitly.

## Project Memory Maintenance (Mandatory)
After any meaningful implementation, bugfix, recovery, or balance pass:
- Update `PROJECT_STATE.md` if implemented behavior, known limitations, or recommended next step changed.
- Append a short factual entry to `SESSION_LOG.md`.
- Append a concise technical summary to `CHANGELOG_AGENT.md` if files or mechanics changed.

Keep updates concise and factual.

## Reporting Format
At the end of each meaningful pass, report:
1. What changed
2. Files changed
3. Validation results
4. Whether protected systems were touched
5. Known limitations
6. Recommended next step

## Local Safety Notes
- Do not run broad text replacements over entire files.
- After editing HTML with inline JS, verify parse safety.
- If UI suddenly disappears, first suspect JS parse failure.
