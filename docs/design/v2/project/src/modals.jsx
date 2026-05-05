// Modal for manually adding a contact — URL paste OR fields.

function AddContactModal({ open, onClose, onSaved }) {
  const { Icon } = window.CRM;
  const [mode, setMode] = React.useState("url"); // url | manual
  const [url, setUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");

  if (!open) return null;

  function save() {
    onSaved({
      id: (name || "new-contact").toLowerCase().replace(/\s+/g,"-") + "-" + Math.random().toString(36).slice(2,6),
      name: name || "New contact",
      initials: (name || "NC").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase(),
      role: role || "—",
      company: company || "—",
      location: location || "—",
      stage: "Discovered",
      score: 7.0,
      tier: 3,
      lastInteraction: "—",
      health: "gray",
      tags: ["Manual"],
      hook: notes || "Added manually · no coach context yet.",
      summary: notes,
    });
    setUrl(""); setName(""); setRole(""); setCompany(""); setLocation(""); setNotes("");
    onClose();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="modal__kicker">New contact</div>
            <h2>Add someone to your network</h2>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>

        <div className="modal__tabs">
          <button className="modal__tab" aria-pressed={mode === "url"} onClick={() => setMode("url")}>From LinkedIn URL</button>
          <button className="modal__tab" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>Manual details</button>
        </div>

        {mode === "url" ? (
          <div className="modal__body">
            <label className="field">
              <span className="field__label">LinkedIn URL</span>
              <input className="field__input" placeholder="https://linkedin.com/in/…" value={url} onChange={e => setUrl(e.target.value)} />
              <span className="field__hint">I'll fetch what's public and draft a first-contact brief. You'll review before anything is saved.</span>
            </label>
            <label className="field">
              <span className="field__label">One-line note <span className="muted">· optional</span></span>
              <input className="field__input" placeholder="How you came across them, shared context, etc." value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
            <div className="modal__foot">
              <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
              <div style={{flex:1}} />
              <button className="btn btn--primary" disabled={!url.trim()} onClick={() => { setName(url.split("/in/")[1]?.replace(/\/?$/,"").replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase()) || "New contact"); save(); }}>
                <Icon name="sparkle" size={12}/> Fetch & add
              </button>
            </div>
          </div>
        ) : (
          <div className="modal__body">
            <div className="field__row">
              <label className="field">
                <span className="field__label">Name</span>
                <input className="field__input" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Location</span>
                <input className="field__input" placeholder="London" value={location} onChange={e => setLocation(e.target.value)} />
              </label>
            </div>
            <div className="field__row">
              <label className="field">
                <span className="field__label">Role</span>
                <input className="field__input" placeholder="Principal" value={role} onChange={e => setRole(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Company</span>
                <input className="field__input" placeholder="Atomico" value={company} onChange={e => setCompany(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Notes · context for the coach</span>
              <textarea className="field__input" rows={3} placeholder="Where you met, shared connections, what you want from the relationship…" value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
            <div className="modal__foot">
              <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
              <div style={{flex:1}} />
              <button className="btn btn--primary" disabled={!name.trim()} onClick={save}>
                Save contact
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Right-side artifact drawer
function ArtifactDrawer({ artifact, onClose }) {
  const { Icon } = window.CRM;
  if (!artifact) return null;
  const c = window.ARTIFACT_CONTENT[artifact] || window.ARTIFACT_CONTENT.meeting_prep_marie;
  const kind = c.type.replace(/_/g," ");
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header className="drawer__head">
          <div>
            <div className="drawer__kicker">{kind}</div>
            <h2>{c.title}</h2>
            <div className="drawer__sub">{c.subtitle}</div>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </header>

        <div className="drawer__body scroll">
          {c.body && <div className="drawer__prose">{c.body.split("\n\n").map((p,i) => <p key={i}>{p}</p>)}</div>}
          {c.sections && c.sections.map((s, i) => (
            <section key={i} className="drawer__section">
              <h3>{s.label}</h3>
              {s.body && <p>{s.body}</p>}
              {s.list && (
                <ol className="drawer__list">
                  {s.list.map((item, j) => <li key={j}>{item}</li>)}
                </ol>
              )}
            </section>
          ))}
        </div>

        <footer className="drawer__foot">
          <button className="btn"><Icon name="external" size={12}/> Copy</button>
          <button className="btn"><Icon name="paperclip" size={12}/> Edit</button>
          <div style={{flex:1}} />
          <button className="btn btn--primary"><Icon name="send" size={12}/> Use this</button>
        </footer>
      </aside>
    </div>
  );
}

window.CRM.AddContactModal = AddContactModal;
window.CRM.ArtifactDrawer = ArtifactDrawer;
