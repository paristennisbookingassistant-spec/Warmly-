// Seed data, INSEAD alumni contacts, draft variants, user identity

const USER = {
  firstName: 'Liyang',
  fullName: 'Liyang Guo',
  email: 'liyang@insead.edu',
  background: {
    priorIndustry: 'Consulting',
    priorFunction: 'Strategy',
    nationality: 'Chinese',
    workAuth: ['China'],
    inseadClass: 'MBA · 26D',
  },
  target: {
    industry: 'Tech (AI)',
    role: 'Product Manager',
    companies: ['Parloa', 'Mistral', 'Anthropic'],
    geography: ['Paris', 'Berlin'],
  },
  materials: [
    { name: 'Liyang_Guo_CV.pdf', kind: 'cv' },
    { name: 'CareerLeader_Assessment.pdf', kind: 'assessment' },
    { name: 'cover_letter_sample.docx', kind: 'writing' },
  ],
};

const CONTACTS = [
  {
    id: 'anna',
    name: 'Anna Schmidt',
    first: 'Anna',
    role: 'Senior Product Manager',
    company: 'Parloa',
    location: 'Berlin',
    insead: 'MBA 22D',
    inseadShort: '22D',
    tier: 'Strong',
    status: 'New',
    lastContact: null,
    lastContactLabel: 'Never',
    rationale: 'She made the same Bain to AI startup pivot you are targeting, came out of your INSEAD 22D Fontainebleau class, and now leads the conversational AI product line that overlaps directly with your AI agent interest.',
    short: 'Same Bain to AI pivot.',
    about: [
      'PM at Parloa, 2 yrs',
      'Bain & Co, 4 yrs',
      'INSEAD MBA 2022, Fontainebleau',
    ],
    drafts: 0,
    notes: 0,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-1',
  },
  {
    id: 'mathieu',
    name: 'Mathieu Lefèvre',
    first: 'Mathieu',
    role: 'Head of Strategy',
    company: 'Parloa',
    location: 'Paris',
    insead: 'MBA 24J',
    inseadShort: '24J',
    tier: 'Strong',
    status: 'Saved',
    lastContact: '1w ago',
    lastContactLabel: '1 week ago',
    rationale: 'Came to Parloa from McKinsey with the same path you are sketching out, and he is Paris based so easy to grab coffee.',
    short: 'Same path you are sketching.',
    about: [
      'Head of Strategy at Parloa, 1 yr',
      'McKinsey & Co, 5 yrs',
      'INSEAD MBA 2024, Singapore',
    ],
    drafts: 1,
    notes: 0,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-2',
  },
  {
    id: 'yuxuan',
    name: 'Yuxuan Chen',
    first: 'Yuxuan',
    role: 'Investment Associate',
    company: 'Iris Capital',
    location: 'Paris',
    insead: 'MBA 22D',
    inseadShort: '22D',
    tier: 'Strong',
    status: 'Met',
    lastContact: '2w ago',
    lastContactLabel: '2 weeks ago',
    rationale: 'A Paris based VC investor with a Chinese background, exact match for your VC pivot in Paris.',
    short: 'Paris VC, Chinese background.',
    about: [
      'Investment Associate at Iris Capital, 3 yrs',
      'Goldman Sachs, 3 yrs',
      'INSEAD MBA 2022, Fontainebleau',
    ],
    drafts: 2,
    notes: 3,
    meetings: 1,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-3',
  },
  {
    id: 'paul',
    name: 'Paul Beaumont',
    first: 'Paul',
    role: 'Senior Associate',
    company: 'Eurazeo',
    location: 'Paris',
    insead: 'MBA 23J',
    inseadShort: '23J',
    tier: 'Good',
    status: 'Contacted',
    lastContact: '3w ago',
    lastContactLabel: '3 weeks ago',
    followUpDue: true,
    rationale: 'He is in growth equity in Paris, and the consulting to PE crowd typically routes through people like him.',
    short: 'Growth equity, consulting to PE route.',
    about: [
      'Senior Associate at Eurazeo, 2 yrs',
      'BCG, 4 yrs',
      'INSEAD MBA 2023, Singapore',
    ],
    drafts: 1,
    notes: 1,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-4',
  },
  {
    id: 'ugo',
    name: 'Ugo Bianchi',
    first: 'Ugo',
    role: 'Director',
    company: 'Cabinet R&D Pharma',
    location: 'Paris',
    insead: 'MBA 21D',
    inseadShort: '21D',
    tier: 'Good',
    status: 'Met',
    lastContact: '5w ago',
    lastContactLabel: '5 weeks ago',
    followUpDue: true,
    rationale: 'Already in your network with a recent message thread, and a useful test case for the assistant.',
    short: 'In your network, recent thread.',
    about: [
      'Director at Cabinet R&D Pharma, 4 yrs',
      'Sanofi, 6 yrs',
      'INSEAD MBA 2021, Fontainebleau',
    ],
    drafts: 0,
    notes: 2,
    meetings: 2,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-5',
  },
  {
    id: 'sofia',
    name: 'Sofia Russo',
    first: 'Sofia',
    role: 'Customer Success Director',
    company: 'Parloa',
    location: 'Munich',
    insead: 'MBA 21D',
    inseadShort: '21D',
    tier: 'Good',
    status: 'Saved',
    lastContact: '2w ago',
    lastContactLabel: '2 weeks ago',
    rationale: 'Her Customer Success role is adjacent to your strategy and product target, but she is well positioned to give you the inside view on Parloa commercial motion.',
    short: 'Inside view on Parloa commercial motion.',
    about: [
      'CS Director at Parloa, 2 yrs',
      'Salesforce, 5 yrs',
      'INSEAD MBA 2021, Fontainebleau',
    ],
    drafts: 0,
    notes: 0,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-6',
  },
  {
    id: 'karim',
    name: 'Karim Benabderrahmane',
    first: 'Karim',
    role: 'Engineering Manager',
    company: 'Parloa',
    location: 'Berlin',
    insead: 'MIM 23',
    inseadShort: 'MIM 23',
    tier: 'Adjacent',
    status: 'Archived',
    lastContact: '3w ago',
    lastContactLabel: '3 weeks ago',
    rationale: 'He is on the engineering side at Parloa, which makes him a lower tier fit for your strategy and VC angle but a useful contact if you want a technical view on the product.',
    short: 'Technical view on the product.',
    about: [
      'Eng Manager at Parloa, 1 yr',
      'Spotify, 3 yrs',
      'INSEAD MIM 2023, Fontainebleau',
    ],
    drafts: 0,
    notes: 0,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-7',
  },
  {
    id: 'elena',
    name: 'Elena Rossi',
    first: 'Elena',
    role: 'Marketing Lead',
    company: 'Parloa',
    location: 'Berlin',
    insead: 'MBA 23J',
    inseadShort: '23J',
    tier: 'Good',
    status: 'Saved',
    lastContact: '4d ago',
    lastContactLabel: '4 days ago',
    rationale: 'She came to Parloa from HubSpot with a B2B SaaS marketing background, and she could open doors at other B2B AI companies on your target list.',
    short: 'Could open doors at other B2B AI cos.',
    about: [
      'Marketing Lead at Parloa, 1 yr',
      'HubSpot, 3 yrs',
      'INSEAD MBA 2023, Singapore',
    ],
    drafts: 0,
    notes: 0,
    meetings: 0,
    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-8',
  },
];

