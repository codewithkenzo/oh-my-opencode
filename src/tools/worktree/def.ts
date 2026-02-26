import { tool } from "@opencode-ai/plugin/tool"
import {
  WORKTREE_CREATE_DESCRIPTION,
  WORKTREE_LIST_DESCRIPTION,
  WORKTREE_REMOVE_DESCRIPTION,
  WORKTREE_STATUS_DESCRIPTION,
} from "./constants"

export const worktree_createDef = {
  description: WORKTREE_CREATE_DESCRIPTION,
  args: {
    branch: tool.schema.string().describe("Branch name for the worktree"),
    base_branch: tool.schema
      .string()
      .optional()
      .describe("Base branch to create from (defaults to current branch)"),
    path: tool.schema.string().optional().describe("Target worktree path (auto-computed when omitted)"),
  },
}

export const worktree_listDef = {
  description: WORKTREE_LIST_DESCRIPTION,
  args: {},
}

export const worktree_removeDef = {
  description: WORKTREE_REMOVE_DESCRIPTION,
  args: {
    path: tool.schema.string().describe("Path of the worktree to remove"),
    force: tool.schema.boolean().optional().describe("Force removal even with uncommitted changes"),
  },
}

export const worktree_statusDef = {
  description: WORKTREE_STATUS_DESCRIPTION,
  args: {
    path: tool.schema.string().describe("Path of the worktree to inspect"),
  },
}

export const worktreeToolDefs = {
  worktree_create: worktree_createDef,
  worktree_list: worktree_listDef,
  worktree_remove: worktree_removeDef,
  worktree_status: worktree_statusDef,
}
