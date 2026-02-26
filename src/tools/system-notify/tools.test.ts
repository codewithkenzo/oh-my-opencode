import { afterEach, describe, expect, it, spyOn } from "bun:test"
import * as utils from "./utils"
import { system_notify } from "./tools"

describe("system_notify tool", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given linux platform #when execute with image/open path #then sends notification and opens path", async () => {
    // #given
    const platformSpy = spyOn(utils, "detectPlatform").mockReturnValue("linux")
    const execSpy = spyOn(utils, "execCommand").mockResolvedValue(true)
    const openSpy = spyOn(utils, "openPath").mockResolvedValue(true)
    restores.push(() => platformSpy.mockRestore(), () => execSpy.mockRestore(), () => openSpy.mockRestore())

    // #when
    const output = await system_notify.execute({
      title: "Build done",
      message: "All tests passed",
      image_path: "/tmp/thumb.png",
      open_path: "https://example.com",
    }, {} as never)

    // #then
    expect(execSpy).toHaveBeenCalledWith("notify-send", ["-i", "/tmp/thumb.png", "Build done", "All tests passed"])
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "linux")
    expect(output).toContain("Notification sent")
    expect(output).toContain("Opened: https://example.com")
  })

  it("#given darwin platform #when message has quotes #then escapes osascript payload", async () => {
    // #given
    const platformSpy = spyOn(utils, "detectPlatform").mockReturnValue("darwin")
    const execSpy = spyOn(utils, "execCommand").mockResolvedValue(true)
    restores.push(() => platformSpy.mockRestore(), () => execSpy.mockRestore())

    // #when
    await system_notify.execute({
      title: 'Kenzo "title"',
      message: 'Message with "quotes"',
    }, {} as never)

    // #then
    expect(execSpy).toHaveBeenCalledWith(
      "osascript",
      ["-e", 'display notification "Message with \\"quotes\\"" with title "Kenzo \\"title\\""']
    )
  })

  it("#given unsupported platform #when execute #then returns unsupported message", async () => {
    // #given
    const platformSpy = spyOn(utils, "detectPlatform").mockReturnValue("unsupported")
    restores.push(() => platformSpy.mockRestore())

    // #when
    const output = await system_notify.execute({ message: "hi" }, {} as never)

    // #then
    expect(output).toBe("Unsupported platform: unsupported")
  })
})
