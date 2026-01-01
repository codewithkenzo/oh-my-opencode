import type { Folder, Device, SystemStatus, Connection } from "./types"

export function formatFoldersMarkdown(folders: Folder[]): string {
  if (folders.length === 0) {
    return "No folders configured."
  }

  const lines = [
    "| ID | Label | Path | Type | Paused | Devices |",
    "|---|---|---|---|---|---|",
  ]

  for (const folder of folders) {
    const deviceCount = folder.devices.length
    const deviceIds = folder.devices.map((d) => d.deviceID.slice(0, 7)).join(", ")
    lines.push(
      `| ${folder.id} | ${folder.label || "-"} | ${folder.path} | ${folder.type} | ${folder.paused ? "Yes" : "No"} | ${deviceCount} (${deviceIds}) |`
    )
  }

  return lines.join("\n")
}

export function formatFoldersCompact(folders: Folder[]): string {
  return folders.map((f) => `${f.id}: ${f.path} [${f.paused ? "paused" : "active"}]`).join("\n")
}

export function formatDevicesMarkdown(devices: Device[]): string {
  if (devices.length === 0) {
    return "No devices configured."
  }

  const lines = [
    "| Device ID | Name | Paused | Addresses |",
    "|---|---|---|---|",
  ]

  for (const device of devices) {
    const shortId = device.deviceID.slice(0, 7)
    const addresses = device.addresses?.slice(0, 2).join(", ") || "dynamic"
    lines.push(`| ${shortId}... | ${device.name} | ${device.paused ? "Yes" : "No"} | ${addresses} |`)
  }

  return lines.join("\n")
}

export function formatDevicesCompact(devices: Device[]): string {
  return devices.map((d) => `${d.deviceID.slice(0, 7)}...: ${d.name}`).join("\n")
}

export function formatStatusMarkdown(status: SystemStatus): string {
  const uptimeHours = status.uptime ? Math.floor(status.uptime / 3600) : 0
  const uptimeMinutes = status.uptime ? Math.floor((status.uptime % 3600) / 60) : 0

  return `## Syncthing Status

| Property | Value |
|---|---|
| Device ID | \`${status.myID}\` |
| Uptime | ${uptimeHours}h ${uptimeMinutes}m |
| Start Time | ${status.startTime || "unknown"} |
| GUI Address | ${status.guiAddressUsed || "unknown"} |
| Goroutines | ${status.goroutines || "unknown"} |
| Memory | ${status.alloc ? Math.round(status.alloc / 1024 / 1024) + " MB" : "unknown"} |`
}

export function formatStatusCompact(status: SystemStatus): string {
  return `Device: ${status.myID.slice(0, 7)}... | Uptime: ${status.uptime || 0}s | GUI: ${status.guiAddressUsed || "unknown"}`
}

export function formatConnectionsMarkdown(connections: Record<string, Connection>): string {
  const entries = Object.entries(connections)
  if (entries.length === 0) {
    return "No active connections."
  }

  const lines = [
    "| Device | Connected | Paused | Address | In | Out |",
    "|---|---|---|---|---|---|",
  ]

  for (const [deviceId, conn] of entries) {
    const shortId = deviceId.slice(0, 7)
    const inBytes = conn.inBytesTotal ? formatBytes(conn.inBytesTotal) : "-"
    const outBytes = conn.outBytesTotal ? formatBytes(conn.outBytesTotal) : "-"
    lines.push(
      `| ${shortId}... | ${conn.connected ? "Yes" : "No"} | ${conn.paused ? "Yes" : "No"} | ${conn.address || "-"} | ${inBytes} | ${outBytes} |`
    )
  }

  return lines.join("\n")
}

export function formatConnectionsCompact(connections: Record<string, Connection>): string {
  return Object.entries(connections)
    .map(([id, c]) => `${id.slice(0, 7)}...: ${c.connected ? "connected" : "disconnected"}`)
    .join("\n")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function formatIgnoresMarkdown(patterns: string[]): string {
  if (patterns.length === 0) {
    return "No ignore patterns configured."
  }
  return "```\n" + patterns.join("\n") + "\n```"
}
