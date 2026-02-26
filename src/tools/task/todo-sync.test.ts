import { describe, expect, test } from "bun:test"
import { syncTaskTodoUpdate, syncTaskToTodo, type TodoInfo } from "./todo-sync"

describe("todo sync", () => {
  test("#given pending task #when mapped #then todo keeps id and status", () => {
    //#given
    const task = {
      id: "T-1",
      subject: "Build API",
      description: "",
      status: "pending" as const,
      blocks: [],
      blockedBy: [],
      threadID: "session-1",
      metadata: { priority: "high" },
    }

    //#when
    const todo = syncTaskToTodo(task)

    //#then
    expect(todo).toEqual({
      id: "T-1",
      content: "Build API",
      status: "pending",
      priority: "high",
    })
  })

  test("#given deleted task #when mapped #then null", () => {
    //#when
    const todo = syncTaskToTodo({
      id: "T-2",
      subject: "Old",
      description: "",
      status: "deleted",
      blocks: [],
      blockedBy: [],
      threadID: "session-1",
    })

    //#then
    expect(todo).toBeNull()
  })

  test("#given current todos #when task updated #then writer receives merged todos", async () => {
    //#given
    const calls: Array<{ sessionID: string; todos: TodoInfo[] }> = []
    const writer = async (input: { sessionID: string; todos: TodoInfo[] }) => {
      calls.push(input)
    }
    const ctx = {
      client: {
        session: {
          todo: async () => ({
            data: [
              { id: "T-1", content: "Old content", status: "pending" },
              { id: "T-9", content: "Keep me", status: "pending" },
            ],
          }),
        },
      },
    }

    //#when
    await syncTaskTodoUpdate(
      ctx as never,
      {
        id: "T-1",
        subject: "New content",
        description: "",
        status: "in_progress",
        blocks: [],
        blockedBy: [],
        threadID: "session-1",
      },
      "session-1",
      writer,
    )

    //#then
    expect(calls).toHaveLength(1)
    expect(calls[0].todos.some((todo) => todo.id === "T-9")).toBe(true)
    const updated = calls[0].todos.find((todo) => todo.id === "T-1")
    expect(updated?.content).toBe("New content")
    expect(updated?.status).toBe("in_progress")
  })
})
