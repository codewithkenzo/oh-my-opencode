export const TOOL_PREFIX = "browser"

export const BROWSER_OPEN_DESCRIPTION = `Navigate browser to a URL.

Starts a browser session (if not running) and navigates to the specified URL.
Use cdp_port to connect to existing Chrome with remote debugging enabled.

Example:
- browser_open(url="http://localhost:3000")
- browser_open(url="http://localhost:3000", cdp_port=9222)  # Connect to Windows Chrome`

export const BROWSER_SNAPSHOT_DESCRIPTION = `Get accessibility tree with element refs.

Returns the page's accessibility tree. With interactive=true, includes ref IDs for click/fill.

Example:
- browser_snapshot()
- browser_snapshot(interactive=true)  # Get ref IDs for interactions`

export const BROWSER_SCREENSHOT_DESCRIPTION = `Capture browser viewport to file.

Saves a screenshot to the specified path (default: tmp/screenshot.png).
Use with look_at tool to analyze visual issues.

Example:
- browser_screenshot(output_path="tmp/debug.png")
- look_at(file_path="tmp/debug.png", goal="identify layout issues")`

export const BROWSER_CLICK_DESCRIPTION = `Click an element by ref ID or CSS selector.

Use after browser_snapshot(interactive=true) to get ref IDs.

Example:
- browser_click(ref=12)  # Click element with ref 12
- browser_click(selector=".submit-button")  # Click by CSS selector`

export const BROWSER_FILL_DESCRIPTION = `Fill text into an input element.

Use after browser_snapshot(interactive=true) to get ref IDs.

Example:
- browser_fill(ref=5, text="user@example.com")
- browser_fill(selector="#email", text="user@example.com")`

export const BROWSER_CLOSE_DESCRIPTION = `Close the browser session.

Closes the current browser instance (bundled mode only).
CDP connections to external Chrome are left open.`

export const BROWSER_BACK_DESCRIPTION = `Go back in browser history.`

export const BROWSER_FORWARD_DESCRIPTION = `Go forward in browser history.`

export const BROWSER_RELOAD_DESCRIPTION = `Reload the current page.`

export const BROWSER_GET_URL_DESCRIPTION = `Get the current page URL.`

export const BROWSER_GET_TITLE_DESCRIPTION = `Get the current page title.`

export const BROWSER_TYPE_DESCRIPTION = `Type text into an element character by character.

Use after browser_snapshot(interactive=true) to get ref IDs.
Differs from fill: type adds to existing content, fill replaces it.

Example:
- browser_type(ref=5, text="hello", delay=50)
- browser_type(selector="input", text="search query")`

export const BROWSER_PRESS_DESCRIPTION = `Press a keyboard key.

Supports special keys and modifiers.

Example:
- browser_press(key="Enter")
- browser_press(key="Tab")
- browser_press(key="Control+a")`

export const BROWSER_HOVER_DESCRIPTION = `Hover over an element.

Useful for triggering hover states, tooltips, or dropdown menus.

Example:
- browser_hover(ref=3)
- browser_hover(selector=".dropdown-trigger")`

export const BROWSER_SCROLL_DESCRIPTION = `Scroll the page in a direction.

Example:
- browser_scroll(direction="down", amount=500)
- browser_scroll(direction="up")`

export const BROWSER_SELECT_DESCRIPTION = `Select an option from a dropdown.

Example:
- browser_select(ref=8, value="option1")
- browser_select(selector="select#country", value="US")`

export const BROWSER_EVAL_DESCRIPTION = `Execute JavaScript in the browser context.

Returns the result of the expression.

Example:
- browser_eval(script="document.title")
- browser_eval(script="window.scrollY")`

export const BROWSER_WAIT_DESCRIPTION = `Wait for an element to appear or a timeout.

Example:
- browser_wait(selector=".loading-complete")
- browser_wait(timeout=2000)`
