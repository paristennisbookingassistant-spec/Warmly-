/**
 * Tests LinkedIn profile extraction against a real saved DOM.
 * Fixture: tests/fixtures/simone-bhagat.html (actually Ghassan Raad's profile)
 *
 * Run: npx vitest run tests/extraction-real-dom.test.ts
 */
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import path from "path";

import {
  parseProfileTextStructure,
} from "./helpers/parse-profile-text";

const FIXTURE_PATH = path.resolve(__dirname, "fixtures/simone-bhagat.html");

describe("LinkedIn real DOM extraction", () => {
  const html = readFileSync(FIXTURE_PATH, "utf-8");
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Simulate main.innerText by extracting text from p/h2/span tags
  const main = doc.querySelector("main");
  const innerText = main?.textContent ?? "";
  // For JSDOM, textContent includes hidden text. Use a simpler approach:
  // extract visible text from p, h2, span tags in order
  const textElements = main?.querySelectorAll("p, h2, span") ?? [];
  const lines: string[] = [];
  for (const el of Array.from(textElements)) {
    const text = el.textContent?.trim();
    if (text && text.length > 1 && text.length < 200) {
      lines.push(text);
    }
  }

  it("finds the name", () => {
    const result = parseProfileTextStructure(lines);
    expect(result.name).toBe("Ghassan Raad");
  });

  it("finds the headline", () => {
    const result = parseProfileTextStructure(lines);
    expect(result.headline).toBe("INSEAD MBA Candidate 25D");
  });

  it("finds the location", () => {
    const result = parseProfileTextStructure(lines);
    expect(result.location).toBe("France");
  });

  it("finds experience entries", () => {
    const result = parseProfileTextStructure(lines);
    expect(result.experiences.length).toBeGreaterThanOrEqual(3);

    // First role
    expect(result.experiences[0].title).toBe("Project Manager");
    expect(result.experiences[0].company).toContain("Ramco");
    expect(result.experiences[0].duration).toContain("2023");

    // Turner Construction roles
    const turner = result.experiences.find((e) => e.company.includes("Turner"));
    expect(turner).toBeDefined();
  });

  it("finds education entries", () => {
    const result = parseProfileTextStructure(lines);
    expect(result.educations.length).toBeGreaterThanOrEqual(2);

    expect(result.educations[0].school).toBe("INSEAD");
    expect(result.educations[0].degree).toContain("MBA");
    expect(result.educations[0].dates).toContain("2025");

    expect(result.educations[1].school).toBe("Northeastern University");
    expect(result.educations[1].degree).toContain("Engineering Management");
  });

  it("finds photo URL", () => {
    // Photo is in the HTML as a URL containing profile-displayphoto-shrink
    const htmlStr = doc.documentElement.outerHTML;
    const photoMatch = htmlStr.match(
      /https:\/\/media\.licdn\.com[^"'\s]*profile-displayphoto-shrink_400_400[^"'\s]*/
    );
    expect(photoMatch).not.toBeNull();
  });
});
