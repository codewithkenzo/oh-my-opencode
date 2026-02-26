import { afterEach, describe, expect, it, spyOn } from "bun:test"
import * as cli from "./cli"
import { ast_grep_replace, ast_grep_search } from "./tools"

describe("ast-grep tools", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given python class pattern with trailing colon #when no matches #then appends actionable hint", async () => {
    // #given
    const runSpy = spyOn(cli, "runSg").mockResolvedValue({
      matches: [],
      totalMatches: 0,
      truncated: false,
    })
    const metadataCalls: Array<{ metadata: { output: string } }> = []
    restores.push(() => runSpy.mockRestore())

    // #when
    const output = await ast_grep_search.execute(
      { pattern: "class $A:", lang: "python" },
      { metadata: (payload: { metadata: { output: string } }) => metadataCalls.push(payload) } as never
    )

    // #then
    expect(output).toContain("No matches found")
    expect(output).toContain('Hint: Remove trailing colon. Try: "class $A"')
    expect(metadataCalls[0]?.metadata.output).toBe(output)
  })

  it("#given dryRun false #when ast_grep_replace executes #then forwards updateAll and returns replace summary", async () => {
    // #given
    const runSpy = spyOn(cli, "runSg").mockResolvedValue({
      matches: [
        {
          file: "src/app.ts",
          text: "logger.info(msg)",
          range: { byteOffset: { start: 0, end: 1 }, start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
          lines: "console.log(msg)",
          charCount: { leading: 0, trailing: 0 },
          language: "typescript",
        },
      ],
      totalMatches: 1,
      truncated: false,
    })
    restores.push(() => runSpy.mockRestore())

    // #when
    const output = await ast_grep_replace.execute(
      {
        pattern: "console.log($MSG)",
        rewrite: "logger.info($MSG)",
        lang: "typescript",
        dryRun: false,
      },
      {} as never
    )

    // #then
    expect(runSpy).toHaveBeenCalledWith(expect.objectContaining({ updateAll: true }))
    expect(output).toContain("1 replacement(s)")
    expect(output).not.toContain("[DRY RUN]")
  })

  it("#given runSg throws #when ast_grep_search executes #then returns and publishes error output", async () => {
    // #given
    const runSpy = spyOn(cli, "runSg").mockRejectedValue(new Error("sg failed"))
    const metadataCalls: Array<{ metadata: { output: string } }> = []
    restores.push(() => runSpy.mockRestore())

    // #when
    const output = await ast_grep_search.execute(
      { pattern: "function $NAME", lang: "typescript" },
      { metadata: (payload: { metadata: { output: string } }) => metadataCalls.push(payload) } as never
    )

    // #then
    expect(output).toBe("Error: sg failed")
    expect(metadataCalls[0]?.metadata.output).toBe("Error: sg failed")
  })
})
