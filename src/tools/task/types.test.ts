import { describe, expect, test } from "bun:test"
import { TaskCreateInputSchema, TaskObjectSchema, TaskStatusSchema } from "./types"

describe("task types", () => {
  test("#given valid status #when parsed #then success", () => {
    //#given
    const status = "pending"

    //#when
    const result = TaskStatusSchema.safeParse(status)

    //#then
    expect(result.success).toBe(true)
  })

  test("#given minimal task #when parsed #then defaults applied", () => {
    //#given
    const task = {
      id: "T-1",
      subject: "Task",
      description: "",
      status: "pending" as const,
      threadID: "session-1",
    }

    //#when
    const result = TaskObjectSchema.parse(task)

    //#then
    expect(result.blocks).toEqual([])
    expect(result.blockedBy).toEqual([])
  })

  test("#given missing subject #when create input parsed #then fail", () => {
    //#when
    const result = TaskCreateInputSchema.safeParse({})

    //#then
    expect(result.success).toBe(false)
  })
})
