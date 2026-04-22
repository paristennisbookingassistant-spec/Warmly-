/**
 * service-worker/cdp-helper.ts
 * Thin wrapper around chrome.debugger API for CDP access.
 *
 * The chrome.debugger API allows the service worker to:
 * - Attach to any tab and send Chrome DevTools Protocol commands
 * - Navigate pages, execute JavaScript, wait for events
 * - Stay alive as long as the debugger is attached (Chrome 118+)
 *
 * This is the foundation for the discovery orchestrator.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CDPSession {
  tabId: number;
  attached: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let activeSession: CDPSession | null = null;

// ---------------------------------------------------------------------------
// Core CDP operations
// ---------------------------------------------------------------------------

/**
 * Creates a new tab and attaches the debugger to it.
 * Returns the tab ID. The debugger banner will be visible to the user.
 */
export async function attachToNewTab(startUrl = "about:blank"): Promise<number> {
  if (activeSession?.attached) {
    throw new Error("CDP session already active. Detach first.");
  }

  const tab = await chrome.tabs.create({ url: startUrl, active: true });
  if (!tab.id) throw new Error("Failed to create tab");

  await chrome.debugger.attach({ tabId: tab.id }, "1.3");
  activeSession = { tabId: tab.id, attached: true };

  console.debug("[CDP] Attached to tab", tab.id);
  return tab.id;
}

/**
 * Attaches the debugger to an existing tab.
 */
export async function attachToTab(tabId: number): Promise<void> {
  if (activeSession?.attached) {
    throw new Error("CDP session already active. Detach first.");
  }

  await chrome.debugger.attach({ tabId }, "1.3");
  activeSession = { tabId, attached: true };

  console.debug("[CDP] Attached to existing tab", tabId);
}

/**
 * Detaches the debugger from the current tab.
 */
export async function detach(): Promise<void> {
  if (!activeSession?.attached) return;

  try {
    await chrome.debugger.detach({ tabId: activeSession.tabId });
    console.debug("[CDP] Detached from tab", activeSession.tabId);
  } catch (err) {
    console.warn("[CDP] Detach error (tab may have closed):", err);
  }

  activeSession = null;
}

/**
 * Returns the active tab ID, or null if no session is active.
 */
export function getActiveTabId(): number | null {
  return activeSession?.attached ? activeSession.tabId : null;
}

/**
 * Sends a CDP command and returns the result.
 */
async function sendCommand<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  if (!activeSession?.attached) {
    throw new Error("No active CDP session");
  }

  const result = await chrome.debugger.sendCommand(
    { tabId: activeSession.tabId },
    method,
    params
  );

  return result as T;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Navigates the attached tab to a URL and waits for the page to load.
 * LinkedIn uses SPA navigation which doesn't fire Page.loadEventFired,
 * so we use frameStoppedLoading with a time-based fallback.
 */
export async function navigate(url: string): Promise<void> {
  await sendCommand("Page.enable");
  await sendCommand("Page.navigate", { url });

  // Try frameStoppedLoading (works for SPA), fall back to time-based wait
  try {
    await waitForEvent("Page.frameStoppedLoading", 10_000);
  } catch {
    // SPA navigation may not fire any load event — just wait
    await sleep(3000);
  }
  console.debug("[CDP] Navigated to:", url);
}

/**
 * Waits for a specific CDP event within a timeout.
 */
function waitForEvent(eventName: string, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.debugger.onEvent.removeListener(listener);
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeoutMs);

    const listener = (
      source: chrome.debugger.Debuggee,
      method: string,
    ) => {
      if (source.tabId === activeSession?.tabId && method === eventName) {
        clearTimeout(timeout);
        chrome.debugger.onEvent.removeListener(listener);
        resolve();
      }
    };

    chrome.debugger.onEvent.addListener(listener);
  });
}

// ---------------------------------------------------------------------------
// JavaScript evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a JavaScript expression in the page context and returns the result.
 * The expression should return a JSON-serializable value.
 */
export async function evaluate<T = unknown>(expression: string): Promise<T> {
  const result = await sendCommand<{
    result: { type: string; value?: T; description?: string };
    exceptionDetails?: { text: string };
  }>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`JS evaluation error: ${result.exceptionDetails.text}`);
  }

  return result.result.value as T;
}

/**
 * Scrolls the page using real mouse wheel input events via CDP.
 * This fires native `wheel` DOM events that trigger IntersectionObserver
 * and LinkedIn's lazy loading — unlike Runtime.evaluate("window.scrollBy()")
 * which changes scroll position without firing input events.
 *
 * This is the same approach Playwright, Puppeteer, and Claude Code use.
 */
export async function mouseWheel(deltaY: number): Promise<void> {
  await sendCommand("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: 400,
    y: 300,
    deltaX: 0,
    deltaY,
    modifiers: 0,
    pointerType: "mouse",
  });
}

/**
 * Scrolls the page by a given amount (JS-based, may not trigger lazy loading).
 * Prefer mouseWheel() for pages with IntersectionObserver-based lazy loading.
 */
export async function scroll(deltaY: number): Promise<void> {
  await evaluate(`window.scrollBy(0, ${deltaY})`);
}

/**
 * Waits for a specified number of milliseconds.
 * Useful for human-like delays between actions.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Cleanup: auto-detach if the tab is closed
// ---------------------------------------------------------------------------

chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSession?.tabId === tabId) {
    console.debug("[CDP] Tab closed, clearing session");
    activeSession = null;
  }
});