// Pre-canned drafts for Anna Schmidt
const DRAFTS_FOR_ANNA = {
  initial: `Bonjour Anna,

Ravi de découvrir ton parcours. Ton passage de Bain à Parloa résonne avec la transition que je vise actuellement vers les produits IA, et notre passage commun par INSEAD Fontainebleau rend cet échange d'autant plus naturel.

Aurais-tu 20 minutes dans les prochaines semaines pour échanger sur ton expérience chez Parloa et les leçons de ton pivot ?

À bientôt,
Liyang`,
  shorter: `Bonjour Anna,

Ton parcours Bain puis Parloa résonne avec ma propre transition vers les produits IA. INSEAD 22D, comme toi.

20 minutes dans les prochaines semaines pour en discuter ?

À bientôt,
Liyang`,
  formal: `Chère Anna,

Je me permets de vous écrire suite à la découverte de votre parcours. Votre transition de Bain vers Parloa fait écho à celle que je prépare actuellement vers les produits d'intelligence artificielle, et notre passage commun par INSEAD Fontainebleau me semble un point de départ naturel pour un échange.

Auriez-vous 20 à 30 minutes dans les prochaines semaines pour évoquer votre expérience chez Parloa et les enseignements tirés de votre pivot ?

Bien cordialement,
Liyang Guo`,
  ask: `Bonjour Anna,

Ravi de découvrir ton parcours. Ton passage de Bain à Parloa résonne avec la transition que je vise vers les produits IA, et notre passage commun par INSEAD 22D rend cet échange naturel.

Concrètement, j'aimerais comprendre comment tu as construit ton premier mois chez Parloa, et si tu vois des rôles produit ouverts dans ton équipe. Une discussion de 20 minutes la semaine prochaine te conviendrait-elle ?

À bientôt,
Liyang`,
  paris: `Bonjour Anna,

Ravi de découvrir ton parcours. Ton passage de Bain à Parloa résonne avec la transition que je vise vers les produits IA, et notre passage commun par INSEAD 22D rend cet échange naturel.

Je suis basé à Paris et libre cette semaine, aurais-tu 30 minutes pour un échange ?

À bientôt,
Liyang`,
};

