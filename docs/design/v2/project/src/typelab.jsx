// Type Lab — 10 font directions on real Warmly content
const TYPE_OPTIONS = [
  {
    key: "editorial",
    name: "Instrument Serif",
    pair: ["Display", "Instrument Serif (italic)", "UI", "Geist"],
    note: "Current pick. Magazine-masthead italic. High personality, calm UI.",
    chips: ["Editorial", "Italic", "Warm"],
  },
  {
    key: "fraunces",
    name: "Fraunces",
    pair: ["Display", "Fraunces", "UI", "Inter"],
    note: "Soft optical swell. A modern serif that's playful without being twee.",
    chips: ["Modern serif", "Variable", "Friendly"],
  },
  {
    key: "newsreader",
    name: "Newsreader",
    pair: ["Display", "Newsreader", "UI", "Inter"],
    note: "Designed for longform reading. Warm, low-contrast, gentle.",
    chips: ["Reading", "Humanist", "Calm"],
  },
  {
    key: "garamond",
    name: "EB Garamond",
    pair: ["Display", "EB Garamond", "UI", "Inter"],
    note: "Classical, bookish, restrained. The 'thoughtful journal' direction.",
    chips: ["Classical", "Bookish", "Restrained"],
  },
  {
    key: "dm-serif",
    name: "DM Serif Display",
    pair: ["Display", "DM Serif Display", "UI", "Manrope"],
    note: "Confident, dressed-up didone. Use sparingly — high contrast carries the page.",
    chips: ["Didone", "Display", "Confident"],
  },
  {
    key: "spectral",
    name: "Spectral",
    pair: ["Display", "Spectral", "UI", "Inter"],
    note: "Designed for screens. Soft, unfussy serif — a quieter Fraunces.",
    chips: ["Screen-first", "Quiet", "Soft"],
  },
  {
    key: "source-serif",
    name: "Source Serif 4",
    pair: ["Display", "Source Serif 4", "UI", "Inter"],
    note: "Adobe's optical-size serif. Quietly precise. Doesn't shout.",
    chips: ["Optical", "Precise", "Neutral"],
  },
  {
    key: "plex",
    name: "IBM Plex",
    pair: ["Display", "Plex Serif", "UI", "Plex Sans + Mono"],
    note: "Thoughtful and slightly technical. The 'serious software' direction.",
    chips: ["Technical", "Family", "Legible"],
  },
  {
    key: "mono-serif",
    name: "Serif × Mono",
    pair: ["Display", "Instrument Serif", "UI", "JetBrains Mono"],
    note: "Stripe Press / Linear Press. Editorial display, technical body.",
    chips: ["Editorial", "Technical", "Distinctive"],
  },
  {
    key: "grotesk",
    name: "Space Grotesk × Inter",
    pair: ["Display", "Space Grotesk", "UI", "Inter"],
    note: "All-sans, modern product. No serif at all — the 'no-nonsense' direction.",
    chips: ["All-sans", "Modern", "Neutral"],
  },
];

