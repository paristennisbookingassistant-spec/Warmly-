/**
 * components/v2/discover/seed.ts
 * Typed fallback decks ported from design/warmly-v2/project/js/screens/discover.jsx.
 * Used for the INSEAD door (always) and LinkedIn door (demo/fallback when no live contacts).
 * Logos use /v2/... paths, not assets/...
 */

import type { DeckCard } from "./types";

/** INSEAD alumni seed deck (5 cards, primary channel) */
export const CV_DECK: DeckCard[] = [
  {
    id: "cv-anna",
    name: "Anna Schmidt",
    role: "Senior Product Manager",
    company: "Parloa",
    location: "Berlin",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-anna",
    linkedinUrl: "https://www.linkedin.com/in/anna-schmidt-parloa",
    tier: "Strong",
    rationale:
      "Anna made the same Bain → AI startup pivot you are sketching, came out of your 22D Fontainebleau class, and now leads the conversational AI product line at Parloa, one of your top three target companies.",
    about: ["Senior PM at Parloa, 2 yrs", "Bain & Co, 4 yrs", "INSEAD MBA 2022, Fontainebleau"],
    inseadShort: "22D",
    channel: "cv",
  },
  {
    id: "cv-liu",
    name: "Liu Wei",
    role: "Product Manager",
    company: "Anthropic",
    location: "Paris",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-liu",
    linkedinUrl: "https://www.linkedin.com/in/liu-wei-anthropic",
    tier: "Strong",
    rationale:
      "Liu joined the Anthropic Paris team last quarter, exact match for your target role, target city, and target company. Chinese background, similar visa journey, came from McKinsey Greater China.",
    about: ["PM at Anthropic, 7 mo", "McKinsey & Co, 4 yrs", "INSEAD MBA 2024, Singapore"],
    inseadShort: "24D",
    channel: "cv",
  },
  {
    id: "cv-camille",
    name: "Camille Dubois",
    role: "Lead Product Manager",
    company: "Mistral AI",
    location: "Paris",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-camille",
    linkedinUrl: "https://www.linkedin.com/in/camille-dubois-mistral",
    tier: "Strong",
    rationale:
      "Lead PM at Mistral, ex-McKinsey, Paris-based. She runs hiring for her squad and her team is one of the few hiring sponsorship-eligible PMs this fall.",
    about: ["Lead PM at Mistral AI, 1.5 yrs", "McKinsey, 5 yrs", "INSEAD MBA 2021, Fontainebleau"],
    inseadShort: "21D",
    channel: "cv",
  },
  {
    id: "cv-tomas",
    name: "Tomás Reyes",
    role: "Senior Product Manager",
    company: "Hugging Face",
    location: "Paris",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-tomas",
    linkedinUrl: "https://www.linkedin.com/in/tomas-reyes-hf",
    tier: "Good",
    rationale:
      "Open-source PM at Hugging Face, wide network across the Paris AI scene. Less of a direct match for the role, but a high-leverage connector if you want introductions to Mistral and Anthropic teams.",
    about: ["Sr PM at Hugging Face, 2 yrs", "Stripe, 3 yrs", "INSEAD MBA 2023, Fontainebleau"],
    inseadShort: "23D",
    channel: "cv",
  },
  {
    id: "cv-aiko",
    name: "Aiko Tanaka",
    role: "Product Director",
    company: "Aleph Alpha",
    location: "Berlin",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-aiko",
    linkedinUrl: "https://www.linkedin.com/in/aiko-tanaka-aa",
    tier: "Good",
    rationale:
      "Director-level at Aleph Alpha in Berlin. Non-EU background, sponsorship-friendly, and her hiring philosophy explicitly favours INSEAD alumni, she has hired 2 from your class already.",
    about: ["Product Director at Aleph Alpha, 2 yrs", "Zalando, 4 yrs", "INSEAD MBA 2020, Fontainebleau"],
    inseadShort: "20D",
    channel: "cv",
  },
];

