/**
 * tests/extension/dom-reader.test.ts
 * Unit tests for DOM extraction logic in content-script/dom-reader.ts.
 *
 * Approach:
 * - Build a realistic LinkedIn DOM using JSDOM for each test
 * - Swap globalThis.document so the module reads the fake DOM
 * - All swaps are synchronous and isolated per test
 */

import { describe, it, expect, afterEach } from "vitest";
import { JSDOM } from "jsdom";

// ---------------------------------------------------------------------------
// Module is imported once — we swap globalThis.document between tests
// ---------------------------------------------------------------------------

import {
  querySelector,
  isProfilePage,
  isSearchPage,
  extractProfile,
  extractSearchResults,
} from "../../extension/content-script/dom-reader";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _origDoc: Document | undefined;
let _origWin: Window & typeof globalThis | undefined;

function setDocument(doc: Document, href = "https://www.linkedin.com/in/test"): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _origDoc = (globalThis as any).document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _origWin = (globalThis as any).window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = doc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    location: { href },
    history: { back: () => {} },
    scrollTo: () => {},
    scrollBy: () => {},
    scrollY: 0,
  };
}

afterEach(() => {
  if (_origDoc !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = _origDoc;
  }
  if (_origWin !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = _origWin;
  }
});

function makeProfileDoc(opts?: { noName?: boolean; altNameSelector?: boolean }): Document {
  const nameHtml = opts?.noName
    ? ""
    : opts?.altNameSelector
    ? '<h1 class="inline">Jane Smith</h1>'
    : '<h1 class="text-heading-xlarge">John Doe</h1>';

  return new JSDOM(`
    <html><body>
      ${nameHtml}
      <div class="text-body-medium break-words">Software Engineer at Google</div>
      <span class="text-body-small inline t-black--light break-words">San Francisco, CA</span>
      <section id="experience">
        <ul>
          <li class="artdeco-list__item">
            <span aria-hidden="true">Senior Engineer</span>
            <div class="t-14 t-normal"><span aria-hidden="true">Google</span></div>
            <div class="t-14 t-normal t-black--light"><span aria-hidden="true">2020 – Present</span></div>
          </li>
          <li class="artdeco-list__item">
            <span aria-hidden="true">Engineer</span>
            <div class="t-14 t-normal"><span aria-hidden="true">Startup Inc</span></div>
            <div class="t-14 t-normal t-black--light"><span aria-hidden="true">2018 – 2020</span></div>
          </li>
        </ul>
      </section>
      <section id="education">
        <ul>
          <li class="artdeco-list__item">
            <span aria-hidden="true">MIT</span>
            <div class="t-14 t-normal"><span aria-hidden="true">B.S., Computer Science</span></div>
            <div class="t-14 t-normal t-black--light"><span aria-hidden="true">2014 – 2018</span></div>
          </li>
        </ul>
      </section>
      <a href="/search?facets=network">12 mutual connections</a>
    </body></html>
  `).window.document;
}

function makeSearchDoc(): Document {
  return new JSDOM(`
    <html><body>
      <div class="search-results-container">
        <li class="reusable-search__result-container">
          <a class="app-aware-link" href="https://www.linkedin.com/in/john-doe?trk=123">
            <span aria-hidden="true">John Doe</span>
          </a>
          <div class="entity-result__primary-subtitle">
            <span aria-hidden="true">Engineer at Google</span>
          </div>
          <div class="entity-result__secondary-subtitle">
            <span aria-hidden="true">Google</span>
          </div>
          <span class="dist-value">2nd</span>
        </li>
        <li class="reusable-search__result-container">
          <a class="app-aware-link" href="https://www.linkedin.com/in/jane-smith">
            <span aria-hidden="true">Jane Smith</span>
          </a>
          <div class="entity-result__primary-subtitle">
            <span aria-hidden="true">PM at Meta</span>
          </div>
          <span class="dist-value">3rd</span>
        </li>
        <!-- Result without /in/ URL — should be filtered out -->
        <li class="reusable-search__result-container">
          <a class="app-aware-link" href="https://www.linkedin.com/company/acme">
            <span aria-hidden="true">Acme Corp</span>
          </a>
        </li>
      </div>
    </body></html>
  `).window.document;
}

// ---------------------------------------------------------------------------
// querySelector (fallback chain)
// ---------------------------------------------------------------------------

describe("querySelector (fallback chain)", () => {
  it("returns the first matching element when primary selector matches", () => {
    setDocument(
      new JSDOM('<html><body><h1 class="text-heading-xlarge">Name</h1></body></html>').window.document
    );
    const el = querySelector(["h1.text-heading-xlarge", "h1"]);
    expect(el).not.toBeNull();
    expect(el?.textContent?.trim()).toBe("Name");
  });

  it("falls back to the second selector when the first fails", () => {
    setDocument(
      new JSDOM('<html><body><h1 class="inline">Fallback</h1></body></html>').window.document
    );
    const el = querySelector(["h1.text-heading-xlarge", "h1.inline"]);
    expect(el?.textContent?.trim()).toBe("Fallback");
  });

  it("returns null when no selectors match", () => {
    setDocument(
      new JSDOM('<html><body><div>No match</div></body></html>').window.document
    );
    const el = querySelector(["h1.text-heading-xlarge", "h1.inline", "h2"]);
    expect(el).toBeNull();
  });

  it("skips invalid selectors silently and tries the next one", () => {
    setDocument(
      new JSDOM('<html><body><h1>Valid</h1></body></html>').window.document
    );
    const el = querySelector([":::invalid:::", "h1"]);
    expect(el?.textContent?.trim()).toBe("Valid");
  });
});

