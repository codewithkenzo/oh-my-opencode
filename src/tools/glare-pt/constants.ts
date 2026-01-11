export const GLARE_DESCRIPTION = `Browser automation via CDP. Direct Puppeteer connection, no relay needed.

**REQUIRED: browser and profile params.** Run action="profiles" first to see available options.

**Connection:**
- profiles: List available browsers and profiles (run this first!)
- connect: Connect to browser (auto-launches if needed)
- disconnect: Close browser connection
- status: Check connection status and current URL

**Authentication (one-time):**
- auth: Open browser for manual login (headful)

**Navigation & Interaction:**
- navigate: Go to URL
- click: Click element by selector
- type: Type text into element
- wait: Wait for element or time

**Data Extraction:**
- screenshot: Capture page (use look_at to analyze)
- content: Get page text/html/markdown
- eval: Execute JavaScript

**Workflow:**
\`\`\`
# Step 1: List available browsers and profiles
glare action="profiles" browser="comet" profile="Default"

# Step 2: Connect to specific browser/profile
glare action="connect" browser="comet" profile="Profile 3"

# Step 3: One-time auth for Google (if needed)
glare action="auth" browser="comet" profile="Profile 3" url="https://accounts.google.com"

# Step 4: Navigate and interact
glare action="navigate" browser="comet" profile="Profile 3" url="https://notebooklm.google.com"
glare action="screenshot" browser="comet" profile="Profile 3"
\`\`\`

Supports stealth mode to avoid bot detection on Google services.`

export const DEFAULT_PORT = 9223