/** LinkedIn demo/fallback deck (5 cards) — used when no live pending contacts */
export const LINKEDIN_DEMO_DECK: DeckCard[] = [
  {
    id: "li-lukas",
    name: "Lukas Becker",
    role: "Product Manager",
    company: "Cohere",
    location: "Berlin",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-lukas",
    linkedinUrl: "https://www.linkedin.com/in/lukas-becker-cohere",
    tier: "Strong",
    rationale:
      "Anna and Lukas worked together at Bain Berlin before Lukas pivoted to Cohere as PM. Anna is currently active on his posts, a warm intro through her would be unusually strong.",
    about: ["PM at Cohere, 1 yr", "Bain Berlin, 3 yrs", "INSEAD MBA 2025, Fontainebleau"],
    inseadShort: "25J",
    channel: "linkedin",
  },
  {
    id: "li-sara",
    name: "Sara El-Amin",
    role: "Head of Go-to-Market",
    company: "Synthesia",
    location: "London",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-sara",
    linkedinUrl: "https://www.linkedin.com/in/sara-el-amin-synthesia",
    tier: "Good",
    rationale:
      "Mathieu and Sara overlapped at BCG. She runs GTM at Synthesia and has been writing publicly about AI PM hiring, a softer angle than a cold pitch but a strong domain match.",
    about: ["Head of GTM at Synthesia, 2 yrs", "BCG, 4 yrs", "INSEAD MBA 2023, Fontainebleau"],
    inseadShort: "23D",
    channel: "linkedin",
  },
  {
    id: "li-pedro",
    name: "Pedro Almeida",
    role: "Partner",
    company: "Heartcore Capital",
    location: "Paris",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-pedro",
    linkedinUrl: "https://www.linkedin.com/in/pedro-almeida-heartcore",
    tier: "Good",
    rationale:
      "Yuxuan has co-invested with Pedro on two deals. He runs the AI thesis at Heartcore, useful for both the VC angle and for warm intros into his portfolio AI companies.",
    about: ["Partner at Heartcore, 4 yrs", "Index Ventures, 3 yrs", "INSEAD MBA 2019, Fontainebleau"],
    inseadShort: "19D",
    channel: "linkedin",
  },
  {
    id: "li-mariam",
    name: "Mariam Rashid",
    role: "Senior Product Manager",
    company: "OpenAI",
    location: "London / Paris",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-mariam",
    linkedinUrl: "https://www.linkedin.com/in/mariam-rashid-openai",
    tier: "Strong",
    rationale:
      "Mariam is at OpenAI and splits time between London and Paris. Anna knows her from the Bain alumni circle. OpenAI is opening a Paris hub, she will know who is hiring.",
    about: ["Sr PM at OpenAI, 1.5 yrs", "Bain & Co, 3 yrs", "INSEAD MBA 2022, Singapore"],
    inseadShort: "22J",
    channel: "linkedin",
  },
  {
    id: "li-hiroshi",
    name: "Hiroshi Yamada",
    role: "Co-founder",
    company: "Stealth AI",
    location: "Berlin",
    avatar: "https://i.pravatar.cc/240?u=warmly-deck-hiroshi",
    linkedinUrl: "https://www.linkedin.com/in/hiroshi-yamada-stealth",
    tier: "Adjacent",
    rationale:
      "Founding team of an unannounced AI company in Berlin. Mathieu knew him at Parloa, useful as an exploratory chat if you want an early-stage option, less of a direct role match.",
    about: ["Co-founder, Stealth AI, 6 mo", "Parloa (founding PM), 2 yrs", "INSEAD MBA 2021, Singapore"],
    inseadShort: "21J",
    channel: "linkedin",
  },
];

/** Synced peers displayed in the LinkedIn door NetworkPreview */
export interface SyncedPeer {
  id: string;
  name: string;
  short: string;
  avatar: string;
}

export const SYNCED_PEERS: SyncedPeer[] = [
  { id: "anna",    name: "Anna Schmidt",    short: "Anna",    avatar: "https://i.pravatar.cc/200?u=warmly-seed-1" },
  { id: "mathieu", name: "Mathieu Lefèvre", short: "Mathieu", avatar: "https://i.pravatar.cc/200?u=warmly-seed-2" },
  { id: "yuxuan",  name: "Yuxuan Chen",     short: "Yuxuan",  avatar: "https://i.pravatar.cc/200?u=warmly-seed-3" },
];

/** Typed seed bundle */
export const DISCOVERY_DECK = {
  cv: CV_DECK,
  linkedin: LINKEDIN_DEMO_DECK,
} as const;
