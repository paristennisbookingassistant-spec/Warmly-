/**
 * tests/lib/sanitizeOutreach.test.ts
 *
 * Verifies the deterministic post-processing layer for outreach-family
 * artifacts. The sanitizer is the safety net behind the prompt — these
 * tests pin the guarantees we make regardless of what the model returns.
 */

import { describe, it, expect } from "vitest";
import {
  stripDashes,
  truncateAtSentence,
  isOutreachArtifactType,
  sanitizeOutreachContent,
} from "@/lib/ai/sanitizeOutreach";

// ---------------------------------------------------------------------------
// stripDashes
// ---------------------------------------------------------------------------

describe("stripDashes", () => {
  it("replaces em-dashes with comma + space", () => {
    const { text, changed } = stripDashes("I love this — really");
    expect(text).toBe("I love this, really");
    expect(changed).toBe(true);
  });

  it("replaces en-dashes with comma + space", () => {
    const { text, changed } = stripDashes("From 2020 – 2024 I worked there");
    expect(text).toBe("From 2020, 2024 I worked there");
    expect(changed).toBe(true);
  });

  it("handles multiple dashes in one message", () => {
    const { text, changed } = stripDashes(
      "Hi Marie — loved your post — would love to chat"
    );
    expect(text).toBe("Hi Marie, loved your post, would love to chat");
    expect(changed).toBe(true);
  });

  it("returns input unchanged when no dashes present", () => {
    const { text, changed } = stripDashes("Hi Marie, loved your post.");
    expect(text).toBe("Hi Marie, loved your post.");
    expect(changed).toBe(false);
  });

  it("collapses double spaces produced by dash replacement", () => {
    const { text } = stripDashes("Word —  another  word");
    expect(text).not.toMatch(/\s{2,}/);
  });
});

// ---------------------------------------------------------------------------
// truncateAtSentence
// ---------------------------------------------------------------------------

describe("truncateAtSentence", () => {
  it("returns input unchanged when under the limit", () => {
    const input = "Hi Marie. Loved your post.";
    expect(truncateAtSentence(input, 300)).toBe(input);
  });

  it("truncates at the last sentence-ending period within the limit", () => {
    const input =
      "Hi Marie. Loved your post on AI. Would love to connect and learn more about what you're building. " +
      "I'm a fellow INSEAD MBA exploring the consulting-to-investing transition and your move from Bain to Atomico is exactly the kind of path I'm interested in understanding better.";
    const out = truncateAtSentence(input, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith(".")).toBe(true);
  });

  it("falls back to last word boundary when no sentence end fits", () => {
    const input =
      "verylongwordwithnopunctuationorspacesexceptforonemiddle here";
    const out = truncateAtSentence(input, 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out).not.toContain("here"); // cut before "here"
  });
});

// ---------------------------------------------------------------------------
// isOutreachArtifactType
// ---------------------------------------------------------------------------

describe("isOutreachArtifactType", () => {
  it("returns true for outreach-family types", () => {
    expect(isOutreachArtifactType("connection_note")).toBe(true);
    expect(isOutreachArtifactType("outreach_draft")).toBe(true);
    expect(isOutreachArtifactType("follow_up_draft")).toBe(true);
  });

  it("returns false for non-outreach types", () => {
    expect(isOutreachArtifactType("meeting_prep")).toBe(false);
    expect(isOutreachArtifactType("meeting_notes")).toBe(false);
    expect(isOutreachArtifactType("action_plan")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeOutreachContent — end-to-end
// ---------------------------------------------------------------------------

describe("sanitizeOutreachContent", () => {
  it("strips em-dashes and recomputes char_count for connection_note", () => {
    const { content, warnings } = sanitizeOutreachContent("connection_note", {
      message: "Hi Marie — loved your post on Atomico's AI thesis.",
      hook: "Atomico AI thesis",
      char_count: 999, // intentionally wrong, should be recomputed
    });

    expect(content.message).toBe(
      "Hi Marie, loved your post on Atomico's AI thesis."
    );
    expect(content.char_count).toBe((content.message as string).length);
    expect(warnings).toContain("stripped em-dash or en-dash");
  });

  it("truncates a connection_note that exceeds 300 chars", () => {
    // Build a deliberately-long connection note with sentence boundaries
    const message =
      "Hi Marie, loved your post on the Atomico AI thesis. Your move from Bain to leading the AI vertical at Atomico through the recent fund close is exactly the path I'm exploring. " +
      "I'm an INSEAD MBA candidate currently sense-checking my own consulting-to-investing transition and your perspective would be hugely valuable. " +
      "Would you be open to a brief 15-minute exchange in the next two weeks? I would also welcome any thoughts you have on the European AI landscape.";
    expect(message.length).toBeGreaterThan(300);

    const { content, warnings } = sanitizeOutreachContent("connection_note", {
      message,
      hook: "Atomico AI",
      char_count: message.length,
    });

    expect((content.message as string).length).toBeLessThanOrEqual(300);
    expect(content.char_count).toBe((content.message as string).length);
    expect(warnings.some((w) => w.startsWith("truncated"))).toBe(true);
  });

  it("does not truncate outreach_draft (no hard char limit on those)", () => {
    const longMessage =
      "A very long outreach draft that goes well beyond 300 characters because LinkedIn DMs and emails do not have the same hard limit as connection notes. "
        .repeat(4)
        .trim();
    expect(longMessage.length).toBeGreaterThan(300);

    const { content } = sanitizeOutreachContent("outreach_draft", {
      message: longMessage,
      hook: "test",
      tone: "warm",
      channel: "linkedin_message",
      char_count: longMessage.length,
    });

    // Sanitizer should leave outreach_draft message length intact
    // (no em-dashes to strip, no 300-char hard limit on this type)
    expect((content.message as string).length).toBe(longMessage.length);
  });

  it("returns content unchanged for non-outreach artifact types", () => {
    const input = {
      person_summary: "Some — summary with a dash",
      discussion_themes: [],
    };
    const { content, warnings } = sanitizeOutreachContent("meeting_prep", input);
    expect(content).toBe(input); // same reference — no mutation
    expect(warnings).toEqual([]);
  });

  it("returns no warnings when the message is already clean", () => {
    const { content, warnings } = sanitizeOutreachContent("connection_note", {
      message: "Hi Marie, loved your recent post.",
      hook: "post",
      char_count: 33,
    });
    expect(warnings).toEqual([]);
    expect(content.message).toBe("Hi Marie, loved your recent post.");
    expect(content.char_count).toBe(33);
  });
});
