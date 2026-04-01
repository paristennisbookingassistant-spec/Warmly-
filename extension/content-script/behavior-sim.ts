/**
 * content-script/behavior-sim.ts
 * Human-like behavior simulation for LinkedIn automation.
 * Randomized delays, natural scroll patterns, organic click positions.
 * See PRD Section 5.3 — human behavior simulator.
 *
 * CRITICAL: All LinkedIn actions must pass through these helpers.
 * Do NOT use fixed delays or deterministic patterns.
 */

/**
 * Returns a random integer between min and max (inclusive).
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random float between min and max.
 */
function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Waits for a random duration between minMs and maxMs.
 * Primary inter-action delay — 15–45 seconds per PRD DIS-02.
 */
export function waitBetweenActions(
  minMs = 15_000,
  maxMs = 45_000
): Promise<void> {
  const delay = randInt(minMs, maxMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Short pause for micro-delays within a single action (e.g., scroll steps).
 * 200ms–1.5s range simulates reading/thinking.
 */
export function waitShort(): Promise<void> {
  const delay = randInt(200, 1500);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Scrolls the page with a natural pattern:
 * - Variable speed
 * - Pauses during scroll
 * - Doesn't always scroll to the exact bottom
 */
export async function naturalScroll(
  targetY?: number,
  direction: "down" | "up" = "down"
): Promise<void> {
  const target = targetY ?? (direction === "down" ? document.body.scrollHeight : 0);
  const start = window.scrollY;
  const distance = target - start;
  const steps = randInt(5, 12);
  const stepSize = distance / steps;

  for (let i = 0; i < steps; i++) {
    const jitter = randFloat(-0.15, 0.15) * Math.abs(stepSize);
    window.scrollBy({ top: stepSize + jitter, behavior: "smooth" });
    await waitShort();

    // Occasional longer pause — simulates reading
    if (Math.random() < 0.2) {
      await new Promise((resolve) => setTimeout(resolve, randInt(1000, 3000)));
    }
  }
}

/**
 * Clicks an element at a slightly randomized position within its bounds.
 * Avoids clicking the exact center (which looks robotic).
 */
export function organicClick(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const x = rect.left + randFloat(0.2, 0.8) * rect.width;
  const y = rect.top + randFloat(0.2, 0.8) * rect.height;

  element.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true, clientX: x, clientY: y })
  );
  element.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y })
  );
  element.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y })
  );
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })
  );
}

/**
 * Simulates reading a page by scrolling through it with pauses.
 * Call this after navigating to a profile before extraction.
 */
export async function simulateProfileReading(): Promise<void> {
  // Initial pause — simulates page load recognition
  await new Promise((resolve) => setTimeout(resolve, randInt(1500, 3000)));

  // Scroll down through the profile
  await naturalScroll(document.body.scrollHeight * randFloat(0.7, 1.0));

  // Pause at the bottom — simulates reading
  await new Promise((resolve) => setTimeout(resolve, randInt(2000, 5000)));

  // Scroll back up slightly — natural behavior
  await naturalScroll(document.body.scrollHeight * randFloat(0.1, 0.3), "up");
}

/**
 * Session duration variance.
 * Occasionally stops before reaching the max profile count.
 * Returns the actual max profiles for this session (slightly randomized).
 */
export function getSessionProfileLimit(hardLimit: number): number {
  // 20% chance of stopping a bit early
  if (Math.random() < 0.2) {
    return Math.floor(hardLimit * randFloat(0.75, 0.9));
  }
  return hardLimit;
}
