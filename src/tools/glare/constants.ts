export const GLARE_DESCRIPTION = `Capture screenshots and interact with browser pages via the glare relay.

Actions:
- start: Start the relay server
- screenshot: Capture full-page screenshot
- navigate: Go to a URL
- snapshot: Get ARIA accessibility tree
- info: Get relay server status
- console: Get browser console logs (errors, warnings, logs)
- styles: Get computed styles for an element (requires selector)
- network: Get recent network requests
- eval: Execute JavaScript in browser context (requires script)
- source: Get page HTML source (for copying website designs)
- click: Click an element (requires selector)

Requires glare skill installed and relay running.`

export const RELAY_URL = "http://localhost:9222"
