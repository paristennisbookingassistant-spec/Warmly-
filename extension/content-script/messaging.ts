/**
 * content-script/messaging.ts
 *
 * LinkedIn conversation-history capture.
 *
 * LinkedIn surfaces messages in TWO interfaces, both with the same
 * underlying message DOM:
 *   1. **Overlay bubble** — a fixed-position chat bubble that opens
 *      from any LinkedIn page (profile, feed, search). The page URL
 *      does NOT change. Multiple bubbles can be open at once.
 *   2. **Full messaging page** — `linkedin.com/messaging/...` with the
 *      active thread rendered in the main panel.
 *
 * Detection strategy: ignore the URL entirely. Poll the DOM for any
 * thread container (the message-list ancestor). When one appears,
 * inject a "Save to Warmly" pill into its header. Idempotent — marks
 * each injected container with a data attribute so re-injection is
 * skipped.
 *
 * **PHASE 1 — diagnostic-only.** No backend wiring yet. We need to
 * confirm the LinkedIn 2026 DOM matches what we think before writing
 * the storage / prompt-injection layer. On click: extracts messages
 * and logs them to console with `[MSG DIAG]` prefix.
 *
 * Once Phase 1 is verified, Phase 2 wires:
 *   - POST /api/contacts/[id]/messages
 *   - JSONB column on contacts
 *   - Outreach prompt injection
 */

// ---------------------------------------------------------------------------
// Selector chains — multi-fallback, ordered by historical stability
// ---------------------------------------------------------------------------

const MSG_SELECTORS = {
  // Any scrollable container holding messages — works for both overlay
  // bubbles and the full messaging page.
  threadContainer: [
    ".msg-s-message-list-container",
    ".msg-s-message-list__list-container",
    "ul.msg-s-message-list-content",
    "[data-msg-thread-id]",
    ".msg-thread",
  ],
  // The container's nearest header/toolbar — where we inject the
  // button. We search UP the DOM from the thread container for any of
  // these.
  threadHeader: [
    ".msg-overlay-conversation-bubble-header",
    ".msg-thread__container header",
    ".msg-thread-header",
    "header.msg-s-message-list-header",
    "header",
  ],
  // Individual message bubble in the thread
  messageItem: [
    "li.msg-s-message-list__event",
    ".msg-s-event-listitem",
    "[data-event-urn]",
  ],
  // Sender name (attached to the FIRST message in a group; subsequent
  // messages from same sender don't repeat the name)
  senderName: [
    ".msg-s-message-group__name",
    ".msg-s-message-group__profile-link span[aria-hidden='true']",
    ".msg-s-message-group__profile-link",
  ],
  // Message body text
  messageBody: [
    ".msg-s-event-listitem__body",
    "p.msg-s-event-listitem__body",
    ".msg-s-event-listitem__message-bubble p",
  ],
  // Per-message timestamp (often only on first of group)
  messageTimestamp: [
    "time.msg-s-message-group__timestamp",
    "time",
    ".msg-s-message-list__time-heading",
  ],
  // Thread participant — the OTHER person in a 1:1 thread.
  // We use their profile link to match against existing Warmly contacts.
  // Search within the same bubble/container that we found the thread in.
  participantLink: [
    "a.msg-thread__link-to-profile",
    ".msg-entity-lockup a[href*='/in/']",
    ".msg-thread a[href*='/in/']",
    "a[href*='/in/']", // last-resort fallback, scoped to bubble/container
  ],
  // The compose textarea where the user types a new message.
  // LinkedIn uses Quill — a contenteditable div, NOT a real <textarea>.
  composeEditor: [
    ".msg-form__contenteditable[contenteditable='true']",
    ".msg-form__message-content [contenteditable='true']",
    "div.msg-form__contenteditable",
    "[role='textbox'][contenteditable='true']",
    "div[contenteditable='true'][aria-label*='message' i]",
  ],
  // The placeholder paragraph LinkedIn shows when compose is empty.
  // We need to remove it so our text isn't appended after the placeholder.
  composePlaceholder: [
    ".msg-form__placeholder",
    ".msg-form__contenteditable p.ql-editor-placeholder",
  ],
};

// CSS class used to identify our injected buttons. We check for the
// presence of a button with this class on each poll — if LinkedIn's
// React re-renders the header and wipes our button, we re-inject.
const BUTTON_CLASS = "warmly-capture-thread-btn";

// ---------------------------------------------------------------------------
// Public surface types
// ---------------------------------------------------------------------------

