export interface WorktreeInfo {
  path: string
  branch: string | null
  head: string
  prunable: boolean
}

export interface WorktreeCreateResult {
  message: string
  path: string
  branch: string
  base_branch: string | null
  branch_existed: boolean
}

export interface WorktreeListResult {
  worktrees: WorktreeInfo[]
}

export interface WorktreeRemoveResult {
  message: string
  path: string
  removed: boolean
  warning?: string
}

export interface WorktreeStatus {
  path: string
  branch: string
  dirty: boolean
  ahead: number | null
  behind: number | null
  base_branch: string | null
  merged_into_base: boolean | null
}
