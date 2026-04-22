/**
 * Pure text-based LinkedIn profile parser.
 * Shared between the extension content script and Node.js tests.
 *
 * Input: array of text lines (from main.innerText.split('\n') or DOM element extraction)
 * Output: structured profile data
 */

export interface ParsedExperience {
  title: string;
  company: string;
  duration: string;
}

export interface ParsedEducation {
  school: string;
  degree: string;
  dates: string | undefined;
}

export interface ParsedProfile {
  name: string;
  headline: string | null;
  company: string | null;
  school: string | null;
  location: string | null;
  experiences: ParsedExperience[];
  educations: ParsedEducation[];
}

// Section headings that delimit sections in main.innerText
const SECTION_HEADINGS = [
  "Experience",
  "Education",
  "Skills",
  "Languages",
  "Licenses & certifications",
  "Certifications",
  "Licenses",
  "Courses",
  "Projects",
  "Honors & awards",
  "Publications",
  "Volunteering",
  "Activity",
  "Interests",
  "Recommendations",
  "Show all",
];

function isSectionHeading(line: string): boolean {
  return SECTION_HEADINGS.includes(line.trim());
}

// Date patterns: "Oct 2023 - Dec 2024 · 1 yr 3 mos" or "2018 – 2019"
const DATE_PATTERN =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{0,4}|^\d{4}\s*[-–]\s*\d{4}|Present/;

function isDateLine(line: string): boolean {
  return DATE_PATTERN.test(line);
}

// Employment type indicators
const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship",
  "Self-employed",
  "Temporary",
  "Seasonal",
  "Apprenticeship",
];

function isDescriptionLine(line: string): boolean {
  if (line.startsWith("- ") || line.startsWith("• ")) return true;
  if (line.startsWith("...") || line.startsWith("…")) return true;
  if (line.length > 80) return true;
  if (/^(Led|Spearheaded|Designed|Developed|Built|Managed|Created|Drove|Improved|Improving|Launched|Delivered|Implemented|Established|Oversaw|Coordinated|Analyzed|Executed)\s/i.test(line)) return true;
  return false;
}

function isLocationLine(line: string): boolean {
  // Location lines often have "· On-site", "· Remote", "· Hybrid", or are "City, State, Country"
  if (/·\s*(On-site|Remote|Hybrid)/i.test(line)) return true;
  // City, Region, Country pattern
  if (/^[A-Z][^·]{3,60},\s*[A-Z]/.test(line) && !isDateLine(line)) return true;
  return false;
}

function isCompanyLine(line: string): boolean {
  // Company lines often have "· Full-time", "· Internship", etc.
  for (const type of EMPLOYMENT_TYPES) {
    if (line.includes(`· ${type}`)) return true;
  }
  // Or "Full-time · 4 yrs" pattern
  if (/^(Full-time|Part-time|Contract|Freelance|Internship|Self-employed)\s*·/.test(line)) return true;
  return false;
}

/**
 * Extracts lines between two section headings.
 */
function extractSection(lines: string[], sectionName: string): string[] {
  const startIdx = lines.findIndex((l) => l.trim() === sectionName);
  if (startIdx === -1) return [];

  const result: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (isSectionHeading(line)) break;
    result.push(line);
  }
  return result;
}

/**
 * Parses experience entries from the Experience section lines.
 */
function parseExperience(sectionLines: string[]): ParsedExperience[] {
  const experiences: ParsedExperience[] = [];
  let currentTitle: string | null = null;
  let currentCompany: string | null = null;
  let currentDuration: string | null = null;
  // Track the "parent" company for grouped roles (e.g., multiple roles at Turner Construction)
  let groupCompany: string | null = null;

  const flushEntry = () => {
    if (currentTitle) {
      experiences.push({
        title: currentTitle,
        company: currentCompany ?? groupCompany ?? "Unknown",
        duration: currentDuration ?? "Unknown",
      });
    }
    currentTitle = null;
    currentCompany = null;
    currentDuration = null;
  };

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];

    if (isDateLine(line)) {
      currentDuration = line;
      continue;
    }

    if (isDescriptionLine(line)) continue;

    if (isLocationLine(line)) {
      // Skip location lines, they don't add to the entry
      continue;
    }

    if (isCompanyLine(line)) {
      // "Ramco Trading and Contracting S.A.L · Full-time" → extract company name
      const parts = line.split(" · ");
      // Check if this is "Full-time · 4 yrs" (duration indicator for grouped company)
      if (EMPLOYMENT_TYPES.some((t) => line.startsWith(t))) {
        // This is a group header like "Full-time · 4 yrs"
        // The previous line was the company name
        continue;
      }
      currentCompany = parts[0].trim();
      continue;
    }

    // If the line doesn't match any pattern, it could be:
    // 1. A job title (if we're expecting one)
    // 2. A company name (for grouped roles)
    // 3. Other text to skip

    // Check if next lines suggest this is a company group header
    // Pattern: "Turner Construction Company" followed by "Full-time · 4 yrs"
    const nextLine = sectionLines[i + 1];
    if (
      nextLine &&
      EMPLOYMENT_TYPES.some((t) => nextLine.startsWith(t))
    ) {
      // This line is a company name for grouped roles
      flushEntry();
      groupCompany = line;
      continue;
    }

    // Otherwise, treat as a job title
    flushEntry();
    currentTitle = line;

    // Check if the company is on the next line with employment type
    if (nextLine && isCompanyLine(nextLine)) {
      const parts = nextLine.split(" · ");
      currentCompany = parts[0].trim();
      i++; // skip the company line
    }
  }

  // Flush last entry
  flushEntry();

  return experiences;
}

