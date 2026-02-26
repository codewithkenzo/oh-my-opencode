export const DEFAULT_WORKTREE_BASE_DIR = ".."
export const DEFAULT_BASE_BRANCH_CANDIDATES = ["main", "master"] as const

export const WORKTREE_CREATE_DESCRIPTION = "Create a new git worktree and branch when needed."
export const WORKTREE_LIST_DESCRIPTION = "List git worktrees using porcelain output parsing."
export const WORKTREE_REMOVE_DESCRIPTION = "Remove a git worktree safely, with dirty-check protection."
export const WORKTREE_STATUS_DESCRIPTION = "Inspect git worktree status, branch sync, and merge state."

export const ERROR_PREFIX = "Error:"
export const DIRTY_WORKTREE_WARNING = "Worktree has uncommitted changes. Re-run with force=true to remove it."
