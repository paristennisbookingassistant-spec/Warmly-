/**
 * content-script/behavior-sim.ts
 * Human-like behavior simulation for LinkedIn browsing.
 * Randomized delays, natural scroll patterns, organic click positions.
 *
 * CRITICAL: All LinkedIn actions must pass through these helpers.
 * Deterministic patterns look robotic and increase detection risk.
 * See PRD Section 5.3 — Human Behavior Simulator.
 */

import {
  MIN_DELAY_BETWEEN_PROFILES_MS,
  MAX_DELAY_BETWEEN_PROFILES_MS,
} from "../shared/constants";

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/**
 * Box-Muller transform — returns a normally distributed random number
 * with mean=0 and standard deviation=1.
 */
function gaussianRand(): number {
  let u = 0;
  let v = 0;
  // Avoid log(0)
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Gaussian-distributed delay clamped to [minMs, maxMs].
 * The mean sits at the midpoint; sigma is 1/6 of the range so that
 * ~99.7% of samples naturally fall within the bounds.
 */
function gaussianDelay(minMs: number, maxMs: number): number {
  const mean = (minMs + maxMs) / 2;
  const sigma = (maxMs - minMs) / 6;
  const sample = mean + gaussianRand() * sigma;
  return Math.round(Math.max(minMs, Math.min(maxMs, sample)));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Primary inter-profile delay.
 * Uses a gaussian distribution rather than uniform random.
 * Default range: 15–45 s (hard rate limit from PRD DIS-08).
 * 5% chance of a "reading pause" multiplier (2–3×) to simulate deeper reading.
 */
export async function humanDelay(
  minMs = MIN_DELAY_BETWEEN_PROFILES_MS,
  maxMs = MAX_DELAY_BETWEEN_PROFILES_MS
): Promise<void> {
  let delay = gaussianDelay(minMs, maxMs);

  // 5% chance of an extended reading pause
  if (Math.random() < 0.05) {
    delay = Math.round(delay * randFloat(2, 3));
  }

  await wait(delay);
}

/**
 * Jitter around a base delay.
 * Adds ±variancePct% (default ±20%) random variance.
 */
export async function jitterDelay(baseMs: number, variancePct = 20): Promise<void> {
  const variance = baseMs * (variancePct / 100);
  const jitter = randFloat(-variance, variance);
  await wait(Math.max(0, Math.round(baseMs + jitter)));
}

/**
 * Short micro-delay (200–1500 ms) for intra-action pauses.
 */
export async function waitShort(): Promise<void> {
  await wait(randInt(200, 1500));
}

/**
 * Scrolls the page (or a given element into view) in a natural, human-like pattern.
 * - Variable scroll increment size
 * - Small random pauses between increments
 * - Occasional longer pauses simulating reading
 * - Slight random overshoot/undershoot
 */
export async function naturalScroll(element?: Element): Promise<void> {
  // If a specific element is requested, scroll it into view first
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    await wait(randInt(400, 900));
    return;
  }

  const startY = window.scrollY;
  const targetY = document.body.scrollHeight * randFloat(0.75, 1.0);
  const totalDistance = targetY - startY;
  if (totalDistance <= 0) return;

  const steps = randInt(6, 14);

  for (let i = 0; i < steps; i++) {
    const progress = (i + 1) / steps;
    // Ease-in-out: slower at start and end
    const eased = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    const baseIncrement = (totalDistance / steps) * randFloat(0.7, 1.3);
    window.scrollBy({ top: baseIncrement, behavior: "smooth" });

    // Short pause between each scroll increment
    await wait(randInt(150, 600));

    // 20% chance of a longer reading pause mid-scroll
    if (Math.random() < 0.2) {
      await wait(randInt(1000, 3000));
    }

    // Suppress unused eased variable lint warning — used conceptually above
    void eased;
  }

  // Occasional slight scroll-back (10% chance) — looks like re-reading
  if (Math.random() < 0.1) {
    window.scrollBy({ top: -randInt(80, 250), behavior: "smooth" });
    await wait(randInt(500, 1200));
  }
}

/**
 * Simulates a human click at a slightly randomised position within an element.
 * Fires mouseover → mousedown → mouseup → click in sequence with a small
 * pre-click delay (200–800 ms).
 */
export async function organicClick(element: Element): Promise<void> {
  // Pre-click hesitation
  await wait(randInt(200, 800));

  const rect = element.getBoundingClientRect();

  // Randomise within the inner 60% of the element to avoid edges
  const x = rect.left + randFloat(0.2, 0.8) * rect.width;
  const y = rect.top + randFloat(0.2, 0.8) * rect.height;

  const makeEvent = (type: string) =>
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
    });

  element.dispatchEvent(makeEvent("mouseover"));
  await wait(randInt(30, 120));
  element.dispatchEvent(makeEvent("mousedown"));
  await wait(randInt(40, 150));
  element.dispatchEvent(makeEvent("mouseup"));
  element.dispatchEvent(makeEvent("click"));
}

/**
 * Full profile-reading simulation.
 * Call after navigating to a profile page, before extraction.
 * Simulates: initial pause → scroll through → linger → scroll back up slightly.
 */
export async function simulateProfileReading(): Promise<void> {
  // Initial recognition pause after page load
  await wait(randInt(1500, 3000));

  // Scroll through the profile
  await naturalScroll();

  // Reading pause at the bottom
  await wait(randInt(2000, 5000));

  // Scroll back up slightly — natural reading re-check behaviour
  const scrollBackPx = randInt(100, 350);
  window.scrollBy({ top: -scrollBackPx, behavior: "smooth" });
  await wait(randInt(600, 1200));
}

/**
 * Session duration variance.
 * Returns a slightly randomised profile limit so sessions don't always
 * stop at exactly the hard cap (adds human variance to session length).
 */
export function getSessionProfileLimit(hardLimit: number): number {
  // 20% chance of stopping a bit early
  if (Math.random() < 0.2) {
    return Math.floor(hardLimit * randFloat(0.75, 0.9));
  }
  return hardLimit;
}

/**
 * Backward-compatible alias for waitShort.
 */
export async function waitBetweenActions(
  minMs = MIN_DELAY_BETWEEN_PROFILES_MS,
  maxMs = MAX_DELAY_BETWEEN_PROFILES_MS
): Promise<void> {
  await humanDelay(minMs, maxMs);
}