const PIPELINE = {
  pendingDrafts: 3, // Pick-up where you left off
  newLeads: 12,
};

// ============================================================================
// "Story so far", AI-written relationship narrative shown on Contact Detail.
// Each entry is an array of paragraphs in the user's voice (you/your).
// updatedAt is shown subtly to signal freshness.
// ============================================================================
const STORIES = {
  mathieu: {
    goal: 'AI PM internship at Parloa for summer 2027',
    paragraphs: [
      "Mathieu is the most senior strategy person in Parloa's Paris office. You're targeting an AI PM internship there for summer 2027.",
      "You saved him 7 days ago from Discover, after spotting his post about hiring AI PMs in Paris. You sent a connection note 3 days ago opening on the INSEAD overlap. No reply yet.",
      "You haven't met him yet. Your first conversation is scheduled for Tuesday at 18:00."
    ],
    updatedAt: 'Updated 1 hour ago, after your draft was sent'
  },
  yuxuan: {
    goal: 'Build a VC network in Paris; explore investor-side roles',
    paragraphs: [
      "Yuxuan is an investment associate at Iris Capital and your most relevant VC contact in Paris. You met her two weeks ago over a 30-minute Zoom intro.",
      "She walked you through her Bain → Iris transition and offered her honest read: your strategy background reads strong, but you need one or two concrete AI-side projects to be credible for product roles at portfolio companies.",
      "Open thread: she said she'd ping you when one of her portfolio companies opens an AI PM role. Loop back in three weeks if nothing has surfaced by then."
    ],
    updatedAt: 'Updated 4 days ago, after your meeting'
  },
  paul: {
    goal: 'Route into growth equity and the consulting-to-PE crowd',
    paragraphs: [
      "Paul is a senior associate at Eurazeo, focused on growth equity in tech. You're using him as a route into the PE-to-Tech transition crowd.",
      "You exchanged messages 22 days ago, he responded warmly to your outreach and asked for a call when you're free in Paris. You haven't replied.",
      "Open thread: this is your move. A short \"circling back, here's a 30-min window next week\" note will land well. Don't let it slip further."
    ],
    updatedAt: 'Updated yesterday'
  },
  anna: {
    goal: 'Understand the Bain → AI startup pivot from someone who just made it',
    paragraphs: [
      "Anna made the exact pivot you're planning, Bain to Parloa, four years in consulting then straight into a senior PM role on the conversational AI side.",
      "You found her in Discover this morning. Your coach drafted a connection note in French. You haven't sent it yet."
    ],
    updatedAt: 'Just now'
  }
};

// ============================================================================
// Scheduled meetings, populated for contacts who already have something booked
// ============================================================================
const SCHEDULED_MEETINGS = {
  mathieu: {
    label: 'Tuesday at 18:00',
    datetime: '2026-06-02T18:00',
    duration: '30 min',
    type: 'Coffee chat',
    location: 'Café Verlet, 1er arr.'
  }
};