export interface CapturedMessage {
  /** "user" if from the logged-in user, "them" otherwise */
  sender_role: "user" | "them" | "unknown";
  /** Display name as rendered by LinkedIn (e.g. "Liyang Guo") */
  sender_name: string | null;
  /** Message body, plain text */
  text: string;
  /** ISO datetime if extractable, raw label otherwise */
  timestamp_raw: string | null;
}

export interface CapturedThread {
  thread_url: string;
  participant_name: string | null;
  participant_linkedin_url: string | null;
  messages: CapturedMessage[];
  captured_at: string;
  diagnostic: {
    selector_hits: Record<string, string>;
    scroll_iterations: number;
    raw_message_count: number;
    interface_kind: "overlay" | "full_page" | "unknown";
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const TAG = "[WARMLY-MSG]";

function querySelectorWithChain(
  selectors: readonly string[],
  root: ParentNode = document
): { el: Element | null; selectorUsed: string | null } {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return { el, selectorUsed: sel };
    } catch {
      // skip malformed
    }
  }
  return { el: null, selectorUsed: null };
}

function querySelectorAllWithChain(
  selectors: readonly string[],
  root: ParentNode = document
): { els: Element[]; selectorUsed: string | null } {
  for (const sel of selectors) {
    try {
      const els = Array.from(root.querySelectorAll(sel));
      if (els.length > 0) return { els, selectorUsed: sel };
    } catch {
      // skip
    }
  }
  return { els: [], selectorUsed: null };
}

/**
 * Walks UP the DOM from `el` looking for the nearest ancestor matching
 * any selector in the chain. Used to find the bubble/panel containing
 * a thread so the participant lookup is scoped correctly.
 */
