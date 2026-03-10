# Overnight Execution Checklist (2026-03-10)

## Baseline audit
- Hint system status: implemented (`b27b8fb`), requires runtime validation only.
- Solver validation baseline: 20/20 levels solvable, zero search cutoffs.
- Repetition signals from baseline validation:
  - Single-path early levels: `L1`, `L2`, `L4`, `L10`, `L13`, `L14`.
  - Strong similarity pairs in practical play style: `L5/L6`, `L13/L14`, `L17/L18`.
- Pack baseline:
  - accepted 9/10, unfilled slot `#3 easy`.
  - key rejection reasons for missing easy slot: `actual_difficulty_above_slot_max`, `complexity_above_slot_max`.
- Protected-system proximity check:
  - no active daily puzzle generation codepath found in `src/` or `tools/qa/`.
  - deterministic seed references only in roadmap/docs; no nightly changes planned there.

## Locked phase order
1. Phase 1: Validate/fix minimal Hint System only.
2. Phase 2: Add only 1-2 visible readability/feel upgrades (virus readability prioritized).
3. Phase 3: Add curated early/early-mid distinct levels to reduce repetition and easy-slot deficit.
4. Phase 4: Rebuild packs honestly and output decision-useful diagnostics.

## Guardrails for this run
- No broad refactor.
- No solver rewrite.
- No telemetry lifecycle redesign.
- No daily/seed format changes.
- No slot-threshold semantic changes.
- Fill deficits via better content, not weaker contracts.
## Phase 1 validation snapshot
- Hint escalation verified: `1 -> 2 -> 3`, then caps at tier 3.
- Hint reset verified on:
  - retry/reset level,
  - level switch,
  - new run after valid move.
- Hint telemetry events verified:
  - `hint_requested`,
  - `hint_tier_shown`.
- Lifecycle guard check:
  - duplicate `run_end` count remained `0` in stress sequence (hint + reset + level switch).
- No additional code fix needed in Phase 1.
