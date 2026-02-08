import { tool } from "@opencode-ai/plugin"
import {
  BROWSER_OPEN_DESCRIPTION,
  BROWSER_SNAPSHOT_DESCRIPTION,
  BROWSER_SCREENSHOT_DESCRIPTION,
  BROWSER_CLICK_DESCRIPTION,
  BROWSER_FILL_DESCRIPTION,
  BROWSER_CLOSE_DESCRIPTION,
  BROWSER_BACK_DESCRIPTION,
  BROWSER_FORWARD_DESCRIPTION,
  BROWSER_RELOAD_DESCRIPTION,
  BROWSER_GET_URL_DESCRIPTION,
  BROWSER_GET_TITLE_DESCRIPTION,
  BROWSER_TYPE_DESCRIPTION,
  BROWSER_PRESS_DESCRIPTION,
  BROWSER_HOVER_DESCRIPTION,
  BROWSER_SCROLL_DESCRIPTION,
  BROWSER_SELECT_DESCRIPTION,
  BROWSER_EVAL_DESCRIPTION,
  BROWSER_WAIT_DESCRIPTION,
} from "./constants"

export const browserOpenDef = {
  description: BROWSER_OPEN_DESCRIPTION,
  args: {
    url: tool.schema.string().describe("URL to navigate to"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222). On WSL, auto-launches Windows Chrome if not specified."),
  },
}

export const browserSnapshotDef = {
  description: BROWSER_SNAPSHOT_DESCRIPTION,
  args: {
    interactive: tool.schema.boolean().optional().describe("Include ref IDs for click/fill interactions"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
}

export const browserScreenshotDef = {
  description: BROWSER_SCREENSHOT_DESCRIPTION,
  args: {
    output_path: tool.schema.string().optional().describe("Path to save screenshot (default: tmp/screenshot.png)"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
}

export const browserClickDef = {
  description: BROWSER_CLICK_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector to click"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
}

export const browserFillDef = {
  description: BROWSER_FILL_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector for input"),
    text: tool.schema.string().describe("Text to fill into the input"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
}

export const browserCloseDef = {
  description: BROWSER_CLOSE_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port (ignored for CDP connections)"),
  },
}

export const browserBackDef = {
  description: BROWSER_BACK_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserForwardDef = {
  description: BROWSER_FORWARD_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserReloadDef = {
  description: BROWSER_RELOAD_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserGetUrlDef = {
  description: BROWSER_GET_URL_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserGetTitleDef = {
  description: BROWSER_GET_TITLE_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserTypeDef = {
  description: BROWSER_TYPE_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    text: tool.schema.string().describe("Text to type"),
    delay: tool.schema.number().optional().describe("Delay between keystrokes in ms"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserPressDef = {
  description: BROWSER_PRESS_DESCRIPTION,
  args: {
    key: tool.schema.string().describe("Key to press (e.g., Enter, Tab, Control+a)"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserHoverDef = {
  description: BROWSER_HOVER_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserScrollDef = {
  description: BROWSER_SCROLL_DESCRIPTION,
  args: {
    direction: tool.schema.string().describe("Direction: up, down, left, right"),
    amount: tool.schema.number().optional().describe("Pixels to scroll (default: 300)"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserSelectDef = {
  description: BROWSER_SELECT_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    value: tool.schema.string().describe("Option value to select"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserEvalDef = {
  description: BROWSER_EVAL_DESCRIPTION,
  args: {
    script: tool.schema.string().describe("JavaScript code to execute"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserWaitDef = {
  description: BROWSER_WAIT_DESCRIPTION,
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to wait for"),
    timeout: tool.schema.number().optional().describe("Timeout in milliseconds"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
}

export const browserToolDefs = {
  browser_open: browserOpenDef,
  browser_snapshot: browserSnapshotDef,
  browser_screenshot: browserScreenshotDef,
  browser_click: browserClickDef,
  browser_fill: browserFillDef,
  browser_close: browserCloseDef,
  browser_back: browserBackDef,
  browser_forward: browserForwardDef,
  browser_reload: browserReloadDef,
  browser_get_url: browserGetUrlDef,
  browser_get_title: browserGetTitleDef,
  browser_type: browserTypeDef,
  browser_press: browserPressDef,
  browser_hover: browserHoverDef,
  browser_scroll: browserScrollDef,
  browser_select: browserSelectDef,
  browser_eval: browserEvalDef,
  browser_wait: browserWaitDef,
} as const
