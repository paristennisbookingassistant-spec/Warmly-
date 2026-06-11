// Discover, two doors (INSEAD Directory + LinkedIn Network)
//
// State machine:
//   doors            ─▶  cv-tinder
//                     ▶  linkedin-setup ─▶ linkedin-tinder
//                     ▶  linkedin-tinder  (if already connected)

// ---------- Channel palette ----------
const CH = {
  cv: {
    label: 'INSEAD Directory',
    short: 'CV books',
    accent: '#b87a4a',
    soft: '#f3e2cd',
    ink: '#7a4a25',
    tint: 'rgba(184,122,74,0.10)',
    brand: '#006438', // INSEAD green, only used in brand surfaces
  },
  linkedin: {
    label: 'LinkedIn Network',
    short: 'Peer network',
    accent: '#4a6f87',
    soft: '#dde6ee',
    ink: '#2f4d63',
    tint: 'rgba(74,111,135,0.10)',
    brand: '#0A66C2', // LinkedIn blue, only used in brand surfaces
  },
};

// ---------- Discovery deck ----------
const DISCOVERY_DECK = {
  cv: [
    {
      id: 'cv-anna',
      name: 'Anna Schmidt', first: 'Anna',
      role: 'Senior Product Manager', company: 'Parloa', location: 'Berlin',
      insead: 'MBA 22D', inseadShort: '22D', tier: 'Strong',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-anna',
      linkedinUrl: 'https://www.linkedin.com/in/anna-schmidt-parloa',
      rationale: 'Anna made the same Bain → AI startup pivot you are sketching, came out of your 22D Fontainebleau class, and now leads the conversational AI product line at Parloa, one of your top three target companies.',
      short: 'Same Bain → AI pivot. Direct overlap with your target.',
      about: [ 'Senior PM at Parloa, 2 yrs', 'Bain & Co, 4 yrs', 'INSEAD MBA 2022, Fontainebleau' ],
    },
    {
      id: 'cv-liu',
      name: 'Liu Wei', first: 'Liu',
      role: 'Product Manager', company: 'Anthropic', location: 'Paris',
      insead: 'MBA 24D', inseadShort: '24D', tier: 'Strong',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-liu',
      linkedinUrl: 'https://www.linkedin.com/in/liu-wei-anthropic',
      rationale: 'Liu joined the Anthropic Paris team last quarter, exact match for your target role, target city, and target company. Chinese background, similar visa journey, came from McKinsey Greater China.',
      short: 'Anthropic Paris, Chinese background, similar visa path.',
      about: [ 'PM at Anthropic, 7 mo', 'McKinsey & Co, 4 yrs', 'INSEAD MBA 2024, Singapore' ],
    },
    {
      id: 'cv-camille',
      name: 'Camille Dubois', first: 'Camille',
      role: 'Lead Product Manager', company: 'Mistral AI', location: 'Paris',
      insead: 'MBA 21D', inseadShort: '21D', tier: 'Strong',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-camille',
      linkedinUrl: 'https://www.linkedin.com/in/camille-dubois-mistral',
      rationale: 'Lead PM at Mistral, ex-McKinsey, Paris-based. She runs hiring for her squad and her team is one of the few hiring sponsorship-eligible PMs this fall.',
      short: 'Mistral PM lead, hires sponsorship-eligible PMs.',
      about: [ 'Lead PM at Mistral AI, 1.5 yrs', 'McKinsey, 5 yrs', 'INSEAD MBA 2021, Fontainebleau' ],
    },
    {
      id: 'cv-tomas',
      name: 'Tomás Reyes', first: 'Tomás',
      role: 'Senior Product Manager', company: 'Hugging Face', location: 'Paris',
      insead: 'MBA 23D', inseadShort: '23D', tier: 'Good',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-tomas',
      linkedinUrl: 'https://www.linkedin.com/in/tomas-reyes-hf',
      rationale: 'Open-source PM at Hugging Face, wide network across the Paris AI scene. Less of a direct match for the role, but a high-leverage connector if you want introductions to Mistral and Anthropic teams.',
      short: 'Connector across the Paris AI ecosystem.',
      about: [ 'Sr PM at Hugging Face, 2 yrs', 'Stripe, 3 yrs', 'INSEAD MBA 2023, Fontainebleau' ],
    },
    {
      id: 'cv-aiko',
      name: 'Aiko Tanaka', first: 'Aiko',
      role: 'Product Director', company: 'Aleph Alpha', location: 'Berlin',
      insead: 'MBA 20D', inseadShort: '20D', tier: 'Good',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-aiko',
      linkedinUrl: 'https://www.linkedin.com/in/aiko-tanaka-aa',
      rationale: 'Director-level at Aleph Alpha in Berlin. Non-EU background, sponsorship-friendly, and her hiring philosophy explicitly favours INSEAD alumni, she has hired 2 from your class already.',
      short: 'Director, non-EU, has hired from your class.',
      about: [ 'Product Director at Aleph Alpha, 2 yrs', 'Zalando, 4 yrs', 'INSEAD MBA 2020, Fontainebleau' ],
    },
  ],
  linkedin: [
    {
      id: 'li-lukas',
      name: 'Lukas Becker', first: 'Lukas',
      role: 'Product Manager', company: 'Cohere', location: 'Berlin',
      insead: 'MBA 25J', inseadShort: '25J', tier: 'Strong',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-lukas',
      linkedinUrl: 'https://www.linkedin.com/in/lukas-becker-cohere',
      via: { id: 'anna', name: 'Anna Schmidt', short: 'Anna', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-1', degree: '2nd', mutualCount: 11 },
      rationale: 'Anna and Lukas worked together at Bain Berlin before Lukas pivoted to Cohere as PM. Anna is currently active on his posts, a warm intro through her would be unusually strong.',
      short: 'Anna\u2019s former Bain colleague, now PM at Cohere.',
      about: [ 'PM at Cohere, 1 yr', 'Bain Berlin, 3 yrs', 'INSEAD MBA 2025, Fontainebleau' ],
    },
    {
      id: 'li-sara',
      name: 'Sara El-Amin', first: 'Sara',
      role: 'Head of Go-to-Market', company: 'Synthesia', location: 'London',
      insead: 'MBA 23D', inseadShort: '23D', tier: 'Good',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-sara',
      linkedinUrl: 'https://www.linkedin.com/in/sara-el-amin-synthesia',
      via: { id: 'mathieu', name: 'Mathieu Lefèvre', short: 'Mathieu', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-2', degree: '2nd', mutualCount: 7 },
      rationale: 'Mathieu and Sara overlapped at BCG. She runs GTM at Synthesia and has been writing publicly about AI PM hiring, a softer angle than a cold pitch but a strong domain match.',
      short: 'Head of GTM at Synthesia, Mathieu\u2019s BCG peer.',
      about: [ 'Head of GTM at Synthesia, 2 yrs', 'BCG, 4 yrs', 'INSEAD MBA 2023, Fontainebleau' ],
    },
    {
      id: 'li-pedro',
      name: 'Pedro Almeida', first: 'Pedro',
      role: 'Partner', company: 'Heartcore Capital', location: 'Paris',
      insead: 'MBA 19D', inseadShort: '19D', tier: 'Good',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-pedro',
      linkedinUrl: 'https://www.linkedin.com/in/pedro-almeida-heartcore',
      via: { id: 'yuxuan', name: 'Yuxuan Chen', short: 'Yuxuan', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-3', degree: '2nd', mutualCount: 4 },
      rationale: 'Yuxuan has co-invested with Pedro on two deals. He runs the AI thesis at Heartcore, useful for both the VC angle and for warm intros into his portfolio AI companies.',
      short: 'Paris AI VC. Yuxuan co-invests with him.',
      about: [ 'Partner at Heartcore, 4 yrs', 'Index Ventures, 3 yrs', 'INSEAD MBA 2019, Fontainebleau' ],
    },
    {
      id: 'li-mariam',
      name: 'Mariam Rashid', first: 'Mariam',
      role: 'Senior Product Manager', company: 'OpenAI', location: 'London / Paris',
      insead: 'MBA 22J', inseadShort: '22J', tier: 'Strong',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-mariam',
      linkedinUrl: 'https://www.linkedin.com/in/mariam-rashid-openai',
      via: { id: 'anna', name: 'Anna Schmidt', short: 'Anna', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-1', degree: '2nd', mutualCount: 9 },
      rationale: 'Mariam is at OpenAI and splits time between London and Paris. Anna knows her from the Bain alumni circle. OpenAI is opening a Paris hub, she will know who is hiring.',
      short: 'OpenAI PM, splits time Paris/London.',
      about: [ 'Sr PM at OpenAI, 1.5 yrs', 'Bain & Co, 3 yrs', 'INSEAD MBA 2022, Singapore' ],
    },
    {
      id: 'li-hiroshi',
      name: 'Hiroshi Yamada', first: 'Hiroshi',
      role: 'Co-founder', company: 'Stealth AI', location: 'Berlin',
      insead: 'MBA 21J', inseadShort: '21J', tier: 'Adjacent',
      avatar: 'https://i.pravatar.cc/240?u=warmly-deck-hiroshi',
      linkedinUrl: 'https://www.linkedin.com/in/hiroshi-yamada-stealth',
      via: { id: 'mathieu', name: 'Mathieu Lefèvre', short: 'Mathieu', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-2', degree: '2nd', mutualCount: 3 },
      rationale: 'Founding team of an unannounced AI company in Berlin. Mathieu knew him at Parloa, useful as an exploratory chat if you want an early-stage option, less of a direct role match.',
      short: 'Stealth AI founder, early-stage option.',
      about: [ 'Co-founder, Stealth AI, 6 mo', 'Parloa (founding PM), 2 yrs', 'INSEAD MBA 2021, Singapore' ],
    },
  ],
};

// Synced peers list (those who installed the Warmly LinkedIn extension)
const SYNCED_PEERS = [
  { id: 'anna',    name: 'Anna Schmidt',    short: 'Anna',    avatar: 'https://i.pravatar.cc/200?u=warmly-seed-1' },
  { id: 'mathieu', name: 'Mathieu Lefèvre', short: 'Mathieu', avatar: 'https://i.pravatar.cc/200?u=warmly-seed-2' },
  { id: 'yuxuan',  name: 'Yuxuan Chen',     short: 'Yuxuan',  avatar: 'https://i.pravatar.cc/200?u=warmly-seed-3' },
];

window.DiscoverShared = { CH, DISCOVERY_DECK, SYNCED_PEERS };

// ============================================================================

function DiscoverScreen({ user, linkedInConnected, onConnectLinkedIn, onSaveLead, onOpenContact }) {
  const [view, setView] = useState('doors'); // doors | cv-tinder | linkedin-setup | linkedin-tinder

  const openCV = () => setView('cv-tinder');
  const openLinkedIn = () => setView(linkedInConnected ? 'linkedin-tinder' : 'linkedin-setup');
  const onSetupDone = () => { onConnectLinkedIn && onConnectLinkedIn(); setView('linkedin-tinder'); };
  const backToDoors = () => setView('doors');

  // TinderView lays itself out full-width with a flush right sidebar, no
  // outer container constraints.
  if (view === 'cv-tinder' || view === 'linkedin-tinder') {
    return (
      <TinderView
        channel={view === 'cv-tinder' ? 'cv' : 'linkedin'}
        user={user}
        deck={view === 'cv-tinder' ? DISCOVERY_DECK.cv : DISCOVERY_DECK.linkedin}
        onBack={backToDoors}
        onSaveLead={onSaveLead}
        onOpenContact={onOpenContact}
      />
    );
  }

  return (
    <div className="px-10 pt-7 pb-6 max-w-[1280px] mx-auto flex-1 flex flex-col w-full">
      {view === 'doors' && (
        <DoorsView
          user={user}
          linkedInConnected={linkedInConnected}
          onOpenCV={openCV}
          onOpenLinkedIn={openLinkedIn}
        />
      )}
      {view === 'linkedin-setup' && (
        <LinkedInSetup
          user={user}
          onDone={onSetupDone}
          onBack={backToDoors}
        />
      )}
    </div>
  );
}

// ============================================================================
// Doors view, fills viewport, hero-style, brand-led
// ============================================================================

function DoorsView({ user, linkedInConnected, onOpenCV, onOpenLinkedIn }) {
  return (
    <div className="fade-up flex flex-col flex-1 min-h-0">
      {/* Compact header, one row */}
      <div className="flex items-end justify-between gap-6 mb-5 flex-shrink-0 flex-wrap">
        <div className="max-w-[640px]">
          <div className="font-mono-tag text-ink-3 mb-1.5">Discover</div>
          <h1 className="text-[28px] leading-[1.1] font-serif-i text-ink">Two channels to find your next warm intro.</h1>
          <p className="text-[13.5px] text-ink-3 leading-relaxed mt-1.5">
            Pick a door. Your coach pushes profiles one at a time, save or skip, and chat to refine.
          </p>
        </div>
        <div className="text-[12px] text-ink-4 text-right">
          <div className="font-mono-tag text-ink-4 mb-1" style={{ fontSize: 9.5 }}>Your scope</div>
          <div className="text-ink-2 text-[12.5px]">
            <span className="font-medium">{user.target.role}</span> · <span className="font-medium">{user.target.industry}</span>
          </div>
          <div className="text-ink-3 text-[12px]">{user.target.geography.join(' / ')} <button className="ml-1 text-sienna-ink hover:underline">edit</button></div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0">
        <CVDoor
          queueCount={DISCOVERY_DECK.cv.length}
          onClick={onOpenCV}
        />
        <LinkedInDoor
          queueCount={DISCOVERY_DECK.linkedin.length}
          connected={linkedInConnected}
          onClick={onOpenLinkedIn}
          peers={SYNCED_PEERS}
        />
      </div>
    </div>
  );
}

// ---------- INSEAD Door ----------
function CVDoor({ queueCount, onClick }) {
  const c = CH.cv;
  return (
    <DoorShell channel="cv" onClick={onClick}>
      {/* Hero band */}
      <DoorHero channel="cv">
        <BrandRow channel="cv">
          <img src="assets/insead-logo.png" alt="INSEAD" className="h-10 w-auto object-contain object-left" />
          <DoorStatus ok text="Connected · refreshed 2h ago" />
        </BrandRow>
        <div className="font-mono-tag mt-5" style={{ color: c.accent }}>Door 1 · Primary channel</div>
        <h2 className="text-[28px] font-serif-i text-ink leading-[1.05] mt-1.5 mb-2">INSEAD Directory</h2>
        <p className="text-[13.5px] text-ink-2 leading-relaxed" style={{ maxWidth: 360 }}>
          Vetted alumni indexed straight from the official MBA &amp; MIM CV books, every match confirmed by class, employer and graduation year.
        </p>
      </DoorHero>

      {/* Visual band, directory grid preview */}
      <DoorVisualBand channel="cv">
        <DirectoryPreview />
      </DoorVisualBand>

      {/* Footer band */}
      <DoorFooter
        channel="cv"
        bigNumber={queueCount}
        bigLabel="alumni in your queue"
        meta={[
          { label: 'Source',    value: 'INSEAD MBA + MIM CV books' },
          { label: 'Indexed',   value: '12,400 alumni globally' },
          { label: 'Refreshed', value: '2 hours ago' },
        ]}
        cta="Open INSEAD Directory"
      />
    </DoorShell>
  );
}

// ---------- LinkedIn Door ----------
function LinkedInDoor({ queueCount, connected, onClick, peers }) {
  const c = CH.linkedin;
  return (
    <DoorShell channel="linkedin" onClick={onClick}>
      <DoorHero channel="linkedin">
        <BrandRow channel="linkedin">
          <img src="assets/linkedin-logo.png" alt="LinkedIn" className="h-7 w-auto object-contain object-left" />
          {connected
            ? <DoorStatus ok text="Connected · refreshed just now" />
            : <DoorStatus text="Setup required" />}
        </BrandRow>
        <div className="font-mono-tag mt-5" style={{ color: c.accent }}>Door 2 · Network channel</div>
        <h2 className="text-[28px] font-serif-i text-ink leading-[1.05] mt-1.5 mb-2">LinkedIn Network</h2>
        <p className="text-[13.5px] text-ink-2 leading-relaxed" style={{ maxWidth: 360 }}>
          2nd-degree intros discovered in the LinkedIn networks of classmates who&apos;ve synced their connections via the Warmly Chrome extension.
        </p>
      </DoorHero>

      <DoorVisualBand channel="linkedin">
        <NetworkPreview peers={peers} />
      </DoorVisualBand>

      <DoorFooter
        channel="linkedin"
        bigNumber={connected ? queueCount : peers.length}
        bigLabel={connected ? '2nd-degree leads queued' : 'peers ready to sync'}
        meta={[
          { label: 'Source',    value: 'Warmly Chrome extension' },
          { label: 'Peers',     value: `${peers.length} of your class synced` },
          { label: 'Refreshed', value: connected ? 'Just now' : 'Awaiting setup' },
        ]}
        cta={connected ? 'Open LinkedIn Network' : 'Set up LinkedIn channel'}
      />
    </DoorShell>
  );
}

// ---------- Door shell + parts ----------
function DoorShell({ channel, onClick, children }) {
  const c = CH[channel];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-3xl transition-all duration-200 relative overflow-hidden flex flex-col bg-white h-full"
      style={{
        border: `1px solid #e5d8be`,
        boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.boxShadow = `0 0 0 1px ${c.accent} inset, 0 18px 44px ${c.tint}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5d8be'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)'; }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: c.accent }} />
      {children}
    </button>
  );
}

function DoorHero({ channel, children }) {
  return (
    <div className="px-7 pt-7 pb-5 flex-shrink-0">
      {children}
    </div>
  );
}

function BrandRow({ channel, children }) {
  return (
    <div className="flex items-center justify-between h-12">
      {children}
    </div>
  );
}

function DoorStatus({ ok, text }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 h-[24px] rounded-full"
      style={{ background: ok ? '#dcebd9' : '#ece2d0', color: ok ? '#34553e' : '#6b5e4a' }}
    >
      <span className="dot" style={{ background: ok ? '#5e8d6a' : '#8e8170' }} />
      {text}
    </span>
  );
}

function DoorVisualBand({ channel, children }) {
  const c = CH[channel];
  return (
    <div
      className="flex-1 flex items-center justify-center px-7 py-4 border-y relative overflow-hidden min-h-0"
      style={{
        background: channel === 'cv' ? '#fbf5ea' : '#f1f5f9',
        borderColor: '#ece2d0',
      }}
    >
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: channel === 'cv'
            ? 'radial-gradient(circle at 1px 1px, rgba(184,122,74,0.15) 1px, transparent 0)'
            : 'radial-gradient(circle at 1px 1px, rgba(74,111,135,0.18) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function DoorFooter({ channel, bigNumber, bigLabel, meta, cta }) {
  const c = CH[channel];
  return (
    <div className="px-7 pt-5 pb-6 flex-shrink-0">
      {/* Big number */}
      <div className="flex items-baseline gap-3 mb-3">
        <div className="font-serif-i leading-none" style={{ fontSize: 44, color: c.ink }}>{bigNumber}</div>
        <div className="text-[13px] text-ink-3">{bigLabel}</div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-col gap-1 mb-4">
        {meta.map(m => (
          <div key={m.label} className="flex items-baseline gap-3 text-[12px]">
            <span className="font-mono-tag text-ink-4 w-[72px] flex-shrink-0" style={{ fontSize: 9 }}>{m.label}</span>
            <span className="text-ink-2">{m.value}</span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between px-4 h-11 rounded-xl transition-all group-hover:scale-[1.01]"
        style={{ background: c.accent, color: '#ffffff' }}
      >
        <span className="text-[13.5px] font-medium">{cta}</span>
        <Icon.ArrowRight size={15} />
      </div>
    </div>
  );
}

// ---------- Directory preview (INSEAD) ----------
function DirectoryPreview() {
  const samples = [
    { name: 'Anna Schmidt',    role: 'Sr PM · Parloa',       insead: 'MBA 22D', tier: 'Strong', avatar: 'https://i.pravatar.cc/120?u=warmly-deck-anna' },
    { name: 'Liu Wei',         role: 'PM · Anthropic',       insead: 'MBA 24D', tier: 'Strong', avatar: 'https://i.pravatar.cc/120?u=warmly-deck-liu' },
    { name: 'Camille Dubois',  role: 'Lead PM · Mistral',    insead: 'MBA 21D', tier: 'Strong', avatar: 'https://i.pravatar.cc/120?u=warmly-deck-camille' },
    { name: 'Tomás Reyes',     role: 'Sr PM · Hugging Face', insead: 'MBA 23D', tier: 'Good',   avatar: 'https://i.pravatar.cc/120?u=warmly-deck-tomas' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 max-w-[380px]">
      {samples.map((s, i) => (
        <div
          key={s.name}
          className="bg-white border rounded-xl p-3 flex items-center gap-2.5"
          style={{
            borderColor: '#e5d8be',
            boxShadow: '0 1px 0 rgba(31,27,22,0.03), 0 2px 8px rgba(31,27,22,0.04)',
            transform: i === 0 ? 'rotate(-1.5deg)' : i === 1 ? 'rotate(1deg)' : i === 2 ? 'rotate(1deg)' : 'rotate(-0.5deg)',
          }}
        >
          <img src={s.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold text-ink leading-tight truncate">{s.name}</div>
            <div className="text-[10px] text-ink-3 mt-0.5 truncate">{s.role}</div>
            <div className="mt-1 inline-flex items-center px-1.5 h-[14px] rounded-full text-[9px] font-medium"
                 style={{ background: '#f3e2cd', color: '#7a4a25', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em' }}>
              {s.insead}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Network preview (LinkedIn) ----------
function NetworkPreview({ peers }) {
  // 360 × 280 canvas. Center user, 3 peers arranged in a triangle,
  // each peer trailing 3 small 2nd-degree dots.
  const W = 360, H = 280;
  const cx = W / 2, cy = H / 2;
  const peerR = 110;
  const peerPositions = [
    { x: cx - peerR * 0.92, y: cy - peerR * 0.50 }, // top-left
    { x: cx + peerR * 0.92, y: cy - peerR * 0.50 }, // top-right
    { x: cx,                y: cy + peerR * 0.95 }, // bottom-center
  ];
  // 2nd-degree dots, 3 per peer, scattered outward
  const secondDegree = peerPositions.map((p, i) => {
    const angle = Math.atan2(p.y - cy, p.x - cx);
    return [
      { x: p.x + Math.cos(angle) * 50 - 10, y: p.y + Math.sin(angle) * 50 - 18 },
      { x: p.x + Math.cos(angle) * 60,      y: p.y + Math.sin(angle) * 60 + 10 },
      { x: p.x + Math.cos(angle) * 45 + 18, y: p.y + Math.sin(angle) * 45 + 24 },
    ];
  });

  return (
    <div className="relative" style={{ width: W, height: H }}>
      {/* Lines layer */}
      <svg width={W} height={H} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        {/* User → peers */}
        {peerPositions.map((p, i) => (
          <line key={`up-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#4a6f87" strokeWidth={1.5} opacity={0.55} strokeLinecap="round" />
        ))}
        {/* Peers → 2nd-degree */}
        {peerPositions.map((p, i) => (
          secondDegree[i].map((s, j) => (
            <line key={`sd-${i}-${j}`} x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke="#4a6f87" strokeWidth={1} opacity={0.25} strokeLinecap="round" />
          ))
        ))}
        {/* 2nd-degree dots */}
        {secondDegree.flat().map((s, i) => (
          <circle key={`s-${i}`} cx={s.x} cy={s.y} r={4.5} fill="#4a6f87" opacity={0.45} />
        ))}
      </svg>

      {/* Peer avatars */}
      {peerPositions.map((p, i) => (
        <div
          key={`peer-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: p.x - 22, top: p.y - 22, width: 44, height: 44,
            boxShadow: '0 4px 14px rgba(74,111,135,0.25), 0 0 0 2px #ffffff',
            border: '2px solid #4a6f87',
          }}
        >
          <img src={peers[i]?.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          <div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-ink-2 font-medium whitespace-nowrap"
          >
            {peers[i]?.short}
          </div>
        </div>
      ))}

      {/* Center user */}
      <div
        className="absolute rounded-full"
        style={{
          left: cx - 30, top: cy - 30, width: 60, height: 60,
          boxShadow: '0 6px 18px rgba(31,27,22,0.18), 0 0 0 3px #ffffff',
          border: '2px solid #1f1b16',
          background: '#ffffff',
        }}
      >
        <img src="https://i.pravatar.cc/120?u=warmly-user-liyang" alt="" className="w-full h-full rounded-full object-cover" />
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-ink font-semibold whitespace-nowrap"
        >
          You
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LinkedIn setup, checklist + scope
// ============================================================================

function LinkedInSetup({ user, onDone, onBack }) {
  const { Btn } = Shared;
  const [extInstalled, setExtInstalled] = useState(false);
  const [liSignedIn, setLiSignedIn] = useState(false);
  const [scopeRoles, setScopeRoles] = useState([user.target.role]);
  const [scopeCompanies, setScopeCompanies] = useState([...user.target.companies]);
  const [scopeGeos, setScopeGeos] = useState([...user.target.geography]);

  const scopeReady = scopeRoles.length > 0 && scopeGeos.length > 0;
  const allDone = extInstalled && liSignedIn && scopeReady;

  return (
    <div className="fade-up max-w-[760px] mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7">
        <Icon.ArrowLeft size={14} />
        Back to doors
      </button>

      <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono-tag mb-2" style={{ color: CH.linkedin.accent }}>Door 2 · Setup</div>
          <h1 className="text-[32px] leading-[1.1] font-serif-i text-ink mb-2">Connect the LinkedIn channel.</h1>
          <p className="text-[14.5px] text-ink-3 leading-relaxed max-w-[540px]">
            Three quick steps. After this, the coach will surface 2nd-degree intros from your synced peers&apos; networks.
          </p>
        </div>
        <img src="assets/linkedin-logo.png" alt="LinkedIn" className="h-8 w-auto object-contain" />
      </div>

      <div className="flex flex-col gap-4">
        <SetupStep
          n={1}
          done={extInstalled}
          title="Install the Warmly Chrome extension"
          body="The extension reads your visible LinkedIn graph locally, nothing leaves your browser until you save a contact."
          action={extInstalled
            ? <DoneTag text="Installed" />
            : <Btn size="sm" onClick={() => setExtInstalled(true)} icon={Icon.Plus}>Add to Chrome</Btn>}
        />
        <SetupStep
          n={2}
          done={liSignedIn}
          locked={!extInstalled}
          title="Connect your LinkedIn"
          body={liSignedIn
            ? `Connected as ${user.fullName}. Warmly is syncing your LinkedIn contacts; your session stays local and no credentials are stored.`
            : 'Sign in and connect your LinkedIn so Warmly can sync your contacts and surface 2nd-degree intros. Your session is read locally.'}
          action={liSignedIn
            ? <DoneTag text="Connected" />
            : <Btn size="sm" variant="secondary" disabled={!extInstalled} onClick={() => setLiSignedIn(true)} icon={Icon.Link}>Connect LinkedIn</Btn>}
        />
        <SetupStep
          n={3}
          done={scopeReady && extInstalled && liSignedIn}
          locked={!liSignedIn}
          title="Confirm the discovery scope"
          body="Defaults pulled from your Warmly profile. Edit if you want a tighter or looser net."
        >
          <div className="flex flex-col gap-4 mt-3">
            <ScopeRow label="Roles" chips={scopeRoles} setChips={setScopeRoles} placeholder="+ Add role" />
            <ScopeRow label="Companies" chips={scopeCompanies} setChips={setScopeCompanies} placeholder="+ Add company" />
            <ScopeRow label="Geography" chips={scopeGeos} setChips={setScopeGeos} placeholder="+ Add city / country" />
            <div className="text-[11.5px] text-ink-4 italic">Tip: leave a field empty to widen the search across all values.</div>
          </div>
        </SetupStep>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-[12.5px] text-ink-3">
          {allDone ? 'Ready to start.' : 'Complete all 3 steps to start discovery.'}
        </div>
        <Btn
          size="lg"
          disabled={!allDone}
          onClick={onDone}
          iconRight={Icon.ArrowRight}
        >
          Start discovery
        </Btn>
      </div>
    </div>
  );
}

function SetupStep({ n, done, locked, title, body, action, children }) {
  return (
    <div
      className="rounded-2xl border p-5 transition-opacity"
      style={{
        background: '#ffffff',
        borderColor: done ? CH.linkedin.accent : '#e5d8be',
        opacity: locked ? 0.55 : 1,
        boxShadow: done ? `0 0 0 1px ${CH.linkedin.accent} inset` : 'none',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold"
          style={{
            background: done ? CH.linkedin.accent : CH.linkedin.soft,
            color: done ? '#ffffff' : CH.linkedin.ink,
          }}
        >
          {done ? <Icon.Check size={14} /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14.5px] font-semibold text-ink leading-tight">{title}</div>
            {action}
          </div>
          {body && <div className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">{body}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

function DoneTag({ text }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 h-[24px] rounded-full text-[11.5px] font-medium" style={{ background: '#dcebd9', color: '#34553e' }}>
      <Icon.Check size={11} />
      {text}
    </span>
  );
}

function ScopeRow({ label, chips, setChips, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const commit = () => {
    const v = val.trim();
    if (v && !chips.includes(v)) setChips([...chips, v]);
    setVal(''); setAdding(false);
  };
  return (
    <div>
      <div className="font-mono-tag text-ink-4 mb-2" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map(c => (
          <Shared.Chip key={c} variant="selected" removable onRemove={() => setChips(chips.filter(x => x !== c))}>{c}</Shared.Chip>
        ))}
        {adding ? (
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(''); setAdding(false); } }}
            placeholder={placeholder}
            className="h-8 px-3 rounded-full text-[12.5px] border bg-white focus-ring outline-none"
            style={{ borderColor: '#d9cdb4', minWidth: 140 }}
          />
        ) : (
          <button onClick={() => setAdding(true)}>
            <Shared.Chip variant="add">{placeholder}</Shared.Chip>
          </button>
        )}
      </div>
    </div>
  );
}

window.DiscoverScreen = DiscoverScreen;
