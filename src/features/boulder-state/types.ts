/**
 * Boulder State Types
 *
 * Manages the active work plan state for Musashi orchestrator.
 * Named after Musashi's boulder - the eternal task that must be rolled.
 */

export interface BoulderState {
  /** Absolute path to the active plan file */
  active_plan: string
  /** ISO timestamp when work started */
  started_at: string
  /** Session IDs that have worked on this plan */
  session_ids: string[]
  /** Plan name derived from filename */
  plan_name: string
  /** Absolute path to active git worktree (set when worktree.auto_create_on_start_work is enabled) */
  worktree_path?: string
}

export interface PlanProgress {
  /** Total number of checkboxes */
  total: number
  /** Number of completed checkboxes */
  completed: number
  /** Whether all tasks are done */
  isComplete: boolean
}