function findAncestor(
  el: Element,
  selectors: readonly string[]
): Element | null {
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    for (const sel of selectors) {
      try {
        if (cur.matches(sel)) return cur;
      } catch {
        // skip
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Find ALL thread containers currently in the DOM. Both overlay bubbles
 * and the full-page main panel render the same container class, so we
 * search globally and de-dupe by element identity.
 */
function findAllThreadContainers(): Element[] {
  for (const sel of MSG_SELECTORS.threadContainer) {
    try {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length > 0) return els;
    } catch {
      // skip
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Scroll-to-top loader — virtualizes old messages
// ---------------------------------------------------------------------------

async function loadFullHistory(
  container: HTMLElement
): Promise<{ iterations: number }> {
  const MAX_ITERATIONS = 25;
  const SCROLL_PAUSE_MS = 700;
  let iterations = 0;
  let lastCount = -1;

  while (iterations < MAX_ITERATIONS) {
    const { els } = querySelectorAllWithChain(
      MSG_SELECTORS.messageItem,
      container
    );
    const count = els.length;

    if (count === lastCount && iterations > 1) break;
    lastCount = count;

    container.scrollTop = 0;
    await new Promise((r) => setTimeout(r, SCROLL_PAUSE_MS));
    iterations++;
  }

  return { iterations };
}

// ---------------------------------------------------------------------------
// Message extraction
// ---------------------------------------------------------------------------

function extractCurrentUserName(): string | null {
  // LinkedIn renders the logged-in user's name in the global nav avatar
  // (alt text on the profile photo). Tries several historical positions.
  const candidates = [
    "img.global-nav__me-photo",
    ".global-nav__me-photo",
    "[data-control-name='nav.settings_signout'] strong",
  ];
  for (const sel of candidates) {
    try {
      const el = document.querySelector(sel);
      const alt = el?.getAttribute?.("alt");
      if (alt && alt.trim()) return alt.trim();
      const txt = el?.textContent?.trim();
      if (txt) return txt;
    } catch {
      // skip
    }
  }
  return null;
}

function extractMessages(container: HTMLElement): {
  messages: CapturedMessage[];
  rawCount: number;
} {
  const { els: messageEls } = querySelectorAllWithChain(
    MSG_SELECTORS.messageItem,
    container
  );

  const currentUserName = extractCurrentUserName();
  console.log(`${TAG} current user name guess:`, currentUserName);

  const messages: CapturedMessage[] = [];
  let lastSenderName: string | null = null;

  for (const el of messageEls) {
    const { el: senderEl } = querySelectorWithChain(
      MSG_SELECTORS.senderName,
      el
    );
    const rawSenderName = senderEl?.textContent?.trim() || null;
    if (rawSenderName) lastSenderName = rawSenderName;

    const { el: bodyEl } = querySelectorWithChain(
      MSG_SELECTORS.messageBody,
      el
    );
    const text = bodyEl?.textContent?.trim() || "";
    if (!text) continue; // Skip system events, read receipts

    const { el: timeEl } = querySelectorWithChain(
      MSG_SELECTORS.messageTimestamp,
      el
    );
    const timestamp =
      timeEl?.getAttribute("datetime") ||
      timeEl?.textContent?.trim() ||
      null;

    const senderName = lastSenderName;
    let senderRole: CapturedMessage["sender_role"] = "unknown";
    if (currentUserName && senderName) {
      senderRole =
        senderName.toLowerCase() === currentUserName.toLowerCase()
          ? "user"
          : "them";
    }

    messages.push({
      sender_role: senderRole,
      sender_name: senderName,
      text,
      timestamp_raw: timestamp,
    });
  }

  return { messages, rawCount: messageEls.length };
}

function extractParticipant(scope: ParentNode): {
  name: string | null;
  linkedinUrl: string | null;
} {
  const { el } = querySelectorWithChain(MSG_SELECTORS.participantLink, scope);
  if (!el) return { name: null, linkedinUrl: null };

  const href = el.getAttribute("href") || "";
  const absoluteUrl = href.startsWith("http")
    ? href
    : `https://www.linkedin.com${href}`;

  const cleanUrl = absoluteUrl
    .split("?")[0]
    .split("#")[0]
    .replace(/\/$/, "");

  const name =
    el.textContent?.trim() || el.getAttribute("aria-label")?.trim() || null;

  return { name, linkedinUrl: cleanUrl };
}

// ---------------------------------------------------------------------------
// Button injection
// ---------------------------------------------------------------------------

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = BUTTON_CLASS;
  btn.textContent = "Draft reply with Warmly";
  btn.type = "button";
  Object.assign(btn.style, {
    background: "#b87a4a",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    marginLeft: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    transition: "opacity 150ms ease",
    zIndex: "10",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("mouseenter", () => (btn.style.opacity = "0.85"));
  btn.addEventListener("mouseleave", () => (btn.style.opacity = "1"));
  return btn;
}

/**
 * Walks UP the DOM from the container looking for the nearest panel
 * that holds the whole thread UI (bubble or main-page panel). Returns
 * `document` if nothing matches — useful for "is our button in this
 * panel?" checks scoped per thread.
 */
function findOwningPanel(container: Element): ParentNode {
  return (
    findAncestor(container, [
      ".msg-overlay-conversation-bubble",
      ".msg-overlay-bubble",
      ".msg-overlay-list-bubble",
      ".msg-thread__container",
      ".msg-thread",
    ]) || (container.parentElement ?? document)
  );
}

/**
 * Inject a "Save to Warmly" button for the given thread container.
 * Idempotent — checks if our button is already present in the owning
 * panel, skips re-injection if so. If LinkedIn's React re-renders the
 * header and wipes our button, the next poll re-injects.
 */
function injectButtonForContainer(container: Element): void {
  const panel = findOwningPanel(container);
  try {
    if ((panel as Element).querySelector?.(`.${BUTTON_CLASS}`)) return;
  } catch {
    // skip
  }

  const btn = createButton();
  btn.addEventListener("click", (ev) => {
    void handleCaptureClick(ev, container);
  });

  // Try to find a header element within the bubble/page containing
  // this thread. Walk up until we find any element with a header-like
  // selector match, then drop the button there.
  let inserted = false;
  let cur: Element | null = container.parentElement;
  while (cur && cur !== document.body) {
    for (const sel of MSG_SELECTORS.threadHeader) {
      try {
        const headerEl = cur.querySelector(sel);
        if (headerEl) {
          headerEl.appendChild(btn);
          console.log(
            `${TAG} button injected into header matching: ${sel}`
          );
          inserted = true;
          break;
        }
      } catch {
        // skip
      }
    }
    if (inserted) break;
    cur = cur.parentElement;
  }

  // Last-resort: absolute-position the button at top of the container.
  if (!inserted) {
    console.warn(`${TAG} no header found, using absolute fallback`);
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      position: "absolute",
      top: "4px",
      right: "8px",
      zIndex: "1000",
    } satisfies Partial<CSSStyleDeclaration>);
    wrapper.appendChild(btn);

    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === "static") {
      (container as HTMLElement).style.position = "relative";
    }
    container.appendChild(wrapper);
  }
}

async function handleCaptureClick(
  ev: Event,
  container: Element
): Promise<void> {
  ev.preventDefault();
  ev.stopPropagation();

  const btn = ev.currentTarget as HTMLButtonElement;
  const originalText = btn.textContent;
  const originalBg = btn.style.background;
  btn.disabled = true;
  btn.textContent = "Reading thread...";

  let captured: CapturedThread;
  try {
    captured = await captureThread(container as HTMLElement);
    console.log(
      `${TAG} captured ${captured.messages.length} messages from "${
        captured.participant_name || "unknown"
      }"`
    );
  } catch (err) {
    console.error(`${TAG} capture failed`, err);
    btn.disabled = false;
    btn.textContent = originalText;
    showErrorToast(
      "Couldn't read the thread. Try scrolling through it once, then click again."
    );
    return;
  }

  btn.textContent = "Drafting...";

  let draft: string;
  let reasoning: string;
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "DRAFT_REPLY_FROM_THREAD",
      payload: {
        participant_name: captured.participant_name,
        participant_linkedin_url: captured.participant_linkedin_url,
        messages: captured.messages,
      },
    });

    if (!resp || !resp.ok) {
      throw new Error(
        resp?.error ||
          "Couldn't generate a draft. Check that you're signed in to Warmly."
      );
    }

    const result = resp.result as {
      draft: string;
      reasoning: string;
      voice_signals_used?: {
        approved_learnings: number;
        past_messages: number;
        has_writing_style: boolean;
        has_profile_md: boolean;
        in_thread_user_messages: number;
      };
    };
    draft = result.draft;
    reasoning = result.reasoning;
    if (result.voice_signals_used) {
      const v = result.voice_signals_used;
      console.log(
        `${TAG} voice signals used: profile_md=${v.has_profile_md}, writing_style=${v.has_writing_style}, approved_learnings=${v.approved_learnings}, past_messages=${v.past_messages}, in_thread_user_messages=${v.in_thread_user_messages}`
      );
    }
  } catch (err) {
    console.error(`${TAG} draft request failed`, err);
    btn.disabled = false;
    btn.textContent = originalText;
    showErrorToast(
      err instanceof Error
        ? err.message
        : "Network error talking to the Warmly backend."
    );
    return;
  }

  // Inject directly into LinkedIn's compose box, scoped to the same
  // panel/bubble as this thread.
  const panel = findOwningPanel(container);
  const inserted = insertDraftIntoCompose(panel, draft);

  if (inserted) {
    console.log(`${TAG} draft inserted into compose box`);
    if (reasoning) {
      console.log(`${TAG} reasoning: ${reasoning}`);
    }
    btn.disabled = false;
    btn.textContent = "Inserted — review & send ✓";
    btn.style.background = "#2f7d4f"; // green confirmation
    showInfoToast(
      `Draft inserted in your voice. ${reasoning || "Review and hit Send."}`
    );
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg || "#b87a4a";
    }, 4000);
  } else {
    // Couldn't find compose — fall back to clipboard copy so user
    // still has a path to send it.
    console.warn(`${TAG} compose textarea not found, copying to clipboard`);
    try {
      await navigator.clipboard.writeText(draft);
      btn.disabled = false;
      btn.textContent = "Copied to clipboard ✓";
      btn.style.background = "#2f7d4f";
      showInfoToast(
        "Compose box not detected — draft copied to clipboard instead. Paste it in manually."
      );
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg || "#b87a4a";
      }, 4000);
    } catch {
      btn.disabled = false;
      btn.textContent = originalText;
      showErrorToast(
        "Couldn't insert the draft. Open the conversation in a different view and try again."
      );
    }
  }
}

