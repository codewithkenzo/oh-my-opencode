import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_ROOT = join(tmpdir(), "omo-test-hook-message-injector")
const TEST_MESSAGE_STORAGE = join(TEST_ROOT, "message")
const TEST_PART_STORAGE = join(TEST_ROOT, "part")

mock.module("./constants", () => ({
  MESSAGE_STORAGE: TEST_MESSAGE_STORAGE,
  PART_STORAGE: TEST_PART_STORAGE,
}))

mock.module("../../shared/logger", () => ({
  log: () => {},
}))

const { injectHookMessage, findNearestMessageWithFields, findFirstMessageWithAgent } = await import("./injector")

describe("hook-message-injector", () => {
  beforeEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true })
    }
    mkdirSync(TEST_MESSAGE_STORAGE, { recursive: true })
    mkdirSync(TEST_PART_STORAGE, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true, force: true })
    }
  })

  test("#given hook content and message context #when injecting #then message and synthetic part are written", () => {
    //#given
    const sessionID = "ses_inject_1"
    const hookContent = "Injected hook message"

    //#when
    const success = injectHookMessage(sessionID, hookContent, {
      agent: "D5 - backend builder",
      model: { providerID: "openai", modelID: "gpt-5" },
      path: { cwd: "/workspace", root: "/" },
      tools: { bash: "allow" },
    })

    //#then
    expect(success).toBe(true)

    const messageDir = join(TEST_MESSAGE_STORAGE, sessionID)
    const messageFiles = readdirSync(messageDir).filter((entry) => entry.endsWith(".json"))
    expect(messageFiles).toHaveLength(1)

    const message = JSON.parse(readFileSync(join(messageDir, messageFiles[0]), "utf-8")) as {
      id: string
      sessionID: string
      role: string
      agent: string
      model: { providerID: string; modelID: string }
    }

    expect(message.sessionID).toBe(sessionID)
    expect(message.role).toBe("user")
    expect(message.agent).toBe("D5 - backend builder")
    expect(message.model).toEqual({ providerID: "openai", modelID: "gpt-5" })

    const partDir = join(TEST_PART_STORAGE, message.id)
    const partFiles = readdirSync(partDir).filter((entry) => entry.endsWith(".json"))
    expect(partFiles).toHaveLength(1)

    const textPart = JSON.parse(readFileSync(join(partDir, partFiles[0]), "utf-8")) as {
      type: string
      text: string
      synthetic: boolean
      sessionID: string
    }

    expect(textPart.type).toBe("text")
    expect(textPart.synthetic).toBe(true)
    expect(textPart.text).toBe(hookContent)
    expect(textPart.sessionID).toBe(sessionID)
  })

  test("#given empty hook content #when injecting #then injection is skipped", () => {
    //#given
    const sessionID = "ses_inject_2"

    //#when
    const success = injectHookMessage(sessionID, "   ", {
      agent: "general",
      model: { providerID: "openai", modelID: "gpt-5" },
    })

    //#then
    expect(success).toBe(false)
    expect(existsSync(join(TEST_MESSAGE_STORAGE, sessionID))).toBe(false)
  })

  test("#given incomplete message context #when injecting #then nearest stored message fields are used as fallback", () => {
    //#given
    const sessionID = "ses_inject_3"
    const messageDir = join(TEST_MESSAGE_STORAGE, sessionID)
    mkdirSync(messageDir, { recursive: true })

    writeFileSync(
      join(messageDir, "msg_0001.json"),
      JSON.stringify({
        agent: "older-agent",
      }),
      "utf-8",
    )

    writeFileSync(
      join(messageDir, "msg_0002.json"),
      JSON.stringify({
        agent: "fallback-agent",
        model: { providerID: "anthropic", modelID: "claude-opus" },
        tools: { write: "ask" },
      }),
      "utf-8",
    )

    //#when
    const success = injectHookMessage(sessionID, "fallback content", {
      path: { cwd: "/repo", root: "/" },
    })

    //#then
    expect(success).toBe(true)
    const nearest = findNearestMessageWithFields(messageDir)
    expect(nearest?.agent).toBe("fallback-agent")

    const createdMessageFile = readdirSync(messageDir)
      .filter((entry) => entry.endsWith(".json") && !entry.startsWith("msg_000"))
      .at(0)
    expect(createdMessageFile).toBeDefined()

    const createdMessage = JSON.parse(readFileSync(join(messageDir, createdMessageFile as string), "utf-8")) as {
      agent: string
      model?: { providerID: string; modelID: string }
      tools?: Record<string, string>
    }

    expect(createdMessage.agent).toBe("fallback-agent")
    expect(createdMessage.model).toEqual({ providerID: "anthropic", modelID: "claude-opus" })
    expect(createdMessage.tools).toEqual({ write: "ask" })
  })

  test("#given ordered messages #when searching first message with agent #then oldest agent is returned", () => {
    //#given
    const sessionID = "ses_inject_4"
    const messageDir = join(TEST_MESSAGE_STORAGE, sessionID)
    mkdirSync(messageDir, { recursive: true })

    writeFileSync(join(messageDir, "msg_0001.json"), JSON.stringify({ agent: "original-agent" }), "utf-8")
    writeFileSync(join(messageDir, "msg_0002.json"), JSON.stringify({ agent: "new-agent" }), "utf-8")

    //#when
    const firstAgent = findFirstMessageWithAgent(messageDir)

    //#then
    expect(firstAgent).toBe("original-agent")
  })
})
