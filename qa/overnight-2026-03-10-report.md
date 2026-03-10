# Overnight Report (2026-03-10)

## Starting state
- Base branch: `main`
- Baseline checkpoint commit created before work: `44abaa4` (`chore(checkpoint): overnight baseline before phase execution`)
- Baseline pack state: `9/10` slots filled, `easy #3` unfilled.

## Phases completed
1. Phase 0: Repo audit + plan lock.
2. Phase 1: Minimal hint system validation (no additional architecture changes).
3. Phase 2: 2 player-facing readability improvements.
4. Phase 3: Curated level content batch for variety + easy-slot deficit.
5. Phase 4: Honest pack rebuild + diagnostics.

## Changed files this overnight slice
- `src/levels.js`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `qa/overnight-2026-03-10-plan.md`

## Gameplay-facing updates
- Hint system remained in approved minimal scope and was validated:
  - tier escalation `1 -> 2 -> 3`,
  - reset on retry/level switch/new run,
  - no lifecycle regression observed.
- Readability updates (from Phase 2) remained active:
  - virus threat rings + HUD threatened count,
  - invalid click marker feedback.

## Content updates (Phase 3)
- Curated `L18` to reduce direct late-game overlap with `L17`.
- Added new handcrafted levels:
  - `L21 Twin Injectors`
  - `L22 Switchback Gate`
  - `L23 Median Filter`
  - `L24 Purge Junction`

## Validation results
- Level validation: `24/24` solvable, `0` unsolved, `0` search cutoffs.
- Pack builder (unchanged contracts): `10/10` slots filled.
- Slot map:
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

## Repetition / duplication diagnostics
- Exact topology duplicates in selected pack: none.
- Remaining archetype clusters to watch in future passes:
  - `L5/L6/L22`
  - `L9/L11/L23`
  - `L17/L18/L19`

## Protected-system status
- Daily puzzle selection/output format: untouched.
- Daily seed mapping / reproducibility: untouched.
- Difficulty classifier semantics: untouched.
- Slot threshold semantics: untouched.
- Generator heuristics: untouched.

## Remaining bottlenecks
- Several easy-like levels are still single-path (`L1/L4/L13/L14/L24`), which can feel predictable.
- Medium pool still leans on repeated firewall-branch families.
- One high-solution degeneracy rejection remains (`solution_count_extremely_high: 1`).

## Recommended next human-guided step
- Run a focused content pass on the `L5/L6/L22` archetype family:
  - keep mechanics,
  - vary objective mix and branch commitments,
  - target medium-depth decisions without inflating raw solution count.

## Continuation Pass (post-report)

### Scope
- Focused content de-repetition pass only (no engine refactor).
- Targeted archetype families:
  - `L5/L6/L22` (firewall branch training overlap)
  - `L9/L11/L23` (virus+firewall overlap)

### Changes made
- `L6 Branch Lock` redesigned into a direct-vs-relay gate decision:
  - reduced node count (`5 -> 4`),
  - added `activate_all` objective,
  - reduced branch mirroring with `L5`/`L22`.
- `L23 Median Filter` redesigned into relay-vs-overload choice under virus pressure:
  - replaced second relay with overload node,
  - kept medium fit (`actual=medium`) with `targetCharge=6`,
  - preserved pack compatibility for medium slot.

### Validation
- Level validation: `24/24` solvable, `0` cutoffs.
- Pack rebuild: still `10/10` slots filled.
- Updated medium slots now include both revised content levels:
  - `#4 -> L23`
  - `#5 -> L22`

### Repetition impact
- Prior highest-cluster pair `L6/L22` removed from top near-duplicate list.
- Virus family overlap reduced for `L23` (`L9/L23` and `L11/L23` down to lower-score similarity bucket).
- Remaining strong clusters are now concentrated in:
  - `L5/L22`,
  - `L9/L11`,
  - `L13/L14`,
  - `L17/L18/L19`.

## Continuation Pass #2

### Scope
- Targeted remaining repetition clusters:
  - `L9/L11`
  - `L13/L14`

### Changes made
- `L9 Virus Wake` rebuilt into a compact 5-node intro-virus scenario:
  - one relay lane instead of mirrored two-relay fork,
  - direct firewall-to-core branch retained,
  - keeps early virus teaching intent with clearer lane commitment.
- `L14 Split Feed` now requires activation quality, not only raw charge:
  - objective set changed to `power_core + activate_all`.

### Validation
- `24/24` levels solvable, `0` cutoffs.
- Pack remains honest and full: `10/10` slots.

### Repetition impact
- Strong pair `L9-L11` no longer appears in top near-duplicate list.
- `L13-L14` reduced from highest similarity bucket to lower bucket.
- Remaining strongest clusters now:
  - `L5/L22`
  - `L17/L18/L19`

## Continuation Pass #3

### Scope
- Final targeted pass on remaining strongest repetition clusters:
  - `L5/L22`
  - `L17/L18/L19`

### Changes made
- `L22 Switchback Gate` reauthored into a distinct firewall+overload medium puzzle:
  - added overload branch,
  - added weak direct lane for timing choice,
  - preserved medium-slot fitness in pack assembly.
- `L18 Crossfire District` objective profile expanded:
  - now `power_core + clean_corruption`.
- `L19 Zero Infection` reauthored from overload-lane variant into a two-relay late-game route:
  - tighter move budget,
  - lower random-click solution inflation,
  - now valid challenge candidate instead of degeneracy-rejected outlier.

### Validation
- `24/24` levels solvable.
- `0` search cutoffs.
- Pack remains honest and full: `10/10` slots.
- Rejection count in current pack build: `0`.

### Repetition impact
- Highest near-duplicate bucket reduced from `14` to `12`.
- Previous strongest duplicate-family signal (`L17/L18/L19` at 14-level similarity) is reduced.
- Current top similarity rows are now mid-range (`12`) and no longer include 14-level collisions.
