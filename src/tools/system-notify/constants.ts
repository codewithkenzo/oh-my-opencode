export const TOOL_NAME = "system_notify"
export const TOOL_DESCRIPTION = `Send a system notification to the user's desktop. Works on Linux (notify-send), macOS (osascript), and Windows/WSL (BurntToast/msg.exe).

Supports image thumbnails in notifications (Linux: -i flag, Windows: HeroImage).
Can auto-open files/URLs after notification using the open_path parameter.

Examples:
- Agent completion: system_notify(message="Planner-Sisyphus needs your attention in my-project", title="Agent Done")
- Runware result: system_notify(message="Image generated", title="Runware", image_path="tmp/image.jpg", open_path="tmp/image.jpg")
- Open URL: system_notify(message="Video ready", open_path="https://example.com/video.mp4")`
