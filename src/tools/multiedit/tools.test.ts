import { afterEach, describe, expect, it, spyOn } from "bun:test"
import * as fs from "node:fs"
import { multiedit } from "./tools"

describe("multiedit tool", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given relative file path #when execute #then returns absolute-path validation error", async () => {
    // #given
    const existsSpy = spyOn(fs, "existsSync")
    restores.push(() => existsSpy.mockRestore())

    // #when
    const output = await multiedit.execute({
      filePath: "relative/path.txt",
      edits: [{ oldString: "a", newString: "b" }],
    }, {} as never)

    // #then
    expect(output).toBe("Error: filePath must be absolute (start with /)")
    expect(existsSpy).not.toHaveBeenCalled()
  })

  it("#given second edit fails #when execute #then keeps operation atomic and skips write", async () => {
    // #given
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(true)
    const readSpy = spyOn(fs, "readFileSync").mockReturnValue("alpha beta")
    const writeSpy = spyOn(fs, "writeFileSync")
    restores.push(() => existsSpy.mockRestore(), () => readSpy.mockRestore(), () => writeSpy.mockRestore())

    // #when
    const output = await multiedit.execute({
      filePath: "/tmp/demo.txt",
      edits: [
        { oldString: "alpha", newString: "ALPHA" },
        { oldString: "missing", newString: "x" },
      ],
    }, {} as never)

    // #then
    expect(output).toContain("Edit 2/2 failed: oldString not found in content")
    expect(output).toContain("No changes were made (atomic operation)")
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it("#given valid sequential edits #when execute #then writes transformed content and returns summary", async () => {
    // #given
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(true)
    const readSpy = spyOn(fs, "readFileSync").mockReturnValue("alpha beta")
    const writeSpy = spyOn(fs, "writeFileSync").mockImplementation(() => undefined)
    restores.push(() => existsSpy.mockRestore(), () => readSpy.mockRestore(), () => writeSpy.mockRestore())

    // #when
    const output = await multiedit.execute({
      filePath: "/tmp/demo.txt",
      edits: [
        { oldString: "alpha", newString: "ALPHA" },
        { oldString: "beta", newString: "BETA" },
      ],
    }, {} as never)

    // #then
    expect(writeSpy).toHaveBeenCalledWith("/tmp/demo.txt", "ALPHA BETA", "utf-8")
    expect(output).toContain("Successfully applied 2 edit(s)")
    expect(output).toContain("Edit 1: Replaced 1 occurrence")
    expect(output).toContain("Edit 2: Replaced 1 occurrence")
  })
})