/**
 * Insert the draft text into LinkedIn's compose contenteditable.
 *
 * LinkedIn uses Quill (a rich-text editor). Setting `innerHTML` alone
 * doesn't update Quill's internal model, which means the Send button
 * stays disabled. To make this work, we:
 *   1. Find the contenteditable element scoped to this thread's panel
 *   2. Remove any placeholder paragraph
 *   3. Focus the editor + select existing content
 *   4. Use `document.execCommand('insertText')` — deprecated but still
 *      the most reliable way to insert text into a contenteditable
 *      with all the right input events firing so Quill + React update
 *
 * Returns true on success, false if no compose element was found.
 */
function insertDraftIntoCompose(panel: ParentNode, draft: string): boolean {
  const { el } = querySelectorWithChain(MSG_SELECTORS.composeEditor, panel);
  if (!el) return false;

  const editor = el as HTMLElement;

  // Clear any placeholder paragraph LinkedIn renders when compose is
  // empty. Quill sometimes leaves a <p><br></p> as the initial state.
  editor.innerHTML = "";

  // Focus first so input events have a target context
  editor.focus();

  // Select all existing content (in case the user typed something)
  // and replace with the draft.
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } catch {
    // skip
  }

  // Prefer execCommand — fires input events Quill/React listen for.
  let success = false;
  try {
    success = document.execCommand("insertText", false, draft);
  } catch {
    success = false;
  }

  // Fallback: set innerHTML with paragraphs and dispatch a synthetic
  // input event. Works less reliably but covers cases where
  // execCommand returns false.
  if (!success || editor.innerText.trim().length === 0) {
    const paragraphs = draft
      .split(/\n\n+/)
      .map((p) => {
        const lines = p
          .split("\n")
          .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
          .join("<br>");
        return `<p>${lines}</p>`;
      })
      .join("");
    editor.innerHTML = paragraphs;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Always fire one more input event to nudge React state
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));

  return editor.innerText.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Capture orchestration
