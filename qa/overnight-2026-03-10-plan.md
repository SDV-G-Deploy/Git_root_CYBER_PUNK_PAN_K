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
## Phase 2 implemented improvements
- Improvement A (virus readability):
  - added live `virusThreatCount` in snapshot,
  - HUD now shows `Threatened` count,
  - board now renders dashed threat rings around nodes that are adjacent to active virus nodes and currently at infection risk.
- Improvement B (invalid action readability):
  - added miss/passive-click marker VFX (pink cross/ring) on failed clicks,
  - marker is transient and lightweight, no rule changes.
- Validation:
  - normal play flow preserved,
  - hint flow still works,
  - no duplicate `run_end` observed in targeted checks.
## Phase 3 content batch (completed)
- Curated existing `L18` to reduce late-game near-duplicate overlap with `L17`:
  - changed topology (split source lane + dedicated virus-pressured relay lane),
  - reduced `movesLimit` from `9` to `6` to lower random-click drift.
- Added 4 new handcrafted levels targeting early/easy and early-medium variety:
  - `L21 Twin Injectors` (dual-source commit pattern),
  - `L22 Switchback Gate` (single-gate route timing),
  - `L23 Median Filter` (virus-aware lane selection),
  - `L24 Purge Junction` (clean-corruption objective in a compact layout).
- Validation after batch:
  - `24/24` levels solvable,
  - `0` search cutoffs,
  - no protected-system changes.

## Phase 4 pack rebuild + diagnostics (completed)
- Rebuilt pack with unchanged slot contracts and difficulty semantics.
- Result: `10/10` slots filled (no hidden difficulty downgrades).
- New slot map:
  - `#1 warmup -> L1`
  - `#2 easy -> L4`
  - `#3 easy -> L21`
  - `#4 medium -> L22`
  - `#5 medium -> L23`
  - `#6 medium -> L13`
  - `#7 hard -> L15`
  - `#8 hard -> L12`
  - `#9 challenge -> L16`
  - `#10 boss -> L20`
- Remaining rejection signal:
  - `solution_count_extremely_high: 1` (unchanged type of degeneracy warning, now isolated).
- Practical repetition watchlist (for next content pass):
  - `L5/L6/L22` (same firewall-branch archetype family),
  - `L9/L11/L23` (same virus-firewall archetype family),
  - `L17/L18/L19` (same late mixed archetype family, but now less direct duplication than baseline).

## Continuation pass summary
- Completed targeted de-repetition patch for level families:
  - `L5/L6/L22` (changed `L6` topology/objective),
  - `L9/L11/L23` (changed `L23` topology to include overload branch).
- Regression checks passed:
  - `validate-levels`: 24/24 solvable,
  - `build-pack`: 10/10 slots filled,
  - slot semantics unchanged.
- No protected systems touched (daily/seed/classifier/slot contracts unchanged).

## Continuation pass #2 summary
- Updated `L9` topology to remove mirrored-virus fork overlap with `L11`.
- Updated `L14` objective profile (`activate_all`) to reduce same-pattern completion behavior vs `L13`.
- Regression checks passed:
  - validate: 24/24 solvable,
  - pack: 10/10 slots,
  - contracts unchanged.
