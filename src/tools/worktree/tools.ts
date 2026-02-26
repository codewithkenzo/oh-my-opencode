import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { basename, isAbsolute, resolve } from "node:path"
import {
  DEFAULT_BASE_BRANCH_CANDIDATES,
  DEFAULT_WORKTREE_BASE_DIR,
  DIRTY_WORKTREE_WARNING,
  ERROR_PREFIX,
} from "./constants"
import { worktree_createDef, worktree_listDef, worktree_removeDef, worktree_statusDef } from "./def"
import type {
  WorktreeCreateResult,
  WorktreeInfo,
  WorktreeListResult,
  WorktreeRemoveResult,
  WorktreeStatus,
} from "./types"

type GitCommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

type ToolContextLike = {
  directory?: string
}

function getWorkingDirectory(context?: ToolContextLike): string {
  return context?.directory ?? process.cwd()
}

function sanitizeBranchForPath(branch: string): string {
  return branch.replace(/[\\/]/g, "-")
}

function normalizePath(inputPath: string, cwd: string): string {
  if (isAbsolute(inputPath)) return inputPath
  return resolve(cwd, inputPath)
}

function computeDefaultWorktreePath(cwd: string, branch: string): string {
  const projectName = basename(cwd)
  const safeBranch = sanitizeBranchForPath(branch)
  return resolve(cwd, DEFAULT_WORKTREE_BASE_DIR, `${projectName}-${safeBranch}`)
}

async function runGit(args: string[], cwd?: string): Promise<GitCommandResult> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
    proc.exited,
  ])

  return { stdout, stderr, exitCode }
}

function parseBranchRef(branchLine: string | null): string | null {
  if (!branchLine) return null
  if (branchLine.startsWith("refs/heads/")) return branchLine.slice("refs/heads/".length)
  return branchLine
}

function parsePorcelainWorktreeList(stdout: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = []
  const lines = stdout.split(/\r?\n/)

  let current: WorktreeInfo | null = null

  const pushCurrent = () => {
    if (current && current.path) {
      worktrees.push(current)
    }
    current = null
  }

  for (const line of lines) {
    if (!line.trim()) {
      pushCurrent()
      continue
    }

    if (line.startsWith("worktree ")) {
      pushCurrent()
      current = {
        path: line.slice("worktree ".length).trim(),
        branch: null,
        head: "",
        prunable: false,
      }
      continue
    }

    if (!current) continue

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length).trim()
      continue
    }

    if (line.startsWith("branch ")) {
      const raw = line.slice("branch ".length).trim()
      current.branch = parseBranchRef(raw)
      continue
    }

    if (line.startsWith("prunable")) {
      current.prunable = true
    }
  }

  pushCurrent()

  return worktrees
}

function normalizeError(message: string): string {
  return `${ERROR_PREFIX} ${message}`
}

export const worktree_create: ToolDefinition = tool({
  ...worktree_createDef,
  async execute({ branch, base_branch, path }, context) {
    try {
      const cwd = getWorkingDirectory(context)
      const targetPath = normalizePath(path ?? computeDefaultWorktreePath(cwd, branch), cwd)

      const branchCheck = await runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], cwd)
      const branchExists = branchCheck.exitCode === 0

      let baseBranch: string | null = null
      let addResult: GitCommandResult

      if (branchExists) {
        addResult = await runGit(["worktree", "add", targetPath, branch], cwd)
      } else {
        if (base_branch) {
          baseBranch = base_branch
        } else {
          const currentBranchResult = await runGit(["branch", "--show-current"], cwd)
          if (currentBranchResult.exitCode !== 0) {
            return normalizeError(currentBranchResult.stderr.trim() || "Failed to determine current branch")
          }
          baseBranch = currentBranchResult.stdout.trim() || null
        }

        const addArgs = ["worktree", "add", targetPath, "-b", branch]
        if (baseBranch) addArgs.push(baseBranch)
        addResult = await runGit(addArgs, cwd)
      }

      if (addResult.exitCode !== 0) {
        return normalizeError(addResult.stderr.trim() || "Failed to create worktree")
      }

      const result: WorktreeCreateResult = {
        message: `Created worktree at ${targetPath}`,
        path: targetPath,
        branch,
        base_branch: baseBranch,
        branch_existed: branchExists,
      }

      return JSON.stringify(result)
    } catch (error) {
      return normalizeError(error instanceof Error ? error.message : String(error))
    }
  },
})

