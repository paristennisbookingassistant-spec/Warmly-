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

  // Open the modal in loading state immediately so the user gets
  // feedback while MiniMax generates the draft.
  const modal = openDraftModal({
    participantName: captured.participant_name,
    messageCount: captured.messages.length,
  });

  btn.disabled = false;
  btn.textContent = originalText;

  await requestDraft(captured, modal);
}

interface DraftModalHandle {
  setLoading: (loading: boolean) => void;
  setDraft: (draft: string, reasoning: string) => void;
  setError: (message: string) => void;
  close: () => void;
  onRegenerate: (cb: (instruction?: string) => void) => void;
}

async function requestDraft(
  captured: CapturedThread,
  modal: DraftModalHandle,
  instruction?: string
): Promise<void> {
  modal.setLoading(true);
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "DRAFT_REPLY_FROM_THREAD",
      payload: {
        participant_name: captured.participant_name,
        participant_linkedin_url: captured.participant_linkedin_url,
        messages: captured.messages,
        instruction,
      },
    });

    if (!resp || !resp.ok) {
      modal.setError(
        resp?.error ||
          "Couldn't generate a draft. Check that you're signed in to Warmly at ai-networking-coach.vercel.app."
      );
      return;
    }

    const { draft, reasoning } = resp.result as {
      draft: string;
      reasoning: string;
    };
    modal.setDraft(draft, reasoning);
  } catch (err) {
    console.error(`${TAG} draft request failed`, err);
    modal.setError(
      "Network error talking to the Warmly backend. Try again in a moment."
    );
  }

  modal.onRegenerate((instr) => {
    void requestDraft(captured, modal, instr);
  });
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
// Draft modal — overlay shown in the LinkedIn page with the AI draft.
// ---------------------------------------------------------------------------

interface OpenModalOptions {
  participantName: string | null;
  messageCount: number;
}

