import { beforeEach, describe, expect, mock, test } from "bun:test"

import { clearPendingStore, getPendingStoreSize, storeToolMetadata } from "./features/tool-metadata-store"

const seenAfterOutputs: Array<{ title: string; metadata: unknown }> = []
const claudeAfterHook = mock(async (_input: unknown, output: { title: string; metadata: unknown }) => {
  seenAfterOutputs.push({ title: output.title, metadata: output.metadata })
})

mock.module("./hooks", () => ({
  createTodoContinuationEnforcerHook: () => ({ handler: async () => {} }),
  createContextWindowMonitorHook: () => ({ event: async () => {}, "tool.execute.after": async () => {} }),
  createSessionRecoveryHook: () => ({
    setOnAbortCallback: () => {},
    setOnRecoveryCompleteCallback: () => {},
    isRecoverableError: () => false,
    handleSessionRecovery: async () => false,
  }),
  createSessionNotificationHook: () => async () => {},
  createCommentCheckerHooks: () => ({ "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createToolOutputTruncatorHook: () => ({ "tool.execute.after": async () => {} }),
  createDirectoryAgentsInjectorHook: () => ({ event: async () => {}, "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createDirectoryReadmeInjectorHook: () => ({ event: async () => {}, "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createEmptyTaskResponseDetectorHook: () => ({ "tool.execute.after": async () => {} }),
  createThinkModeHook: () => ({ event: async () => {} }),
  createClaudeCodeHooksHook: () => ({
    "chat.message": async () => {},
    event: async () => {},
    "tool.execute.before": async () => {},
    "tool.execute.after": claudeAfterHook,
  }),
  createAnthropicContextWindowLimitRecoveryHook: () => ({ event: async () => {} }),
  createRulesInjectorHook: () => ({ event: async () => {}, "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createBackgroundNotificationHook: () => ({ event: async () => {} }),
  createAutoUpdateCheckerHook: () => ({ event: async () => {} }),
  createKeywordDetectorHook: () => ({ "chat.message": async () => {} }),
  createSkillAutoInvokeHook: () => ({ "chat.message": async () => {} }),
  createAgentUsageReminderHook: () => ({ event: async () => {}, "tool.execute.after": async () => {} }),
  createNonInteractiveEnvHook: () => ({ "tool.execute.before": async () => {} }),
  createInteractiveBashSessionHook: () => ({ event: async () => {}, "tool.execute.after": async () => {} }),
  createThinkingBlockValidatorHook: () => ({}),
  createRalphLoopHook: () => ({ event: async () => {}, startLoop: () => {}, cancelLoop: () => {} }),
  createAutoSlashCommandHook: () => ({ "chat.message": async () => {} }),
  createEditErrorRecoveryHook: () => ({ "tool.execute.after": async () => {} }),
  createDelegateTaskRetryHook: () => ({ "tool.execute.after": async () => {} }),
  createTaskResumeInfoHook: () => ({ "tool.execute.after": async () => {} }),
  createStartWorkHook: () => ({ "chat.message": async () => {} }),
  createAtlasHook: () => ({ handler: async () => {}, "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createPrometheusMdOnlyHook: () => ({ "tool.execute.before": async () => {} }),
  createMemoryPersistenceHook: () => ({ event: async () => {} }),
  createQuestionLabelTruncatorHook: () => ({ "tool.execute.before": async () => {} }),
  createHashlineReadEnhancerHook: () => ({ "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createHashlineEditDiffEnhancerHook: () => ({ "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createWriteExistingFileGuardHook: () => ({ "tool.execute.before": async () => {} }),
  createRmToTrashHook: () => ({ "tool.execute.before": async () => {} }),
  createTodoTicketBridgeHook: () => ({ "tool.execute.after": async () => {} }),
  createVerificationBeforeCompletionHook: () => ({ "tool.execute.after": async () => {} }),
  createTicketEnforcementHook: () => ({ "tool.execute.before": async () => {}, "tool.execute.after": async () => {} }),
  createAnthropicEffortHook: () => ({ "tool.execute.before": async () => {} }),
  createUnstableAgentBabysitterHook: () => ({ event: async () => {} }),
  createRuntimeFallbackHook: () => ({ event: async () => {}, "chat.message": async () => {} }),
}))

mock.module("./features/context-injector", () => ({
  contextCollector: {},
  createContextInjectorMessagesTransformHook: () => ({}),
}))

mock.module("./shared/agent-variant", () => ({
  applyAgentVariant: () => {},
  resolveAgentVariant: () => undefined,
}))

mock.module("./shared/first-message-variant", () => ({
  createFirstMessageVariantGate: () => ({
    shouldOverride: () => false,
    markApplied: () => {},
    markSessionCreated: () => {},
    clear: () => {},
  }),
}))

mock.module("./features/opencode-skill-loader", () => ({
  discoverUserClaudeSkills: async () => [],
  discoverProjectClaudeSkills: async () => [],
  discoverOpencodeGlobalSkills: async () => [],
  discoverOpencodeProjectSkills: async () => [],
  mergeSkills: (...groups: unknown[][]) => groups.flat(),
}))

mock.module("./features/builtin-skills", () => ({
  createBuiltinSkills: () => [],
}))

mock.module("./features/claude-code-mcp-loader", () => ({
  getSystemMcpServerNames: () => new Set<string>(),
}))

mock.module("./features/claude-code-session-state", () => ({
  setMainSession: () => {},
  getMainSessionID: () => "",
  setSessionAgent: () => {},
  updateSessionAgent: () => {},
  clearSessionAgent: () => {},
}))

mock.module("./tools", () => ({
  builtinTools: {},
  createBuiltinToolsWithLazyLoading: () => ({}),
  ALL_PROFILES: [],
  createCallOmoAgent: () => ({}),
  createBackgroundTools: () => ({}),
  createLookAt: () => null,
  createSkillTool: () => ({}),
  createFindSkillsTool: () => ({}),
  createSkillMcpTool: () => ({}),
  createMcpQueryTool: () => ({}),
  createSlashcommandTool: () => ({}),
  discoverCommandsSync: () => [],
  sessionExists: async () => false,
  createDelegateTask: () => ({}),
  createSupermemoryTool: () => ({}),
  interactive_bash: {},
  startTmuxCheck: () => {},
  lspManager: { cleanupTempDirectoryClients: async () => {} },
}))

mock.module("./features/background-agent", () => ({
  BackgroundManager: class BackgroundManager {
    constructor(..._args: unknown[]) {}
  },
}))

mock.module("./features/skill-mcp-manager", () => ({
  McpClientManager: class McpClientManager {
    async disconnectSession(): Promise<void> {}
  },
}))

mock.module("./features/task-toast-manager", () => ({
  initTaskToastManager: () => {},
}))

mock.module("./shared", () => ({
  log: () => {},
  detectExternalNotificationPlugin: () => ({ detected: false, pluginName: undefined, allPlugins: [] }),
  getNotificationConflictWarning: () => "",
  resetMessageCursor: () => {},
  includesCaseInsensitive: (items: string[], value: string) =>
    items.some((item) => item.toLowerCase() === value.toLowerCase()),
  createStartupTimer: () => ({ mark: () => {}, report: () => "" }),
  logToolRegistrySnapshot: () => {},
  normalizeSessionIdleEvent: (event: unknown) => event,
}))

mock.module("./plugin-config", () => ({
  loadPluginConfig: () => ({}),
}))

mock.module("./plugin-state", () => ({
  createModelCacheState: () => ({}),
}))

mock.module("./plugin-handlers", () => ({
  createConfigHandler: () => ({}),
}))

mock.module("./features/claude-code-plugin-loader", () => ({
  loadAllPluginComponents: async () => ({ mcpServers: {} }),
}))

const { OhMyOpenCodePlugin } = await import("./index")

describe("OhMyOpenCodePlugin tool metadata restore", () => {
  beforeEach(() => {
    clearPendingStore()
    seenAfterOutputs.length = 0
    claudeAfterHook.mockClear()
  })

  test("restores stored metadata before downstream tool.execute.after hooks run", async () => {
    // #given
    const plugin = await OhMyOpenCodePlugin({ directory: "/repo", client: {} } as never)
    storeToolMetadata("parent-session", "call-restore", {
      title: "child launch title",
      metadata: { sessionId: "child-session-123" },
    })

    const output = {
      title: "fromPlugin title",
      output: "ok",
      metadata: { truncated: true },
    }

    // #when
    await plugin["tool.execute.after"]?.(
      { tool: "call_omo_agent", sessionID: "parent-session", callID: "call-restore" },
      output,
    )

    // #then
    expect(seenAfterOutputs).toEqual([
      {
        title: "child launch title",
        metadata: { truncated: true, sessionId: "child-session-123" },
      },
    ])
    expect(getPendingStoreSize()).toBe(0)
  })

  test("restores unresolved launcher metadata without leaking sessionId", async () => {
    // #given
    const plugin = await OhMyOpenCodePlugin({ directory: "/repo", client: {} } as never)
    storeToolMetadata("parent-session", "call-pending", {
      title: "launch child",
      metadata: {},
    })

    const output = {
      title: "fromPlugin title",
      output: "ok",
      metadata: { truncated: true },
    }

    // #when
    await plugin["tool.execute.after"]?.(
      { tool: "background_task", sessionID: "parent-session", callID: "call-pending" },
      output,
    )

    // #then
    expect(seenAfterOutputs).toEqual([
      {
        title: "launch child",
        metadata: { truncated: true },
      },
    ])
    expect(getPendingStoreSize()).toBe(0)
  })

  test("matches stored metadata by call id so repeated launches do not cross-wire", async () => {
    // #given
    const plugin = await OhMyOpenCodePlugin({ directory: "/repo", client: {} } as never)
    storeToolMetadata("parent-session", "call-1", {
      title: "child one",
      metadata: { sessionId: "child-session-1" },
    })
    storeToolMetadata("parent-session", "call-2", {
      title: "child two",
      metadata: { sessionId: "child-session-2" },
    })

    const output = {
      title: "fromPlugin title",
      output: "ok",
      metadata: { truncated: true },
    }

    // #when
    await plugin["tool.execute.after"]?.(
      { tool: "delegate_task", sessionID: "parent-session", callID: "call-2" },
      output,
    )

    // #then
    expect(seenAfterOutputs).toEqual([
      {
        title: "child two",
        metadata: { truncated: true, sessionId: "child-session-2" },
      },
    ])
    expect(getPendingStoreSize()).toBe(1)
  })

  test("restores queued launcher metadata when runtime execute had no callID", async () => {
    // #given
    const plugin = await OhMyOpenCodePlugin({ directory: "/repo", client: {} } as never)
    storeToolMetadata("parent-session", undefined, {
      title: "queued child launch",
      metadata: { sessionId: "child-session-runtime" },
    })

    const output = {
      title: "fromPlugin title",
      output: "ok",
      metadata: { truncated: true },
    }

    // #when
    await plugin["tool.execute.after"]?.(
      { tool: "delegate_task", sessionID: "parent-session", callID: "after-runtime-call" },
      output,
    )

    // #then
    expect(seenAfterOutputs).toEqual([
      {
        title: "queued child launch",
        metadata: { truncated: true, sessionId: "child-session-runtime" },
      },
    ])
    expect(getPendingStoreSize()).toBe(0)
  })
})