function FontCard({ opt, idx, active, onTry, sample }) {
  // Each card temporarily overrides the document type via inline style
  // by setting CSS variables on its own root.
  const overrides = React.useMemo(() => {
    const map = {
      "editorial":  { display: '"Instrument Serif", Georgia, serif', ui: '"Geist", system-ui, sans-serif' },
      "fraunces":   { display: '"Fraunces", "Instrument Serif", Georgia, serif', ui: '"Inter", system-ui, sans-serif' },
      "newsreader": { display: '"Newsreader", "Instrument Serif", Georgia, serif', ui: '"Inter", system-ui, sans-serif' },
      "garamond":   { display: '"EB Garamond", "Cormorant Garamond", Georgia, serif', ui: '"Inter", system-ui, sans-serif' },
      "dm-serif":   { display: '"DM Serif Display", "Playfair Display", Georgia, serif', ui: '"Manrope", system-ui, sans-serif' },
      "spectral":   { display: '"Spectral", Georgia, serif', ui: '"Inter", system-ui, sans-serif' },
      "source-serif": { display: '"Source Serif 4", "Source Serif Pro", Georgia, serif', ui: '"Inter", system-ui, sans-serif' },
      "plex":       { display: '"IBM Plex Serif", Georgia, serif', ui: '"IBM Plex Sans", system-ui, sans-serif' },
      "mono-serif": { display: '"Instrument Serif", Georgia, serif', ui: '"JetBrains Mono", ui-monospace, monospace' },
      "grotesk":    { display: '"Space Grotesk", "Geist", system-ui, sans-serif', ui: '"Inter", system-ui, sans-serif' },
    };
    const o = map[opt.key];
    return { "--font-display": o.display, "--font-ui": o.ui, fontFamily: "var(--font-ui)" };
  }, [opt.key]);

  return (
    <article className="fontcard" data-active={active} style={overrides}>
      <div className="fontcard__meta">
        <div className="fontcard__num">№ {String(idx + 1).padStart(2, "0")} / 10</div>
        <h3 className="fontcard__name" style={{fontFamily: "var(--font-display)"}}>
          {opt.name}
        </h3>
        <div className="fontcard__pair">
          {opt.pair[0]} · <span>{opt.pair[1]}</span><br />
          {opt.pair[2]} · <span>{opt.pair[3]}</span>
        </div>
        <div className="fontcard__note">{opt.note}</div>
        <div className="fontcard__chips" style={{marginTop: 12, flexWrap: "wrap"}}>
          {opt.chips.map(c => <span key={c} className="fontcard__chip">{c}</span>)}
        </div>
      </div>

      <div className="fontcard__sample">
        <div className="fontcard__wordmark" style={{fontFamily: "var(--font-display)"}}>
          {sample.brand}
          <span className="dot" />
        </div>
        <h2 className="fontcard__head" style={{fontFamily: "var(--font-display)"}}>
          {sample.headline}
        </h2>
        <p className="fontcard__body">
          {sample.body}
        </p>
        <div style={{display: "flex", gap: 14, alignItems: "center", marginTop: 4}}>
          <span style={{fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)"}}>
            <b style={{color: "var(--ink)", fontWeight: 500}}>Marie Chen</b> · Sequoia Capital · met 12 days ago
          </span>
          <span className="fontcard__chip" style={{fontFamily: "var(--font-mono)"}}>VC · Seed</span>
        </div>
      </div>

      <div className="fontcard__cta">
        {active && <span className="fontcard__active-tag">In use</span>}
        <button className="fontcard__try" data-active={active} onClick={() => onTry(opt.key)}>
          {active ? "Active" : "Apply"}
        </button>
      </div>
    </article>
  );
}

function TypeLab({ currentType, onSelect }) {
  const [sampleText, setSampleText] = React.useState("Warmly");
  const [headline, setHeadline] = React.useState("A small directory of the people you actually know.");
  const sample = {
    brand: sampleText || "Warmly",
    headline: headline || "A small directory of the people you actually know.",
    body: "I caught up with Priya Raman last Thursday — she's looking at pre-seed AI infra and remembered our conversation about retrieval. Worth a follow-up before her panel in Lisbon.",
  };

  return (
    <div className="lab">
      <div className="lab__bar">
        <span className="lab__bar-label">Wordmark</span>
        <input
          className="lab__bar-input"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          placeholder="Warmly"
          maxLength={32}
        />
        <span className="lab__bar-label">Headline</span>
        <input
          className="lab__bar-input"
          style={{flex: 2}}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="A small directory of the people you actually know."
          maxLength={120}
        />
      </div>

      <header className="lab__head">
        <div className="lab__eyebrow">Type Lab · 10 directions</div>
        <h1 className="lab__title">Pick the voice.</h1>
        <p className="lab__intro">
          Each card pairs a <b>display face</b> (used for the Warmly wordmark, page titles, and contact names) with a <b>UI face</b> (everything else) and renders both on real product copy. Click <b>Apply</b> to switch the whole app — the choice persists. Edit the wordmark or headline above to test your own copy.
        </p>
      </header>

      <div className="lab__grid">
        {TYPE_OPTIONS.map((opt, i) => (
          <FontCard
            key={opt.key}
            opt={opt}
            idx={i}
            active={currentType === opt.key}
            onTry={onSelect}
            sample={sample}
          />
        ))}
      </div>
    </div>
  );
}

window.CRM = Object.assign(window.CRM || {}, { TypeLab });