function openDraftModal(opts: OpenModalOptions): DraftModalHandle {
  // Remove any pre-existing modal so repeated clicks don't stack.
  document.querySelectorAll(".warmly-draft-modal-backdrop").forEach((el) => {
    el.remove();
  });

  const backdrop = document.createElement("div");
  backdrop.className = "warmly-draft-modal-backdrop";
  Object.assign(backdrop.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "rgba(26,26,26,0.45)",
    zIndex: "999999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } satisfies Partial<CSSStyleDeclaration>);

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#f4ede0",
    borderRadius: "16px",
    padding: "28px 32px",
    width: "min(560px, 92vw)",
    maxHeight: "min(80vh, 720px)",
    overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    color: "#1a1a1a",
    position: "relative",
  } satisfies Partial<CSSStyleDeclaration>);

  // Header
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "8px",
  } satisfies Partial<CSSStyleDeclaration>);

  const titleEl = document.createElement("div");
  titleEl.innerHTML = `<span style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 24px; color: #8d5a32; letter-spacing: -0.01em;">Warmly</span> <span style="color: #4a4a4a; font-size: 14px; margin-left: 6px;">drafted a reply</span>`;
  header.appendChild(titleEl);

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.type = "button";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    fontSize: "24px",
    color: "#4a4a4a",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: "1",
  } satisfies Partial<CSSStyleDeclaration>);
  closeBtn.addEventListener("click", () => backdrop.remove());
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // Subtitle (participant + message count)
  const subtitle = document.createElement("div");
  subtitle.textContent = `For ${opts.participantName || "this thread"} · ${
    opts.messageCount
  } message${opts.messageCount === 1 ? "" : "s"} of context`;
  Object.assign(subtitle.style, {
    fontSize: "12px",
    color: "#7a7a7a",
    marginBottom: "20px",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(subtitle);

  // Loading state container
  const loadingEl = document.createElement("div");
  loadingEl.textContent = "Drafting in your voice...";
  Object.assign(loadingEl.style, {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontStyle: "italic",
    fontSize: "18px",
    color: "#8d5a32",
    padding: "40px 0",
    textAlign: "center",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(loadingEl);

  // Draft textarea (hidden until loaded)
  const draftLabel = document.createElement("div");
  draftLabel.textContent = "Draft (edit before copying):";
  Object.assign(draftLabel.style, {
    fontSize: "12px",
    fontWeight: "600",
    color: "#4a4a4a",
    marginBottom: "6px",
    display: "none",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(draftLabel);

  const draftBox = document.createElement("textarea");
  Object.assign(draftBox.style, {
    width: "100%",
    minHeight: "160px",
    background: "#faf6ed",
    border: "1px solid rgba(26,26,26,0.12)",
    borderRadius: "8px",
    padding: "14px 16px",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: "1.55",
    color: "#1a1a1a",
    resize: "vertical",
    display: "none",
    boxSizing: "border-box",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(draftBox);

  // Reasoning note (hidden until loaded)
  const reasoningEl = document.createElement("div");
  Object.assign(reasoningEl.style, {
    fontSize: "12px",
    color: "#7a7a7a",
    fontStyle: "italic",
    marginTop: "10px",
    display: "none",
    paddingLeft: "8px",
    borderLeft: "2px solid #b87a4a",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(reasoningEl);

  // Error container (hidden until shown)
  const errorEl = document.createElement("div");
  Object.assign(errorEl.style, {
    background: "rgba(181,67,57,0.08)",
    border: "1px solid rgba(181,67,57,0.25)",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    color: "#b54339",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  modal.appendChild(errorEl);

  // Action row
  const actions = document.createElement("div");
  Object.assign(actions.style, {
    marginTop: "20px",
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  } satisfies Partial<CSSStyleDeclaration>);

  const regenBtn = document.createElement("button");
  regenBtn.textContent = "Regenerate";
  regenBtn.type = "button";
  Object.assign(regenBtn.style, {
    background: "transparent",
    border: "1px solid rgba(26,26,26,0.15)",
    color: "#4a4a4a",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy to clipboard";
  copyBtn.type = "button";
  Object.assign(copyBtn.style, {
    background: "#b87a4a",
    border: "none",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  copyBtn.addEventListener("click", () => {
    void navigator.clipboard.writeText(draftBox.value).then(() => {
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = "Copy to clipboard"), 1800);
    });
  });

  actions.appendChild(regenBtn);
  actions.appendChild(copyBtn);
  modal.appendChild(actions);

  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);

  let regenCallback: ((instruction?: string) => void) | null = null;
  regenBtn.addEventListener("click", () => {
    const instruction = window.prompt(
      "Optional steer for the next draft (e.g. 'make it shorter', 'ask about their Series A timeline'). Leave blank to just regenerate.",
      ""
    );
    if (regenCallback) regenCallback(instruction?.trim() || undefined);
  });

  return {
    setLoading(loading) {
      loadingEl.style.display = loading ? "block" : "none";
      if (loading) {
        draftLabel.style.display = "none";
        draftBox.style.display = "none";
        reasoningEl.style.display = "none";
        regenBtn.style.display = "none";
        copyBtn.style.display = "none";
        errorEl.style.display = "none";
      }
    },
    setDraft(draft, reasoning) {
      loadingEl.style.display = "none";
      errorEl.style.display = "none";
      draftLabel.style.display = "block";
      draftBox.style.display = "block";
      draftBox.value = draft;
      if (reasoning && reasoning.trim()) {
        reasoningEl.textContent = `Why this draft: ${reasoning.trim()}`;
        reasoningEl.style.display = "block";
      } else {
        reasoningEl.style.display = "none";
      }
      regenBtn.style.display = "inline-block";
      copyBtn.style.display = "inline-block";
    },
    setError(msg) {
      loadingEl.style.display = "none";
      draftLabel.style.display = "none";
      draftBox.style.display = "none";
      reasoningEl.style.display = "none";
      copyBtn.style.display = "none";
      regenBtn.style.display = "inline-block";
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    },
    close() {
      backdrop.remove();
    },
    onRegenerate(cb) {
      regenCallback = cb;
    },
  };
}

function showErrorToast(message: string): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#1a1a1a",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    zIndex: "999999",
    maxWidth: "320px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
