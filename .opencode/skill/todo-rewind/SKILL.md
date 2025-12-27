---
name: todo-rewind
description: Deep dive into existing todo list items. Systematically review in-progress or completed todos, analyze context and actions taken, identify issues, and retry failed items. Use when revisiting previous work, debugging incomplete tasks, or when user says "go back", "retry", "rewind", "check the todos again".
---

# Todo Rewind - Systematic Todo Review

This skill enables deep, systematic review of existing todo items. Use it when:
- User asks to "go back" or "retry" something
- Tasks seem incomplete or incorrectly marked done
- User is repeating themselves about the same problem
- Need to verify work quality before closing out

## Phase 1: Load Current State
- **Read**: \`todoread()\` to analyze the list.
- **Categorize**: Group by \`in_progress\`, \`completed\`, and \`pending\`.
- **Identify**: Look for incomplete work, vague descriptions, or recurring issues.

## Phase 2: Deep Analysis
- **Context**: Reconstruct the original intent and involved files.
- **Evidence**: Check files, git history, and \`lsp_diagnostics\`.
- **Verification**: For completed items, ensure they actually work as intended.

## Phase 3: Rewind Report
Present findings with a summary of reviewed items, issues found, and a verdict (\`Verified\`, \`Needs Attention\`, \`Failed\`) for each item.

## Phase 4: Execute Fixes
Reopen failed items (\`todowrite\`), create new ones if needed, and execute fixes systematically.

## Anti-Patterns
- Don't rush or assume; verify with evidence.
- Don't leave items dangling.
- Don't ignore user context.


## Trigger Phrases

Activate this skill when user says:
- "go back to the todos"
- "check what we did"
- "retry that task"
- "rewind"
- "review our progress"
- "something's not right"
- "we already did that but..."
- "didn't we already..."
