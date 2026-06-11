/**
 * components/v2/discover/types.ts
 * DeckCard view-model: both seed cards and live Contact rows map into this shape
 * before being rendered by TinderView.
 */

import type { Tier } from "../palette";

/** A single bullet in the "About" section of a profile card. */
export type AboutBullet = string;

/** Source ribbon variant for a profile card. */
export type SourceKind = "cv" | "linkedin";

/** DeckCard is the normalised shape rendered by the swipe deck. */
export interface DeckCard {
  /** Stable identifier (seed: design ID; live: contact UUID) */
  id: string;
  /** Contact full name */
  name: string;
  /** Current job title */
  role: string | null;
  /** Current employer */
  company: string | null;
  /** City / Country */
  location: string | null;
  /** Remote avatar URL */
  avatar: string | null;
  /** LinkedIn profile URL */
  linkedinUrl: string | null;
  /**
   * Tier label — only rendered if present.
   * Seed cards carry this directly; live contacts derive it via tierLabelFromNumber.
   */
  tier: Tier | null;
  /**
   * "Why I'm pushing them" rationale paragraph.
   * Block hidden if null.
   */
  rationale: string | null;
  /**
   * Up to 3 About bullets: role history + education.
   * Block hidden if empty.
   */
  about: AboutBullet[];
  /**
   * Short INSEAD pill text, e.g. "22D".
   * Null = no InseadPill rendered.
   */
  inseadShort: string | null;
  /** Which channel this card comes from — controls source ribbon appearance */
  channel: SourceKind;
}

/** Chat message in the refine sidebar */
export interface ChatMsg {
  role: "user" | "agent";
  text: string;
}

/** Hint tag overlaid on the next card after a refine command */
export interface SearchHint {
  label: string;
  /** Index of the deck card this hint applies to */
  idx: number;
}
