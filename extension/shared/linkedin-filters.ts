/**
 * Hardcoded maps for common LinkedIn search filters.
 *
 * Why hardcoded: LinkedIn's geoUrn and industry codes are stable enough
 * for the most common cases that we can ship a static map and cover
 * 90%+ of typical MBA networking targets. Anything outside this map
 * falls through to a free-text keyword (still useful — LinkedIn ranks
 * by relevance) without a hard failure.
 *
 * If LinkedIn changes a code, fix it here and ship. Adding a new city
 * or function is a 2-line PR.
 */

/**
 * geoUrn IDs for common metropolitan areas.
 * Source: scraped from LinkedIn search URLs after picking the location.
 */
export const LOCATION_GEO_URN: Record<string, { label: string; geoUrn: string }> = {
  paris: { label: "Paris, France", geoUrn: "105015875" },
  london: { label: "London, UK", geoUrn: "102257491" },
  singapore: { label: "Singapore", geoUrn: "102454443" },
  nyc: { label: "New York, NY", geoUrn: "105080838" },
  sf: { label: "San Francisco Bay Area", geoUrn: "102277331" },
  berlin: { label: "Berlin, Germany", geoUrn: "106967730" },
  amsterdam: { label: "Amsterdam, Netherlands", geoUrn: "102571732" },
  hongkong: { label: "Hong Kong SAR", geoUrn: "103291313" },
  dubai: { label: "Dubai, UAE", geoUrn: "104305776" },
  madrid: { label: "Madrid, Spain", geoUrn: "105646813" },
  shanghai: { label: "Shanghai, China", geoUrn: "102772228" },
  tokyo: { label: "Tokyo, Japan", geoUrn: "105072130" },
  toronto: { label: "Toronto, Canada", geoUrn: "100025096" },
  zurich: { label: "Zurich, Switzerland", geoUrn: "106431358" },
  dublin: { label: "Dublin, Ireland", geoUrn: "104677008" },
  bangalore: { label: "Bengaluru, India", geoUrn: "105214831" },
};

/**
 * Function / role-type filters. We use search keywords (not LinkedIn
 * industry codes) because:
 *  - Industry codes describe the COMPANY's industry, not the person's role
 *  - Keywords match titles + headlines + about-text — far more precise
 *    for "find me consultants" or "find me investors"
 *  - Industry codes change without warning; keywords don't
 */
export const FUNCTION_KEYWORDS: Record<string, { label: string; keywords: string }> = {
  consulting: { label: "Consulting", keywords: "consultant OR consulting" },
  vc: { label: "VC / Investing", keywords: "investor OR venture OR partner OR principal" },
  pe: { label: "Private Equity", keywords: '"private equity" OR PE' },
  engineering: { label: "Engineering", keywords: "engineer OR engineering" },
  product: { label: "Product", keywords: '"product manager" OR "product lead"' },
  sales: { label: "Sales", keywords: "sales OR account" },
  strategy: { label: "Strategy", keywords: "strategy OR strategic" },
  finance: { label: "Finance", keywords: "finance OR CFO OR controller" },
  marketing: { label: "Marketing", keywords: "marketing OR brand OR growth" },
  design: { label: "Design", keywords: "design OR designer OR UX" },
  operations: { label: "Operations", keywords: "operations OR COO OR ops" },
  founder: { label: "Founder / CEO", keywords: "founder OR CEO OR co-founder" },
};
