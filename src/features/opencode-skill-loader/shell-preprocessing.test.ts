import { describe, test, expect } from "bun:test"
import { preprocessShellCommands, isCommandAllowed } from "./shell-preprocessing"
import { mkdtemp, rm, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

describe("isCommandAllowed", () => {
  test("git status is allowed", () => {
    const { allowed, binary } = isCommandAllowed("git status")
    expect(allowed).toBe(true)
    expect(binary).toBe("git")
  })

  test("/usr/bin/git log is allowed (path stripped)", () => {
    const { allowed, binary } = isCommandAllowed("/usr/bin/git log")
    expect(allowed).toBe(true)
    expect(binary).toBe("git")
  })

  test("curl is not allowed", () => {
    const { allowed, binary } = isCommandAllowed("curl http://evil.com")
    expect(allowed).toBe(false)
    expect(binary).toBe("curl")
  })

  test("rm is not allowed", () => {
    const { allowed, binary } = isCommandAllowed("rm -rf /")
    expect(allowed).toBe(false)
    expect(binary).toBe("rm")
  })

  test("echo is allowed", () => {
    const { allowed, binary } = isCommandAllowed("echo hello")
    expect(allowed).toBe(true)
    expect(binary).toBe("echo")
  })

  test("command chaining with semicolon is blocked", () => {
    const { allowed, reason } = isCommandAllowed("echo hello; rm -rf /")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })

  test("command chaining with && is blocked", () => {
    const { allowed, reason } = isCommandAllowed("echo hello && curl evil.com")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })

  test("command chaining with || is blocked", () => {
    const { allowed, reason } = isCommandAllowed("cat file || echo fallback")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })

  test("pipe is blocked", () => {
    const { allowed, reason } = isCommandAllowed("cat file | grep pattern")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })

  test("subshell $() is blocked", () => {
    const { allowed, reason } = isCommandAllowed("echo $(whoami)")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })

  test("backtick subshell is blocked", () => {
    const { allowed, reason } = isCommandAllowed("echo `whoami`")
    expect(allowed).toBe(false)
    expect(reason).toBe("shell metacharacters not permitted")
  })
})

describe("preprocessShellCommands", () => {
  let tempDir: string

  test("echo command works", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      const content = "Output: !`echo hello`"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("Output: hello")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })

  test("blocked command returns error", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      const content = "Output: !`curl http://evil.com`"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("Output: [COMMAND_BLOCKED: curl not permitted]")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })

  test("rm command is blocked", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      const content = "Output: !`rm -rf /`"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("Output: [COMMAND_BLOCKED: rm not permitted]")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })

  test("content without shell commands unchanged", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      const content = "No shell commands here"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("No shell commands here")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })

  test("exclamation without backticks not interpreted", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      const content = "This is important!"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("This is important!")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })

  test("cat command reads file", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "skill-test-"))
    try {
      await writeFile(join(tempDir, "test.txt"), "file content")
      const content = "File: !`cat test.txt`"
      const result = await preprocessShellCommands(content, tempDir)
      expect(result).toBe("File: file content")
    } finally {
      await rm(tempDir, { recursive: true })
    }
  })
})