// ---------------------------------------------------------------------------
// isProfilePage / isSearchPage
// ---------------------------------------------------------------------------

describe("isProfilePage", () => {
  it("returns true for /in/ URLs", () => {
    setDocument(
      new JSDOM("<html><body></body></html>").window.document,
      "https://www.linkedin.com/in/john-doe"
    );
    expect(isProfilePage()).toBe(true);
  });

  it("returns false for search pages", () => {
    setDocument(
      new JSDOM("<html><body></body></html>").window.document,
      "https://www.linkedin.com/search/results/people/?keywords=engineer"
    );
    expect(isProfilePage()).toBe(false);
  });

  it("returns false for the LinkedIn home feed", () => {
    setDocument(
      new JSDOM("<html><body></body></html>").window.document,
      "https://www.linkedin.com/feed/"
    );
    expect(isProfilePage()).toBe(false);
  });
});

describe("isSearchPage", () => {
  it("returns true for /search/results/people/ URLs", () => {
    setDocument(
      new JSDOM("<html><body></body></html>").window.document,
      "https://www.linkedin.com/search/results/people/?keywords=engineer"
    );
    expect(isSearchPage()).toBe(true);
  });

  it("returns false for profile pages", () => {
    setDocument(
      new JSDOM("<html><body></body></html>").window.document,
      "https://www.linkedin.com/in/john-doe"
    );
    expect(isSearchPage()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractProfile
// ---------------------------------------------------------------------------

describe("extractProfile", () => {
  it("extracts all fields from a realistic profile DOM", () => {
    setDocument(makeProfileDoc(), "https://www.linkedin.com/in/john-doe");
    const profile = extractProfile("session-123");

    expect(profile).not.toBeNull();
    expect(profile?.name).toBe("John Doe");
    expect(profile?.headline).toBe("Software Engineer at Google");
    expect(profile?.location).toBe("San Francisco, CA");
    expect(profile?.linkedin_url).toBe("https://www.linkedin.com/in/john-doe");
    expect(profile?.source_session_id).toBe("session-123");
    expect(profile?.current_title.title).toBe("Senior Engineer");
    expect(profile?.current_title.company).toBe("Google");
    expect(profile?.previous_roles).toHaveLength(1);
    expect(profile?.previous_roles[0].title).toBe("Engineer");
    expect(profile?.education).toHaveLength(1);
    expect(profile?.education[0].school).toBe("MIT");
    expect(profile?.mutual_connections).toBe(12);
    expect(profile?.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses the fallback h1.inline selector when primary h1.text-heading-xlarge is absent", () => {
    setDocument(makeProfileDoc({ altNameSelector: true }), "https://www.linkedin.com/in/jane-smith");
    const profile = extractProfile(null);

    expect(profile).not.toBeNull();
    expect(profile?.name).toBe("Jane Smith");
  });

  it("returns null when the name element is completely missing", () => {
    setDocument(makeProfileDoc({ noName: true }), "https://www.linkedin.com/in/ghost");
    const profile = extractProfile(null);
    expect(profile).toBeNull();
  });

  it("sets source_session_id to null when no sessionId is provided", () => {
    setDocument(makeProfileDoc(), "https://www.linkedin.com/in/john-doe");
    const profile = extractProfile(null);
    expect(profile?.source_session_id).toBeNull();
  });

  it("strips query parameters from the linkedin_url", () => {
    setDocument(
      makeProfileDoc(),
      "https://www.linkedin.com/in/john-doe?trk=nav_responsive_tab_profile"
    );
    const profile = extractProfile(null);
    expect(profile?.linkedin_url).not.toContain("?");
    expect(profile?.linkedin_url).toContain("/in/john-doe");
  });

  it("gracefully returns a profile even when experience section is absent", () => {
    const noExperienceDoc = new JSDOM(`
      <html><body>
        <h1 class="text-heading-xlarge">No Experience</h1>
        <div class="text-body-medium break-words">Freelancer</div>
      </body></html>
    `).window.document;
    setDocument(noExperienceDoc, "https://www.linkedin.com/in/nox");
    const profile = extractProfile(null);
    // Should still return a profile (minimum viable: name + URL)
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe("No Experience");
  });
});

// ---------------------------------------------------------------------------
// extractSearchResults
// ---------------------------------------------------------------------------

describe("extractSearchResults", () => {
  it("returns search results with valid /in/ profile URLs", () => {
    setDocument(
      makeSearchDoc(),
      "https://www.linkedin.com/search/results/people/?keywords=engineer"
    );
    const results = extractSearchResults();
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(r.linkedin_url).toContain("/in/");
    }
  });

  it("strips query parameters from profile URLs in search results", () => {
    setDocument(makeSearchDoc(), "https://www.linkedin.com/search/results/people/");
    const results = extractSearchResults();
    for (const r of results) {
      expect(r.linkedin_url).not.toContain("?trk");
    }
  });

  it("filters out results that link to company pages instead of /in/ profiles", () => {
    setDocument(makeSearchDoc(), "https://www.linkedin.com/search/results/people/");
    const results = extractSearchResults();
    const companyResult = results.find((r) => r.linkedin_url.includes("/company/"));
    expect(companyResult).toBeUndefined();
  });

  it("returns an empty array when the page has no search result containers", () => {
    setDocument(
      new JSDOM("<html><body><p>Nothing here</p></body></html>").window.document,
      "https://www.linkedin.com/search/results/people/"
    );
    const results = extractSearchResults();
    expect(results).toEqual([]);
  });
});
