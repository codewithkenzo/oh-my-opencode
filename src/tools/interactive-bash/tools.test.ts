import { afterEach, describe, expect, it, spyOn } from "bun:test"
import * as utils from "./utils"
import { interactive_bash, tokenizeCommand } from "./tools"

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
    kill: () => {},
  } as unknown as ReturnType<typeof Bun.spawn>
}

describe("interactive_bash tool", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given blocked subcommand #when execute #then returns guidance instead of running tmux", async () => {
    // #given
    const spawnSpy = spyOn(Bun, "spawn")
    restores.push(() => spawnSpy.mockRestore())

    // #when
    const output = await interactive_bash.execute({ tmux_command: "capture-pane -p -t omo-dev" }, {} as never)

    // #then
    expect(output).toContain("is blocked in interactive_bash")
    expect(output).toContain("USE BASH TOOL INSTEAD")
    expect(spawnSpy).not.toHaveBeenCalled()
  })

  it("#given valid tmux command #when execute #then runs through Bun.spawn and returns stdout", async () => {
    // #given
    const tmuxPathSpy = spyOn(utils, "getCachedTmuxPath").mockReturnValue("/usr/bin/tmux")
    const spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd) => {
      if (!Array.isArray(cmd)) throw new Error("Unexpected spawn args")
      expect(cmd).toEqual(["/usr/bin/tmux", "list-sessions"])
      return createProc({ stdout: "omo-dev: 1 windows\n", exitCode: 0 })
    })
    restores.push(() => tmuxPathSpy.mockRestore(), () => spawnSpy.mockRestore())

    // #when
    const output = await interactive_bash.execute({ tmux_command: "list-sessions" }, {} as never)

    // #then
    expect(output).toBe("omo-dev: 1 windows\n")
  })

  it("#given non-zero exit #when execute #then returns stderr-based error", async () => {
    // #given
    const tmuxPathSpy = spyOn(utils, "getCachedTmuxPath").mockReturnValue("tmux")
    const spawnSpy = spyOn(Bun, "spawn").mockImplementation(() =>
      createProc({ stderr: "no server running\n", exitCode: 1 })
    )
    restores.push(() => tmuxPathSpy.mockRestore(), () => spawnSpy.mockRestore())

    // #when
    const output = await interactive_bash.execute({ tmux_command: "list-sessions" }, {} as never)

    // #then
    expect(output).toBe("Error: no server running")
  })

  it("#given quoted and escaped command #when tokenizeCommand #then returns expected tokens", () => {
    // #given
    const command = `send-keys -t omo-dev "echo hello\\ world" Enter`

    // #when
    const tokens = tokenizeCommand(command)

    // #then
    expect(tokens).toEqual(["send-keys", "-t", "omo-dev", "echo hello world", "Enter"])
  })
})
