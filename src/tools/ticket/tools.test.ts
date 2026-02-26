import { afterEach, describe, expect, it, spyOn } from "bun:test"
import * as api from "./client"
import * as format from "./formatters"
import { ticket_close, ticket_create, ticket_ready } from "./tools"

describe("ticket tools", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given ready tickets #when filtering by status/search #then returns formatted filtered output", async () => {
    // #given
    const getReadySpy = spyOn(api, "getReadyTickets").mockResolvedValue([
      {
        id: "TK-1",
        title: "fix parser",
        status: "open",
        priority: 2,
        dependencies: [],
        created: "2026-01-01",
      },
      {
        id: "TK-2",
        title: "add docs",
        status: "closed",
        priority: 2,
        dependencies: [],
        created: "2026-01-01",
      },
    ])
    const formatSpy = spyOn(format, "formatTickets").mockReturnValue("formatted-ready")
    restores.push(() => getReadySpy.mockRestore(), () => formatSpy.mockRestore())

    // #when
    const output = await ticket_ready.execute({ status: "open", search: "fix", format: "compact" }, {} as never)

    // #then
    expect(output).toBe("formatted-ready")
    expect(formatSpy).toHaveBeenCalledWith([
      {
        id: "TK-1",
        title: "fix parser",
        status: "open",
        priority: 2,
        dependencies: [],
        created: "2026-01-01",
      },
    ], "compact")
  })

  it("#given valid create args #when ticket_create executes #then prefixes success message", async () => {
    // #given
    const createSpy = spyOn(api, "createTicket").mockResolvedValue({
      id: "TK-3",
      title: "new ticket",
      status: "open",
      priority: 1,
      dependencies: [],
      created: "2026-01-02",
    })
    const formatSpy = spyOn(format, "formatTicket").mockReturnValue("ticket-body")
    restores.push(() => createSpy.mockRestore(), () => formatSpy.mockRestore())

    // #when
    const output = await ticket_create.execute({ title: "new ticket", priority: 1 }, {} as never)

    // #then
    expect(output).toBe("✓ Ticket created!\n\nticket-body")
  })

  it("#given api failure #when ticket_close executes #then returns error text", async () => {
    // #given
    const closeSpy = spyOn(api, "closeTicket").mockRejectedValue(new Error("close exploded"))
    restores.push(() => closeSpy.mockRestore())

    // #when
    const output = await ticket_close.execute({ id: "TK-9" }, {} as never)

    // #then
    expect(output).toBe("Error: close exploded")
  })
})