export const worktree_list: ToolDefinition = tool({
  ...worktree_listDef,
  async execute(_args, context) {
    try {
      const cwd = getWorkingDirectory(context)
      const result = await runGit(["worktree", "list", "--porcelain"], cwd)

      if (result.exitCode !== 0) {
        return normalizeError(result.stderr.trim() || "Failed to list worktrees")
      }

      const payload: WorktreeListResult = {
        worktrees: parsePorcelainWorktreeList(result.stdout),
      }

      return JSON.stringify(payload)
    } catch (error) {
      return normalizeError(error instanceof Error ? error.message : String(error))
    }
  },
})

export const worktree_remove: ToolDefinition = tool({
  ...worktree_removeDef,
  async execute({ path, force = false }) {
    try {
      const statusResult = await runGit(["-C", path, "status", "--porcelain"])
      if (statusResult.exitCode !== 0) {
        return normalizeError(statusResult.stderr.trim() || `Failed to inspect worktree at ${path}`)
      }

      const isDirty = statusResult.stdout.trim().length > 0
      if (isDirty && !force) {
        const warning: WorktreeRemoveResult = {
          message: DIRTY_WORKTREE_WARNING,
          path,
          removed: false,
          warning: DIRTY_WORKTREE_WARNING,
        }
        return JSON.stringify(warning)
      }

      const removeArgs = force
        ? ["worktree", "remove", "--force", path]
        : ["worktree", "remove", path]
      const removeResult = await runGit(removeArgs)
      if (removeResult.exitCode !== 0) {
        return normalizeError(removeResult.stderr.trim() || `Failed to remove worktree at ${path}`)
      }

      const payload: WorktreeRemoveResult = {
        message: `Removed worktree at ${path}`,
        path,
        removed: true,
      }

      return JSON.stringify(payload)
    } catch (error) {
      return normalizeError(error instanceof Error ? error.message : String(error))
    }
  },
})

export const worktree_status: ToolDefinition = tool({
  ...worktree_statusDef,
  async execute({ path }) {
    try {
      const statusResult = await runGit(["-C", path, "status", "--porcelain"])
      if (statusResult.exitCode !== 0) {
        return normalizeError(statusResult.stderr.trim() || `Failed to inspect worktree at ${path}`)
      }
      const dirty = statusResult.stdout.trim().length > 0

      const branchResult = await runGit(["-C", path, "rev-parse", "--abbrev-ref", "HEAD"])
      if (branchResult.exitCode !== 0) {
        return normalizeError(branchResult.stderr.trim() || `Failed to get branch for ${path}`)
      }
      const branch = branchResult.stdout.trim()

      let ahead: number | null = null
      let behind: number | null = null
      const aheadBehindResult = await runGit(["-C", path, "rev-list", "--left-right", "--count", "@{upstream}...HEAD"])
      if (aheadBehindResult.exitCode === 0) {
        const counts = aheadBehindResult.stdout.trim().split(/\s+/)
        const behindCount = Number.parseInt(counts[0] ?? "", 10)
        const aheadCount = Number.parseInt(counts[1] ?? "", 10)
        behind = Number.isNaN(behindCount) ? null : behindCount
        ahead = Number.isNaN(aheadCount) ? null : aheadCount
      }

      let baseBranch: string | null = null
      let mergedIntoBase: boolean | null = null

      for (const candidate of DEFAULT_BASE_BRANCH_CANDIDATES) {
        const mergedResult = await runGit(["-C", path, "branch", "--merged", candidate])
        if (mergedResult.exitCode !== 0) {
          continue
        }

        const mergedBranches = mergedResult.stdout
          .split(/\r?\n/)
          .map((line) => line.replace(/^\*\s*/, "").trim())
          .filter(Boolean)

        baseBranch = candidate
        mergedIntoBase = mergedBranches.includes(branch)
        break
      }

      const payload: WorktreeStatus = {
        path,
        branch,
        dirty,
        ahead,
        behind,
        base_branch: baseBranch,
        merged_into_base: mergedIntoBase,
      }

      return JSON.stringify(payload)
    } catch (error) {
      return normalizeError(error instanceof Error ? error.message : String(error))
    }
  },
})

export const worktreeTools: Record<string, ToolDefinition> = {
  worktree_create,
  worktree_list,
  worktree_remove,
  worktree_status,
}
