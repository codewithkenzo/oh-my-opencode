import type { BackgroundManager, BackgroundTask } from "../../features/background-agent"

const SESSION_ID_POLL_INTERVAL_MS = 10
const SESSION_ID_WAIT_TIMEOUT_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitForTaskSessionID(
  manager: Partial<Pick<BackgroundManager, "getTask">>,
  task: Pick<BackgroundTask, "id" | "sessionID">,
  abort?: AbortSignal,
): Promise<string | undefined> {
  if (task.sessionID) {
    return task.sessionID
  }

  if (!manager.getTask) {
    return undefined
  }

  const start = Date.now()

  while (Date.now() - start < SESSION_ID_WAIT_TIMEOUT_MS) {
    if (abort?.aborted) {
      return undefined
    }

    const currentTask = manager.getTask(task.id)
    if (currentTask?.sessionID) {
      return currentTask.sessionID
    }

    await delay(SESSION_ID_POLL_INTERVAL_MS)
  }

  return undefined
}
