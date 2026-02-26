export const VERIFY_TEMPLATE = `# Verify Command

Run verification before claiming any task is complete.

## Core Principle

Evidence before assertions. No success claims without command output.

## Verification Checklist

1. Run tests
   - Use project test command (for example: bun test)
2. Run typecheck
   - Use project typecheck command (for example: bun run typecheck)
3. Check acceptance criteria
   - Cross-check plan or ticket requirements against delivered behavior
4. Review changes
   - Inspect git diff for scope, correctness, and unintended edits
5. Capture evidence
   - Include real command output excerpts and status, not summaries like "it works"

## Reporting Rules

- If any command fails, report failure clearly and stop completion claim.
- If criteria are partially met, list exact gaps.
- If verification cannot run, explain why and provide a concrete follow-up command list.

## Output Format

1. Verification Commands Run
2. Command Outputs (key lines)
3. Acceptance Criteria Check
4. Diff Review Notes
5. Final Status: PASS or FAIL
6. Remaining Actions (if FAIL)
`