/**
 * Parses education entries from the Education section lines.
 */
function parseEducation(sectionLines: string[]): ParsedEducation[] {
  const educations: ParsedEducation[] = [];
  let currentSchool: string | null = null;
  let currentDegree: string | null = null;
  let currentDates: string | undefined = undefined;

  const flushEntry = () => {
    if (currentSchool) {
      educations.push({
        school: currentSchool,
        degree: currentDegree ?? "Unknown",
        dates: currentDates,
      });
    }
    currentSchool = null;
    currentDegree = null;
    currentDates = undefined;
  };

  for (const line of sectionLines) {
    // Date line
    if (isDateLine(line)) {
      currentDates = line;
      continue;
    }

    // Grade line (e.g., "Grade: 3.8/4.0")
    if (line.startsWith("Grade:") || line.startsWith("Activities and societies:")) {
      continue;
    }

    // If we have a school and this looks like a degree (contains common degree keywords)
    if (currentSchool && !currentDegree) {
      currentDegree = line;
      continue;
    }

    // Otherwise, this is a new school name — flush previous entry
    flushEntry();
    currentSchool = line;
  }

  flushEntry();
  return educations;
}

/**
 * Main parser: takes lines from the page and returns structured profile data.
 */
export function parseProfileTextStructure(lines: string[]): ParsedProfile {
  // Deduplicate consecutive identical lines (LinkedIn sometimes renders text twice)
  const deduped: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (deduped.length > 0 && deduped[deduped.length - 1] === trimmed) continue;
    deduped.push(trimmed);
  }

  // --- Header card parsing ---
  // Find name: first line that matches a person name pattern (before "· 1st/2nd/3rd")
  let name = "";
  let degreeIdx = -1;

  for (let i = 0; i < Math.min(deduped.length, 30); i++) {
    if (/(?:^|\s|·)\s*(1st|2nd|3rd|\d+th)\b/i.test(deduped[i]) && deduped[i].length < 30) {
      degreeIdx = i;
      break;
    }
  }

  // Name is typically 1-2 lines before the degree indicator
  if (degreeIdx >= 2) {
    // The line before degree that looks like a name (not too long, not a UI element)
    for (let i = degreeIdx - 1; i >= 0; i--) {
      const candidate = deduped[i];
      if (candidate.length > 3 && candidate.length < 60 && !candidate.startsWith("·") && !candidate.includes("notification")) {
        name = candidate;
        break;
      }
    }
  }
  if (!name && deduped.length > 0) {
    // Fallback: find the first line that appears to be a name
    for (const line of deduped.slice(0, 15)) {
      if (line.length > 2 && line.length < 50 && /^[A-Z]/.test(line) && !line.includes("Skip") && !line.includes("Home") && !line.includes("notification")) {
        name = line;
        break;
      }
    }
  }

  // Headline: first line after the degree indicator that isn't another degree or short UI text
  let headline: string | null = null;
  if (degreeIdx >= 0) {
    for (let i = degreeIdx + 1; i < Math.min(deduped.length, degreeIdx + 5); i++) {
      const candidate = deduped[i];
      // Skip additional degree indicators ("· 2nd", "· 3rd")
      if (/^·/.test(candidate)) continue;
      // Skip very short lines
      if (candidate.length <= 3) continue;
      if (!isSectionHeading(candidate)) {
        headline = candidate;
        break;
      }
    }
  }

  // Find the index where the headline was found for searching company/school after it
  let headlineFoundIdx = -1;
  if (headline && degreeIdx >= 0) {
    headlineFoundIdx = deduped.indexOf(headline, degreeIdx);
  }

  // Company · School line
  let company: string | null = null;
  let school: string | null = null;
  const searchStart = headlineFoundIdx > 0 ? headlineFoundIdx + 1 : (degreeIdx > 0 ? degreeIdx + 2 : 5);
  for (let i = searchStart; i < Math.min(deduped.length, searchStart + 5); i++) {
    if (deduped[i]?.includes(" · ") && deduped[i].length < 100) {
      const parts = deduped[i].split(/\s+·\s+/);
      company = parts[0]?.trim() || null;
      school = parts[1]?.trim() || null;
      break;
    }
  }

  // Location: line with comma pattern after company line
  let location: string | null = null;
  for (let i = searchStart; i < Math.min(deduped.length, searchStart + 6); i++) {
    const line = deduped[i];
    // Country name or "City, Region" pattern
    if (line && /^[A-Z][a-z]/.test(line) && line.length < 60 && !line.includes("·") && !isSectionHeading(line) && line !== name && line !== headline) {
      if (/,/.test(line) || /^[A-Z][a-z]+$/.test(line)) {
        location = line;
        break;
      }
    }
  }

  // --- Section parsing ---
  const expLines = extractSection(deduped, "Experience");
  const eduLines = extractSection(deduped, "Education");

  const experiences = parseExperience(expLines);
  const educations = parseEducation(eduLines);

  return {
    name,
    headline,
    company,
    school,
    location,
    experiences,
    educations,
  };
}
