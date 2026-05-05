function Tweaks() {
  const [open, setOpen] = React.useState(false);
  const [palette, setPalette] = React.useState("cream");
  const [density, setDensity] = React.useState("balanced");
  // type is sourced from the DOM so external pages (Type Lab) can change it
  const [type, setTypeState] = React.useState(() => document.documentElement.getAttribute("data-type") || "editorial");
  const setType = (v) => { document.documentElement.setAttribute("data-type", v); setTypeState(v); };

  React.useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    document.documentElement.setAttribute("data-density", density);
  }, [palette, density]);

  React.useEffect(() => {
    const obs = new MutationObserver(() => {
      const v = document.documentElement.getAttribute("data-type") || "editorial";
      setTypeState(v);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-type"] });
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const swatch = (c) => <span className="tweaks__swatch" style={{background: c}} />;

  return (
    <>
      <button
        className="btn btn--ghost"
        style={{position: "fixed", right: 16, bottom: 16, zIndex: 99, background: "var(--surface)", boxShadow: "var(--shadow-2), inset 0 0 0 1px var(--line-soft)"}}
        onClick={() => setOpen(o => !o)}
      >
        ✦ Tweaks
      </button>
      <div className="tweaks" data-open={open}>
        <h4>Tweaks</h4>

        <div className="tweaks__group">
          <div className="tweaks__label">Palette</div>
          <div className="tweaks__opts">
            <button className="tweaks__opt" aria-pressed={palette === "cream"} onClick={() => setPalette("cream")}>{swatch("oklch(0.60 0.13 45)")}Cream</button>
            <button className="tweaks__opt" aria-pressed={palette === "taupe"} onClick={() => setPalette("taupe")}>{swatch("oklch(0.58 0.08 60)")}Taupe</button>
            <button className="tweaks__opt" aria-pressed={palette === "bone"} onClick={() => setPalette("bone")}>{swatch("oklch(0.52 0.11 40)")}Bone</button>
            <button className="tweaks__opt" aria-pressed={palette === "peach"} onClick={() => setPalette("peach")}>{swatch("oklch(0.62 0.15 35)")}Peach</button>
          </div>
        </div>

        <div className="tweaks__group">
          <div className="tweaks__label">Density</div>
          <div className="tweaks__opts">
            {["compact","balanced","airy"].map(d => (
              <button key={d} className="tweaks__opt" aria-pressed={density === d} onClick={() => setDensity(d)}>{d}</button>
            ))}
          </div>
        </div>

        <div className="tweaks__group">
          <div className="tweaks__label">Display type</div>
          <div className="tweaks__opts">
            {[
              ["editorial","Instrument Serif"],
              ["fraunces","Fraunces"],
              ["newsreader","Newsreader"],
              ["garamond","EB Garamond"],
              ["dm-serif","DM Serif Display"],
              ["spectral","Spectral"],
              ["source-serif","Source Serif 4"],
              ["plex","IBM Plex"],
              ["mono-serif","Serif × Mono"],
              ["grotesk","Space Grotesk"],
            ].map(([k,l]) => (
              <button key={k} className="tweaks__opt" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
          <button
            className="tweaks__opt"
            style={{marginTop: 6, justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase"}}
            onClick={() => window.dispatchEvent(new CustomEvent("crm:goto", { detail: "fonts" }))}
          >
            Open Type Lab →
          </button>
        </div>
      </div>
    </>
  );
}

function App() {
  const [view, setView] = React.useState("contacts");
  const [detailId, setDetailId] = React.useState(null);
  const [artifactRef, setArtifactRef] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [onboarded, setOnboarded] = React.useState(() => localStorage.getItem("crm.onboarded") === "1");
  const [showOnboardingRestart, setShowOnboardingRestart] = React.useState(false);

  // Listen for goto events from Tweaks panel etc.
  React.useEffect(() => {
    const h = (e) => setView(e.detail);
    window.addEventListener("crm:goto", h);
    return () => window.removeEventListener("crm:goto", h);
  }, []);

  // Read current data-type so Type Lab can highlight the active option
  const [currentType, setCurrentType] = React.useState(() => document.documentElement.getAttribute("data-type") || "editorial");
  React.useEffect(() => {
    const obs = new MutationObserver(() => {
      setCurrentType(document.documentElement.getAttribute("data-type") || "editorial");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-type"] });
    return () => obs.disconnect();
  }, []);
  const setType = (k) => document.documentElement.setAttribute("data-type", k);

  React.useEffect(() => {
    const saved = localStorage.getItem("crm.view");
    const savedId = localStorage.getItem("crm.detailId");
    if (saved) setView(saved);
    if (savedId) setDetailId(savedId);
  }, []);
  React.useEffect(() => {
    localStorage.setItem("crm.view", view);
    if (detailId) localStorage.setItem("crm.detailId", detailId);
  }, [view, detailId]);

  const nav = (v, id) => {
    if (v === "detail" && id) { setDetailId(id); setView("detail"); }
    else { setView(v); }
  };

  const { Sidebar, ChatView, DirectoryView, DetailView, Onboarding, AddContactModal, ArtifactDrawer, TypeLab, Goals } = window.CRM;

  // Onboarding gate
  if (!onboarded) {
    return (
      <div className="app app--onb">
        <Onboarding onDone={() => { localStorage.setItem("crm.onboarded", "1"); setOnboarded(true); }} />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar view={view === "detail" ? "contacts" : view} onNav={nav} onReplayOnboarding={() => { localStorage.removeItem("crm.onboarded"); setOnboarded(false); }} />
      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            {view === "chat" && <span className="here">Chat</span>}
            {view === "contacts" && <span className="here">Contacts</span>}
            {view === "goals" && <span className="here">Goals</span>}
            {view === "fonts" && <span className="here">Type Lab</span>}
            {view === "detail" && (
              <>
                <button className="btn btn--ghost" style={{height:24, padding:"0 6px"}} onClick={() => setView("contacts")}>Contacts</button>
                <span className="sep">/</span>
                <span className="here">{(window.CONTACTS.find(c => c.id === detailId) || {}).name || ""}</span>
              </>
            )}
          </div>
          <div className="topbar__spacer" />
          <div className="viewtabs">
            <button className="viewtabs__tab" aria-pressed={view === "chat"} onClick={() => setView("chat")}>Chat</button>
            <button className="viewtabs__tab" aria-pressed={view === "contacts" || view === "detail"} onClick={() => setView("contacts")}>Contacts</button>
            <button className="viewtabs__tab" aria-pressed={view === "goals"} onClick={() => setView("goals")}>Goals</button>
            <button className="viewtabs__tab" aria-pressed={view === "fonts"} onClick={() => setView("fonts")}>Type Lab</button>
          </div>
          <div className="topbar__actions">
            <button className="btn"><span className="mono" style={{fontSize: 10.5, color: "var(--ink-3)"}}>⌘K</span> Quick find</button>
          </div>
        </div>

        {view === "chat" && <ChatView onOpenContact={(id) => nav("detail", id)} onOpenArtifact={setArtifactRef} />}
        {view === "contacts" && <DirectoryView onOpenContact={(id) => nav("detail", id)} onAdd={() => setAddOpen(true)} />}
        {view === "detail" && <DetailView id={detailId} onBack={() => setView("contacts")} onOpenChat={() => setView("chat")} onOpenArtifact={setArtifactRef} />}
        {view === "goals" && <Goals />}
        {view === "fonts" && <TypeLab currentType={currentType} onSelect={setType} />}
      </div>
      <Tweaks />
      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={(c) => { window.CONTACTS.unshift(c); setAddOpen(false); nav("detail", c.id); }} />
      <ArtifactDrawer artifact={artifactRef} onClose={() => setArtifactRef(null)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
