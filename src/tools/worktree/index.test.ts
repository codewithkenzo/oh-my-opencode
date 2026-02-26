import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { worktree_create, worktree_list, worktree_remove, worktree_status } from "./tools"

const mockContext = { directory: "/repo/oh-my-opencode-v3" } as never

function createProc(opts: { stdout?: string; stderr?: string; exitCode?: number }) {
  const stdoutText = opts.stdout ?? ""
  const stderrText = opts.stderr ?? ""
  const exitCode = opts.exitCode ?? 0
  const encoder = new TextEncoder()

  return {
    stdout: new ReadableStream({
      start(controller) {
        if (stdoutText) controller.enqueue(encoder.encode(stdoutText))
        controller.close()
      },
    }),
    stderr: new ReadableStream({
      start(controller) {
        if (stderrText) controller.enqueue(encoder.encode(stderrText))
        controller.close()
      },
    }),
    exited: Promise.resolve(exitCode),
    exitCode,
  } as unknown as ReturnType<typeof Bun.spawn>
}

describe("worktree tools", () => {
  let spawnSpy: ReturnType<typeof spyOn>

  afterEach(() => {
    spawnSpy?.mockRestore()
  })

  it("worktree_create computes correct path from branch name", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")

      if (cmd.join(" ") === "git show-ref --verify --quiet refs/heads/feat/new-api") {
        return createProc({ exitCode: 1 })
      }

      if (cmd.join(" ") === "git branch --show-current") {
        return createProc({ stdout: "main\n" })
      }

      if (cmd.join(" ") === "git worktree add /repo/oh-my-opencode-v3-feat-new-api -b feat/new-api main") {
        return createProc({ stdout: "Preparing worktree\n" })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_create.execute(
      { branch: "feat/new-api" },
      { directory: "/repo/oh-my-opencode-v3" } as never,
    )
    const parsed = JSON.parse(output as string) as { path: string; branch: string; branch_existed: boolean }

    // #then
    expect(parsed.path).toBe("/repo/oh-my-opencode-v3-feat-new-api")
    expect(parsed.branch).toBe("feat/new-api")
    expect(parsed.branch_existed).toBe(false)
  })

  it("worktree_list parses porcelain output correctly", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")
      if (cmd.join(" ") === "git worktree list --porcelain") {
        return createProc({
          stdout: [
            "worktree /repo/main",
            "HEAD abc123",
            "branch refs/heads/main",
            "",
            "worktree /repo/feat-x",
            "HEAD def456",
            "branch refs/heads/feat/x",
            "prunable gitdir file points to non-existent location",
            "",
          ].join("\n"),
        })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_list.execute({}, mockContext)
    const parsed = JSON.parse(output as string) as {
      worktrees: Array<{ path: string; branch: string | null; head: string; prunable: boolean }>
    }

    // #then
    expect(parsed.worktrees).toHaveLength(2)
    expect(parsed.worktrees[0]).toEqual({ path: "/repo/main", branch: "main", head: "abc123", prunable: false })
    expect(parsed.worktrees[1]).toEqual({ path: "/repo/feat-x", branch: "feat/x", head: "def456", prunable: true })
  })

  it("worktree_remove on dirty worktree returns warning when force is false", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")
      if (cmd.join(" ") === "git -C /repo/wt status --porcelain") {
        return createProc({ stdout: " M src/index.ts\n" })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_remove.execute({ path: "/repo/wt" }, mockContext)
    const parsed = JSON.parse(output as string) as { removed: boolean; warning?: string }

    // #then
    expect(parsed.removed).toBe(false)
    expect(parsed.warning).toContain("uncommitted changes")
  })

  it("worktree_remove on dirty worktree removes when force is true", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")

      if (cmd.join(" ") === "git -C /repo/wt status --porcelain") {
        return createProc({ stdout: " M src/index.ts\n" })
      }

      if (cmd.join(" ") === "git worktree remove --force /repo/wt") {
        return createProc({ stdout: "" })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_remove.execute({ path: "/repo/wt", force: true }, mockContext)
    const parsed = JSON.parse(output as string) as { removed: boolean; path: string }

    // #then
    expect(parsed.removed).toBe(true)
    expect(parsed.path).toBe("/repo/wt")
  })

  it("worktree_remove on clean worktree removes successfully", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")

      if (cmd.join(" ") === "git -C /repo/wt-clean status --porcelain") {
        return createProc({ stdout: "" })
      }

      if (cmd.join(" ") === "git worktree remove /repo/wt-clean") {
        return createProc({ stdout: "" })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_remove.execute({ path: "/repo/wt-clean" }, mockContext)
    const parsed = JSON.parse(output as string) as { removed: boolean; path: string }

    // #then
    expect(parsed.removed).toBe(true)
    expect(parsed.path).toBe("/repo/wt-clean")
  })

  it("worktree_status returns structured status info", async () => {
    // #given
    spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected Bun.spawn input")

      if (cmd.join(" ") === "git -C /repo/wt status --porcelain") {
        return createProc({ stdout: " M src/index.ts\n" })
      }

      if (cmd.join(" ") === "git -C /repo/wt rev-parse --abbrev-ref HEAD") {
        return createProc({ stdout: "feat/new-api\n" })
      }

      if (cmd.join(" ") === "git -C /repo/wt rev-list --left-right --count @{upstream}...HEAD") {
        return createProc({ stdout: "1\t2\n" })
      }

      if (cmd.join(" ") === "git -C /repo/wt branch --merged main") {
        return createProc({ stdout: "  main\n* feat/new-api\n" })
      }

      throw new Error(`Unexpected Bun.spawn call: ${cmd.join(" ")}`)
    })

    // #when
    const output = await worktree_status.execute({ path: "/repo/wt" }, mockContext)
    const parsed = JSON.parse(output as string) as {
      path: string
      branch: string
      dirty: boolean
      ahead: number | null
      behind: number | null
      merged_into_base: boolean | null
      base_branch: string | null
    }

    // #then
    expect(parsed.path).toBe("/repo/wt")
    expect(parsed.branch).toBe("feat/new-api")
    expect(parsed.dirty).toBe(true)
    expect(parsed.behind).toBe(1)
    expect(parsed.ahead).toBe(2)
    expect(parsed.merged_into_base).toBe(true)
    expect(parsed.base_branch).toBe("main")
  })
})
