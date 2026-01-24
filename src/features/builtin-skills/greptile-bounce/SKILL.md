# Greptile Bounce

Autonomous code review loop using Greptile AI. Creates PR, requests review, fixes issues, and repeats until 5/5 score.

## Trigger

- User says "greptile bounce", "bounce with greptile", "greptile review loop"
- After completing implementation work that needs review
- When `/greptile-bounce` command is invoked

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    GREPTILE BOUNCE LOOP                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CREATE PR (if not exists)                               │
│     └─> gh pr create --title "..." --body "..."             │
│                                                             │
│  2. REQUEST REVIEW                                          │
│     └─> Comment: @greptileai review                         │
│     └─> Include context about what to look for              │
│                                                             │
│  3. WAIT FOR REVIEW (2.5 min timeout)                       │
│     └─> Poll PR comments for Greptile response              │
│     └─> DO NOT commit while review in progress              │
│                                                             │
│  4. CHECK SCORE                                             │
│     ├─> 5/5? → DONE, ready to merge                         │
│     └─> <5/5? → Continue to step 5                          │
│                                                             │
│  5. FIX ISSUES                                              │
│     └─> Address each Greptile finding                       │
│     └─> Make minimal, focused fixes                         │
│                                                             │
│  6. COMMIT & PUSH                                           │
│     └─> git add . && git commit -m "fix: ..." && git push   │
│     └─> Return to step 2                                    │
│                                                             │
│  EXIT CONDITIONS:                                           │
│  - Score reaches 5/5                                        │
│  - Max 5 iterations (prevent infinite loops)                │
│  - User cancels                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Commands

### Request Greptile Review

```bash
# Comment on PR to trigger review
gh pr comment <PR_NUMBER> --body "@greptileai please review this PR.

**Context:** <what this PR does>

**Areas to focus on:**
- <specific weakness or concern 1>
- <specific weakness or concern 2>
- <any security/performance considerations>
"
```

### Check Review Status

```bash
# Get latest comments to check for Greptile response
gh pr view <PR_NUMBER> --comments --json comments -q '.comments[-1]'
```

### Parse Greptile Score

Greptile uses a consistent format with `<h3>Confidence Score: X/5</h3>` in their HTML response.

**Primary Detection (Recommended):**
```bash
# Extract score from Greptile's HTML comment
gh pr view <PR_NUMBER> --comments --json comments \
  -q '.comments[] | select(.author.login == "greptile-apps") | .body' \
  | grep -oP 'Confidence Score: \K[0-9]/5' | tail -1
```

**Fallback Detection (if format changes):**
Look for these patterns in the review comment:
- `Confidence Score: X/5` (current Greptile format)
- `Score: X/5`
- `Rating: X/5`
- "Safe to merge" language typically indicates 4/5 or 5/5

**Score Interpretation:**
| Score | Meaning | Action |
|-------|---------|--------|
| 5/5 | No issues found | Ready to merge |
| 4/5 | Minor issues, safe to merge | Fix if quick, otherwise merge |
| 3/5 | Notable issues | Must fix before merge |
| 2/5 | Significant problems | Requires substantial work |
| 1/5 | Critical issues | Likely needs redesign |

**Important:** If Greptile changes their format and detection fails, fall back to reading the review text manually. The key signals are:
- Presence/absence of "Issues Found" section
- Language like "safe to merge" vs "must address"
- Number and severity of bullet points in findings

## Rules

### MUST DO

1. **Wait 2.5 minutes** between requesting review and checking results
2. **Never commit** while a review is still pending
3. **Tag @greptileai** in every review request
4. **Include context** about what the PR does and what to look for
5. **Fix ALL issues** before re-requesting review, not just some
6. **Stop at 5/5** - don't over-iterate once passing

### MUST NOT DO

1. **Don't push multiple commits** before review completes
2. **Don't ignore findings** - address each one or explain why not applicable
3. **Don't merge below 5/5** unless user explicitly approves
4. **Don't exceed 5 iterations** - escalate to user if stuck

## Review Request Template

```markdown
@greptileai please review this PR.

## Context
<Brief description of what this PR accomplishes>

## Changes
<List of main changes/files modified>

## Areas to Focus On
- <Known weakness or area of concern>
- <Security considerations if applicable>
- <Performance implications if applicable>

## What to Ignore
- <Any intentional patterns that might flag as issues>
```

## Integration with Other Workflows

When using greptile-bounce with other skills:

### With TDD Workflow
```
RED → GREEN → REFACTOR → GREPTILE BOUNCE → MERGE
```

### With Feature Dev Workflow
```
SPEC → DESIGN → BUILD → TEST → GREPTILE BOUNCE → MERGE
```

### With Ticket-Driven Workflow
```
TICKET → IMPLEMENT → VERIFY → GREPTILE BOUNCE → CLOSE TICKET
```

## Example Session

```
User: greptile bounce this PR

Agent: Starting Greptile bounce loop for PR #42...

[Iteration 1]
- Requesting review from @greptileai
- Waiting 2.5 minutes for review...
- Review received: 3/5
- Issues found:
  1. Missing error handling in src/tools/foo.ts
  2. Unused import in src/agents/bar.ts
- Fixing issues...
- Committing: "fix: add error handling, remove unused import"
- Pushing changes...

[Iteration 2]
- Requesting review from @greptileai
- Waiting 2.5 minutes for review...
- Review received: 4/5
- Issues found:
  1. Consider adding JSDoc for exported function
- Fixing issues...
- Committing: "docs: add JSDoc to exported functions"
- Pushing changes...

[Iteration 3]
- Requesting review from @greptileai
- Waiting 2.5 minutes for review...
- Review received: 5/5
- No issues found!

✅ Greptile bounce complete! PR #42 ready to merge.
```

## Failure Handling

If stuck after 5 iterations:
1. Summarize remaining issues
2. Ask user for guidance
3. User can either:
   - Force merge with known issues
   - Manually address complex findings
   - Abandon PR and rethink approach
