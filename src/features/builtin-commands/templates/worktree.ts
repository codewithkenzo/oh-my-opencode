export const WORKTREE_TEMPLATE = `# Worktree Command

Manage git worktrees using dedicated worktree tools.

## Supported Forms

- /worktree create <name>
- /worktree list
- /worktree remove <name>
- /worktree status

## Execution Rules

1. Parse user arguments and detect the subcommand.
2. Use only these tools for worktree operations:
   - worktree_create
   - worktree_list
   - worktree_remove
   - worktree_status
3. Do not use raw git worktree shell commands when tool equivalents exist.

## Subcommand Behavior

### create <name>
- Validate name is present.
- Call worktree_create with the requested name.
- Return created path, branch, and current status.

### list
- Call worktree_list.
- Return all worktrees with branch and clean/dirty state.

### remove <name>
- Validate name is present.
- Call worktree_status first to verify state.
- If removable, call worktree_remove for that target.
- Report what was removed.

### status
- Call worktree_status.
- Report active worktree details and health.

## Output Format

Return:
1. Parsed subcommand
2. Tool calls made
3. Result summary
4. Next-step guidance if command input is incomplete
`
