export const REVIEW_TEMPLATE = `# Review Command

Run a structured read-only code review.

## Review Mode

- READ-ONLY: do not modify files, do not apply patches, do not refactor code.
- Focus on objective findings and concrete evidence.

## Stage 1: Spec Compliance Review

1. Identify the requirement source from user arguments.
2. Inspect recent changes using git diff and relevant git log history.
3. Check whether implementation matches acceptance criteria.
4. Flag missing requirements and incorrect behavior.

## Stage 2: Code Quality Review

Review the target for:
- Logic correctness and edge case handling
- Security and data safety issues
- Performance risks
- Architectural consistency with repository patterns
- Test coverage gaps and brittle tests

## Verification Requirement

Before finalizing review:
1. Verify test status from existing outputs/commands.
2. If tests were not run, explicitly mark review confidence as reduced.

## Required Evidence

Use concrete evidence in findings:
- file path and line reference
- observed behavior or code pattern
- impact and severity

## Output Format

1. Scope Reviewed
2. Spec Compliance Findings
3. Code Quality Findings
4. Risk Summary (Critical/High/Medium/Low)
5. Test Status and Confidence
6. Recommended Fix Priorities (no code changes)
`
