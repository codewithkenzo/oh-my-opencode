export const FINISH_TEMPLATE = `# Finish Command

Run end-of-feature closure workflow from verification to cleanup.

## Step 1: Verify Completion

Run the full verification checklist first (same standard as /verify).
Do not proceed to cleanup when verification fails.

## Step 2: Decide Integration Path

If a worktree/feature branch is active, decide one path:
- --merge: prepare merge workflow
- --pr: prepare pull request workflow
- --keep: keep branch/worktree for later

If no explicit flag is provided, default to recommending --pr for reviewable work.

## Step 3: Worktree Cleanup

1. Check active state using worktree_status.
2. If cleanup is appropriate and not --keep, remove with worktree_remove.
3. Report what was cleaned and what remains.

## Step 4: Ticket Closure

If ticket ids are provided:
1. Inspect ticket state with ticket_show or ticket_list.
2. Close completed tickets with ticket_close and completion reason.

## Step 5: Knowledge Base Hygiene

If architecture, workflows, or conventions changed, update AGENTS.md files accordingly.

## Output Format

1. Verification Outcome
2. Integration Decision (merge/pr/keep)
3. Worktree Actions
4. Ticket Actions
5. AGENTS.md Update Status
6. Final Completion Summary
`
