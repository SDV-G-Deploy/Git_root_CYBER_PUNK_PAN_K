# Hint System (Chain Lab)

## How hints are produced
- Hints are generated from the live game state in `src/hints.js`.
- The system evaluates current objectives, infection/overload risk, and clickable nodes.
- For stronger hints, it runs bounded in-memory action simulation (no engine refactor, no autoplay).
- The feature does not depend on run summary state and does not write to save data.

## Tier behavior
- Tier 1 (directional): non-spoilery guidance, usually points to risk or blocked routing.
- Tier 2 (action-level): suggests a concrete next interaction (`nodeId`) with short reasoning.
- Tier 3 (strong): near-solution guidance for the next meaningful move; may include an optional second focus node.

## Integration notes
- UI trigger: `#hintButton` in HUD.
- Repeated presses escalate `1 -> 2 -> 3` and stay at tier 3.
- Hint state resets on level restart/switch and after any valid committed move.
- Telemetry emits:
  - `hint_requested`
  - `hint_tier_shown`
- Existing run lifecycle events (`run_start`, `run_end`) are unchanged.

## Manual QA checklist
1. Press `Hint` three times in one run: tier increments `1/3`, `2/3`, `3/3`.
2. Retry level: hint tier/message/highlight reset to default.
3. Change level from selector: hint tier/message/highlight reset.
4. Make a valid move after showing hint: tier resets and next request starts from tier 1.
5. Verify board highlight tracks `targetNodeId` and updates on new hint.
6. Verify `hint_requested` and `hint_tier_shown` appear in telemetry export.
7. Confirm no duplicate or broken `run_end` behavior after repeated hint usage.
