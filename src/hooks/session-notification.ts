import type { PluginInput } from "@opencode-ai/plugin"
import { platform } from "os"
import { basename } from "path"
import { subagentSessions, getMainSessionID } from "../features/claude-code-session-state"
import { sendSystemNotification } from "../tools/system-notify"
import {
  getAfplayPath,
  getPaplayPath,
  getAplayPath,
  getPowershellPath,
  startBackgroundCheck,
} from "./session-notification-utils"

interface Todo {
  content: string
  status: string
  priority: string
  id: string
}

interface SessionNotificationConfig {
  playSound?: boolean
  soundPath?: string
  idleConfirmationDelay?: number
  skipIfIncompleteTodos?: boolean
  maxTrackedSessions?: number
}

type Platform = "darwin" | "linux" | "win32" | "unsupported"

function detectPlatform(): Platform {
  const p = platform()
  if (p === "darwin" || p === "linux" || p === "win32") return p
  return "unsupported"
}

function getDefaultSoundPath(p: Platform): string {
  switch (p) {
    case "darwin":
      return "/System/Library/Sounds/Glass.aiff"
    case "linux":
      return "/usr/share/sounds/freedesktop/stereo/complete.oga"
    case "win32":
      return "C:\\Windows\\Media\\notify.wav"
    default:
      return ""
  }
}

async function sendNotificationWithContext(
  directory: string,
  agentName?: string
): Promise<void> {
  const projectName = basename(directory)
  const agent = agentName || "Agent"
  const message = `${agent} needs your attention in ${projectName}`
  
  await sendSystemNotification({
    title: "OpenCode",
    message,
  })
}

async function playSound(ctx: PluginInput, p: Platform, soundPath: string): Promise<void> {
  switch (p) {
    case "darwin": {
      const afplayPath = await getAfplayPath()
      if (!afplayPath) return
      ctx.$`${afplayPath} ${soundPath}`.catch(() => {})
      break
    }
    case "linux": {
      const paplayPath = await getPaplayPath()
      if (paplayPath) {
        ctx.$`${paplayPath} ${soundPath} 2>/dev/null`.catch(() => {})
      } else {
        const aplayPath = await getAplayPath()
        if (aplayPath) {
          ctx.$`${aplayPath} ${soundPath} 2>/dev/null`.catch(() => {})
        }
      }
      break
    }
    case "win32": {
      const powershellPath = await getPowershellPath()
      if (!powershellPath) return
      ctx.$`${powershellPath} -Command ${"(New-Object Media.SoundPlayer '" + soundPath + "').PlaySync()"}`.catch(() => {})
      break
    }
  }
}

async function hasIncompleteTodos(ctx: PluginInput, sessionID: string): Promise<boolean> {
  try {
    const response = await ctx.client.session.todo({ path: { id: sessionID } })
    const todos = (response.data ?? response) as Todo[]
    if (!todos || todos.length === 0) return false
    return todos.some((t) => t.status !== "completed" && t.status !== "cancelled")
  } catch {
    return false
  }
}