// ============================================================================
// Meeting Prep artifact, seed content per contact. Generated by the coach
// from the intake form; the artifact persists on the contact's timeline.
// ============================================================================
const MEETING_PREPS = {
  mathieu: {
    id: 'prep-mathieu-2026-05-29',
    contactId: 'mathieu',
    createdAt: '2026-05-29',
    purpose: 'First intro or coffee chat',
    duration: '30 min',
    goal: "Understand Parloa's product roadmap and explore if there's a fit for an AI PM internship for summer 2027.",
    focus: '',
    snapshot: {
      personLines: [
        'Mathieu Lefèvre, Head of Strategy at Parloa, Paris.',
        'INSEAD 24J. Ex-McKinsey strategy, joined Parloa Nov 2024.'
      ],
      companyLines: [
        'Parloa builds an enterprise voice AI platform for contact centers.',
        'Raised €60m Series B (March 2026), led by Altimeter Capital.',
        'Customers include Decathlon, Allianz, and ENGIE. Paris office is expanding fast (hiring AI PMs publicly as of April 2026).'
      ],
      whyMatters: "Mathieu is the most senior strategy person in Paris and has posted publicly about hiring AI PMs. INSEAD overlap makes this a peer conversation, not a candidate one.",
      dontDo: "Don't lead with \"looking for an internship\". He flagged on LinkedIn that cold pitches are the fastest way to lose his attention."
    },
    person: {
      journey: "Tongji → McKinsey Paris (3 years, healthcare practice) → INSEAD MBA (24J) → Parloa, Head of Strategy. Through-line: strategy work with a bias toward operationally involved roles. He picked Parloa over a return to McKinsey.",
      mutuals: [
        { name: 'Anna Schmidt', detail: 'Parloa PM, your existing contact, direct connection' },
        { name: 'Yuxuan Chen', detail: "Iris Capital, second-degree through Mathieu's PE network" }
      ],
      sharedLinks: [
        'Both INSEAD MBAs (24J / 26J)',
        'Both based in Paris',
        'Both did INSEAD AI Club at some point'
      ],
      angle: "Position as a peer who's been in strategy and is now exploring AI product roles, not as an internship-seeker. Lead with curiosity about his transition, not your job search."
    },
    agenda: {
      blocks: [
        { range: '0 – 5 min', title: 'Warm-up', body: 'Open with the INSEAD overlap. Ask one question about his McKinsey-to-Parloa jump. Let him talk.' },
        { range: '5 – 20 min', title: 'Core, Parloa strategy and AI PM role', body: 'Drill into product roadmap, how strategy is structured, what AI PMs actually do day to day.' },
        { range: '20 – 27 min', title: 'Profile fit', body: "Share your background briefly when he asks. Ask his honest read on where you'd be a fit." },
        { range: '27 – 30 min', title: 'Close', body: 'Confirm next step. Thank him. Note any intros he offered.' }
      ],
      tone: "Peer-to-peer. Not interview. Not pitch. Use first names. Lean into shared INSEAD context naturally, don't force it."
    },
    questions: {
      phases: [
        {
          id: 'warmup',
          name: 'Warm-up',
          minutes: 'first 5 min',
          items: [
            {
              id: 'q0',
              text: "Saw you also did INSEAD 24J. What made you jump to Parloa right out instead of going back to McKinsey?",
              why: "Tests whether he's evangelical or rational about Parloa. His answer signals how to position yourself.",
              hint: 'What did he say about the McKinsey vs Parloa decision'
            }
          ]
        },
        {
          id: 'core',
          name: 'Core',
          minutes: 'middle 15 min',
          items: [
            {
              id: 'q1',
              text: "I always find PM job descriptions abstract. What does a typical week actually look like for a PM at Parloa?",
              why: 'Concrete picture beats abstract job description. Listen for ratio of strategy / product / execution work.',
              hint: 'Typical week, in his words'
            },
            {
              id: 'q2',
              text: "Is it more product framing, or are you in the weeds on prompts, evals, model choices?",
              why: 'How technical is the role? Signals whether you need ML reps or product reps more.',
              hint: 'Product vs technical depth'
            },
            {
              id: 'q3',
              text: "What's changed about the strategy function since the Series B?",
              why: 'Series B usually reshuffles strategy. His answer reveals if there is chaos or clarity right now.',
              hint: 'What changed post Series B'
            },
            {
              id: 'q4',
              text: "The line between PM, AI/ML, and ops can look different at every AI company. How is it drawn at Parloa?",
              why: 'Org design tells you who actually has decision power on the AI side.',
              hint: 'Where PM ends and AI/ML begins'
            }
          ]
        },
        {
          id: 'fit',
          name: 'Profile fit',
          minutes: 'last 7 min',
          items: [
            {
              id: 'q5',
              text: "From what you've heard about my background, where would you bet on me? Where wouldn't you?",
              why: "Forces him to commit a view. Better than 'what do you think of my profile' which gets polite hedges.",
              hint: 'His honest read on where you fit'
            },
            {
              id: 'q6',
              text: "If you were me, what would you target this summer?",
              why: 'Asks for his summer playbook, not his blessing. Bonus: opens door to specific intros.',
              hint: 'His playbook for your summer'
            }
          ]
        }
      ]
    }
  }
};

window.SEED = { USER, CONTACTS, DRAFTS_FOR_ANNA, PIPELINE, STORIES, MEETING_PREPS, SCHEDULED_MEETINGS };
