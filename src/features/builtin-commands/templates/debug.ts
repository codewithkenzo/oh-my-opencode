export const DEBUG_TEMPLATE = `# Debug Command

Use a systematic debugging workflow. Do not jump to random fixes.

## Workflow

### 1) Reproduce
1. Capture exact error message and expected behavior.
2. Define minimal reproduction steps.
3. Confirm issue is reproducible now.

### 2) Gather Evidence
1. Collect logs, stack traces, and failing outputs.
2. Inspect runtime/config state relevant to the bug.
3. Record what is known vs unknown.

### 3) Form Hypothesis
1. Propose likely root causes ranked by probability.
2. Map each hypothesis to observable signals.

### 4) Test Hypothesis
1. Run targeted checks for the highest-probability hypothesis.
2. Confirm or falsify with evidence.
3. Apply minimal fix only after a hypothesis is validated.

### 5) Verify Resolution
1. Re-run reproduction steps.
2. Run relevant tests/typecheck.
3. Confirm no new regressions.

## Escalation Rule

If 3 or more fix attempts fail to resolve the issue, treat it as an architectural problem and escalate to K9 - advisor with collected evidence.

## Output Format

1. Reproduction
2. Evidence
3. Hypotheses
4. Validation Results
5. Fix Applied
6. Verification
7. Escalation Decision
`