export function createSessionNotification(
  ctx: PluginInput,
  config: SessionNotificationConfig = {}
) {
  const currentPlatform = detectPlatform()
  const defaultSoundPath = getDefaultSoundPath(currentPlatform)

  startBackgroundCheck(currentPlatform)

  const mergedConfig = {
    playSound: false,
    soundPath: defaultSoundPath,
    idleConfirmationDelay: 1500,
    skipIfIncompleteTodos: true,
    maxTrackedSessions: 100,
    ...config,
  }

  const notifiedSessions = new Set<string>()
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const sessionActivitySinceIdle = new Set<string>()
  // Track notification execution version to handle race conditions
  const notificationVersions = new Map<string, number>()
  // Track sessions currently executing notification (prevents duplicate execution)
  const executingNotifications = new Set<string>()

  function cleanupOldSessions() {
    const maxSessions = mergedConfig.maxTrackedSessions
    if (notifiedSessions.size > maxSessions) {
      const sessionsToRemove = Array.from(notifiedSessions).slice(0, notifiedSessions.size - maxSessions)
      sessionsToRemove.forEach(id => notifiedSessions.delete(id))
    }
    if (sessionActivitySinceIdle.size > maxSessions) {
      const sessionsToRemove = Array.from(sessionActivitySinceIdle).slice(0, sessionActivitySinceIdle.size - maxSessions)
      sessionsToRemove.forEach(id => sessionActivitySinceIdle.delete(id))
    }
    if (notificationVersions.size > maxSessions) {
      const sessionsToRemove = Array.from(notificationVersions.keys()).slice(0, notificationVersions.size - maxSessions)
      sessionsToRemove.forEach(id => notificationVersions.delete(id))
    }
    if (executingNotifications.size > maxSessions) {
      const sessionsToRemove = Array.from(executingNotifications).slice(0, executingNotifications.size - maxSessions)
      sessionsToRemove.forEach(id => executingNotifications.delete(id))
    }
  }

  function cancelPendingNotification(sessionID: string) {
    const timer = pendingTimers.get(sessionID)
    if (timer) {
      clearTimeout(timer)
      pendingTimers.delete(sessionID)
    }
    sessionActivitySinceIdle.add(sessionID)
    // Increment version to invalidate any in-flight notifications
    notificationVersions.set(sessionID, (notificationVersions.get(sessionID) ?? 0) + 1)
  }

  function markSessionActivity(sessionID: string) {
    cancelPendingNotification(sessionID)
    notifiedSessions.delete(sessionID)
  }

  async function executeNotification(sessionID: string, version: number) {
    if (executingNotifications.has(sessionID)) {
      pendingTimers.delete(sessionID)
      return
    }

    if (notificationVersions.get(sessionID) !== version) {
      pendingTimers.delete(sessionID)
      return
    }

    if (sessionActivitySinceIdle.has(sessionID)) {
      sessionActivitySinceIdle.delete(sessionID)
      pendingTimers.delete(sessionID)
      return
    }

    if (notifiedSessions.has(sessionID)) {
      pendingTimers.delete(sessionID)
      return
    }

    executingNotifications.add(sessionID)
    try {
      if (mergedConfig.skipIfIncompleteTodos) {
        const hasPendingWork = await hasIncompleteTodos(ctx, sessionID)
        if (notificationVersions.get(sessionID) !== version) {
          return
        }
        if (hasPendingWork) return
      }

      if (notificationVersions.get(sessionID) !== version) {
        return
      }

      if (sessionActivitySinceIdle.has(sessionID)) {
        sessionActivitySinceIdle.delete(sessionID)
        return
      }

      notifiedSessions.add(sessionID)

      await sendNotificationWithContext(ctx.directory)

      if (mergedConfig.playSound && mergedConfig.soundPath) {
        await playSound(ctx, currentPlatform, mergedConfig.soundPath)
      }
    } finally {
      executingNotifications.delete(sessionID)
      pendingTimers.delete(sessionID)
    }
  }

  return async ({ event }: { event: { type: string; properties?: unknown } }) => {
    if (currentPlatform === "unsupported") return

    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.updated" || event.type === "session.created") {
      const info = props?.info as Record<string, unknown> | undefined
      const sessionID = info?.id as string | undefined
      if (sessionID) {
        markSessionActivity(sessionID)
      }
      return
    }

    if (event.type === "session.idle") {
      const sessionID = props?.sessionID as string | undefined
      if (!sessionID) return

      if (subagentSessions.has(sessionID)) return

      // Only trigger notifications for the main session (not subagent sessions)
      const mainSessionID = getMainSessionID()
      if (mainSessionID && sessionID !== mainSessionID) return

      if (notifiedSessions.has(sessionID)) return
      if (pendingTimers.has(sessionID)) return
      if (executingNotifications.has(sessionID)) return

      sessionActivitySinceIdle.delete(sessionID)
      
      const currentVersion = (notificationVersions.get(sessionID) ?? 0) + 1
      notificationVersions.set(sessionID, currentVersion)

      const timer = setTimeout(() => {
        executeNotification(sessionID, currentVersion)
      }, mergedConfig.idleConfirmationDelay)

      pendingTimers.set(sessionID, timer)
      cleanupOldSessions()
      return
    }

    if (event.type === "message.updated" || event.type === "message.created") {
      const info = props?.info as Record<string, unknown> | undefined
      const sessionID = info?.sessionID as string | undefined
      if (sessionID) {
        markSessionActivity(sessionID)
      }
      return
    }

    if (event.type === "tool.execute.before" || event.type === "tool.execute.after") {
      const sessionID = props?.sessionID as string | undefined
      if (sessionID) {
        markSessionActivity(sessionID)
      }
      return
    }

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        cancelPendingNotification(sessionInfo.id)
        notifiedSessions.delete(sessionInfo.id)
        sessionActivitySinceIdle.delete(sessionInfo.id)
        notificationVersions.delete(sessionInfo.id)
        executingNotifications.delete(sessionInfo.id)
      }
    }
  }
}