// ---------------------------------------------------------------------------

async function captureThread(container: HTMLElement): Promise<CapturedThread> {
  // Detect which interface this thread is in (overlay vs full page) by
  // looking for known parent classes.
  const overlayParent = findAncestor(container, [
    ".msg-overlay-conversation-bubble",
    ".msg-overlay-bubble",
    ".msg-overlay-list-bubble",
  ]);
  const interfaceKind: CapturedThread["diagnostic"]["interface_kind"] =
    overlayParent
      ? "overlay"
      : window.location.pathname.startsWith("/messaging")
      ? "full_page"
      : "unknown";
  console.log(`${TAG} interface kind:`, interfaceKind);

  const { iterations } = await loadFullHistory(container);
  console.log(`${TAG} scroll-loaded history in ${iterations} iterations`);

  const { messages, rawCount } = extractMessages(container);

  // For participant lookup, scope to the overlay parent if present
  // (otherwise multiple overlays could cross-pollute).
  const participantScope = overlayParent || document;
  const participant = extractParticipant(participantScope);
  console.log(`${TAG} participant`, participant);

  if (messages.length === 0) {
    console.warn(
      `${TAG} extracted 0 messages — dumping container HTML preview:`,
      container.outerHTML.slice(0, 2000)
    );
  }

  return {
    thread_url: window.location.href,
    participant_name: participant.name,
    participant_linkedin_url: participant.linkedinUrl,
    messages,
    captured_at: new Date().toISOString(),
    diagnostic: {
      selector_hits: {
        container:
          MSG_SELECTORS.threadContainer.find((s) => {
            try {
              return container.matches(s);
            } catch {
              return false;
            }
          }) || "UNKNOWN",
      },
      scroll_iterations: iterations,
      raw_message_count: rawCount,
      interface_kind: interfaceKind,
    },
  };
}

// ---------------------------------------------------------------------------
// Lifecycle — poll for thread containers, inject buttons as they appear
// ---------------------------------------------------------------------------

let pollCount = 0;
let lastReportedContainerCount = -1;

function pollForThreads(): void {
  pollCount++;
  const containers = findAllThreadContainers();

  // Heartbeat: every 10 polls (~15s), log a one-line status so the
  // user can confirm the script is alive in a busy LinkedIn console.
  if (pollCount % 10 === 1) {
    console.log(
      `${TAG} poll #${pollCount} — ${containers.length} thread container(s) found`
    );
  }

  // Also log immediately whenever the container count changes (e.g.
  // user opens or closes a thread bubble).
  if (containers.length !== lastReportedContainerCount) {
    console.log(
      `${TAG} container count changed: ${lastReportedContainerCount} → ${containers.length}`
    );
    lastReportedContainerCount = containers.length;
  }

  for (const container of containers) {
    injectButtonForContainer(container);
  }
}

// ---------------------------------------------------------------------------
// Public entry — called from content-script/index.ts
// ---------------------------------------------------------------------------

export function initMessagingCapture(): void {
  console.log(
    `${TAG} messaging capture initialized on ${window.location.href}`
  );
  // Poll every 1.5s for thread containers. Cheap, covers both initial
  // load and SPA navigation. On each tick we re-check that our
  // button still exists in the owning panel — if LinkedIn's React
  // wipes it, the next poll re-injects.
  setInterval(pollForThreads, 1_500);
  pollForThreads(); // immediate first pass
}

// ---------------------------------------------------------------------------
// Toasts — small notifications shown at bottom-right
// ---------------------------------------------------------------------------

function showInfoToast(message: string): void {
  showToast(message, {
    bg: "#1a1a1a",
    color: "#fff",
    duration: 4500,
  });
}

function showToast(
  message: string,
  opts: { bg: string; color: string; duration: number }
): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: opts.bg,
    color: opts.color,
    padding: "12px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    zIndex: "999999",
    maxWidth: "360px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    lineHeight: "1.45",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), opts.duration);
}

function showErrorToast(message: string): void {
  showToast(message, { bg: "#b54339", color: "#fff", duration: 5000 });
}
