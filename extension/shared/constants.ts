/**
 * extension/shared/constants.ts
 * Hard-coded rate limits and LinkedIn DOM selector chains.
 * These values are non-configurable by users or runtime code.
 * See PRD Section 5.3 — DIS-08.
 */

// ---------------------------------------------------------------------------
// Rate limits — hard-coded, non-configurable
// ---------------------------------------------------------------------------

export const MAX_PROFILES_PER_SESSION = 25;
export const MAX_SESSIONS_PER_DAY = 2;
export const MIN_HOURS_BETWEEN_SESSIONS = 2;
export const MIN_DELAY_BETWEEN_PROFILES_MS = 15_000;
export const MAX_DELAY_BETWEEN_PROFILES_MS = 45_000;

/** 2 hours in milliseconds */
export const MIN_COOLDOWN_MS = MIN_HOURS_BETWEEN_SESSIONS * 60 * 60 * 1000;

/** Heartbeat interval — keeps service worker alive during long discovery loops */
export const HEARTBEAT_INTERVAL_MS = 25_000;

// ---------------------------------------------------------------------------
// DOM selector chains — ordered by confidence (most stable first)
// LinkedIn's DOM changes frequently; fall through the chain on failure.
// ---------------------------------------------------------------------------

export const SELECTORS = {
  profile: {
    name: [
      ".artdeco-card .t-24",                              // Dex — artdeco name heading
      ".text-heading-xlarge",
      "[data-anonymize='person-name']",
      ".artdeco-entity-lockup__title",
      ".top-card-layout__title",
      ".pv-text-details__left-panel .text-heading-xlarge",
      ".pv-top-card--list .text-heading-xlarge",
      "h1",
    ],
    headline: [
      ".artdeco-card .text-body-medium",                  // Dex — headline in card
      ".text-body-medium.break-words",
      ".top-card-layout__headline",
      ".artdeco-entity-lockup__subtitle",
      ".pv-top-card--list .text-body-medium",
      "div[data-field='headline']",
      "[data-generated-suggestion-target*='headline']",
      ".pv-text-details__left-panel .text-body-medium",
    ],
    location: [
      ".mt2 div:nth-of-type(2) span.text-body-small",    // Dex
      ".text-body-small.inline.t-black--light.break-words",
      "span[data-field='location']",
      ".pv-top-card--list-bullet .text-body-small",
      "[class*='pv-text-details__left-panel'] span.text-body-small",
    ],
    company: [
      '[aria-label^="Current company:"] > span',          // Dex — aria-label (most stable)
      "div[data-field='experience_company_name']",
      ".pv-top-card--experience-list .hoverable-link-text",
      "button[aria-label*='Current company']",
      ".experience-item:first-child .pv-entity__secondary-title",
    ],
    // Header-level aria-label selectors (Dex approach — accessibility attributes)
    headerCompany: [
      '[aria-label^="Current company:"] > span',
      "button[aria-label*='Current company'] span",
    ],
    headerEducation: [
      '[aria-label^="Education:"] > span',
    ],
    connectionDegree: [
      ".dist-value",
      "span[data-anonymize='degree-connection']",
      ".pv-top-card--list .distance-badge",
      "[data-test-id*='connection-degree']",
    ],
    about: [
      ".pv-shared-text-with-see-more .visually-hidden",
      "#about ~ div .pv-shared-text-with-see-more span",
      "section[data-section='summary'] p",
      ".pv-about-section p",
    ],
    avatar: [
      "img.pv-top-card-profile-picture__image--show",     // Dex — note --show suffix
      ".pv-top-card-profile-picture__image",
      ".top-card-layout__entity-image",
      ".pv-top-card__photo img",
      "img.profile-photo-edit__preview",
      ".presence-entity__image",
    ],
    mutualConnections: [
      "[data-test-id*='mutual-connections']",
      ".pv-member-badge a",
      "a[href*='facets=network']",
    ],
    experienceSection: [
      "section#experience",
      "[data-section='experience']",
      "section[aria-label*='Experience']",
    ],
    educationSection: [
      "section#education",
      "[data-section='education']",
      "section[aria-label*='Education']",
    ],
  },
  search: {
    results: [
      ".search-results-container li.reusable-search__result-container",
      "ul.reusable-search__entity-result-list li",
      ".entity-result",
    ],
    resultLink: [
      "a.app-aware-link[href*='/in/']",
      "a[href*='linkedin.com/in/']",
      ".entity-result__title a",
    ],
    nextButton: [
      "button[aria-label='Next']",
      ".artdeco-pagination__button--next",
      "li.artdeco-pagination__indicator--number.active + li button",
    ],
    totalResults: [
      ".search-results-container .pb2.t-black--light.t-14",
      "div[data-total-results]",
      ".search-results__total",
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  RATE_LIMIT_STATE: "rate_limit_state",
  DISCOVERY_SESSION: "discovery_session",
  AUTH_TOKEN: "auth_token",
  SUPABASE_SESSION: "supabase_session",
  BACKEND_URL: "backend_url",
} as const;

// ---------------------------------------------------------------------------
// Default backend URL
// ---------------------------------------------------------------------------

// Injected at build time by build.mjs. Run `npm run build:prod` for production.
declare const __BACKEND_URL__: string;
export const DEFAULT_BACKEND_URL: string =
  typeof __BACKEND_URL__ !== "undefined"
    ? __BACKEND_URL__
    : "http://localhost:3000";
