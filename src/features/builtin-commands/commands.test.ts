import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { REFACTOR_TEMPLATE } from "./templates/refactor"
import { START_WORK_TEMPLATE } from "./templates/start-work"
import { getBuiltinCommandsAsInfoArray, loadBuiltinCommands } from "./commands"

describe("builtin commands", () => {
  let cwdSpy: ReturnType<typeof spyOn> | null = null

  beforeEach(() => {
    //#given
    cwdSpy = spyOn(process, "cwd").mockReturnValue("/tmp/omo-project")
  })

  afterEach(() => {
    cwdSpy?.mockRestore()
    cwdSpy = null
  })

  test("#given builtin registry #when loading commands #then command definitions are registered and argumentHint is omitted", () => {
    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands["start-work"]).toBeDefined()
    expect(commands.refactor).toBeDefined()
    expect("argumentHint" in (commands["start-work"] as unknown as { argumentHint?: string })).toBe(false)
    expect(typeof commands["start-work"].template).toBe("string")
  })

  test("#given command names #when loading command templates #then each command routes to the expected template", () => {
    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands["start-work"].template.includes(START_WORK_TEMPLATE)).toBe(true)
    expect(commands.refactor.template.includes(REFACTOR_TEMPLATE)).toBe(true)
  })

  test("#given unknown command in disabled list #when loading commands #then known commands are not removed", () => {
    //#when
    const commands = loadBuiltinCommands(["unknown-command" as never])

    //#then
    expect(commands["start-work"]).toBeDefined()
    expect(commands["init-deep"]).toBeDefined()
  })

  test("#given disabled builtin commands #when listing command info #then disabled commands are excluded", () => {
    //#when
    const info = getBuiltinCommandsAsInfoArray(["debug", "verify"])

    //#then
    expect(info.find((entry) => entry.name === "debug")).toBeUndefined()
    expect(info.find((entry) => entry.name === "verify")).toBeUndefined()
    expect(info.find((entry) => entry.name === "start-work")?.metadata.argumentHint).toBe("[plan-name]")
  })
})
