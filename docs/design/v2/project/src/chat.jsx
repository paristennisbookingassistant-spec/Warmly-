function ChatView({ onOpenContact, onOpenArtifact }) {
  const { Avatar, Chip, Icon } = window.CRM;
  const [active, setActive] = React.useState("marie"); // 'general' | 'marie' | 'david' | ...
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [sessions, setSessions] = React.useState([
    { id: "general", title: "General networking", preview: "Strategy · discovery · weekly planning", time: "Now", person: null, undeletable: true },
    { id: "marie", title: "Marie Chen", preview: "What's next for this relationship?", time: "Today", person: { name: "Marie Chen", role: "VP · Sequoia", seed: "marie" } },
    { id: "david", title: "David Okafor", preview: "Drafted outreach referencing Parloa deal", time: "Yest", person: { name: "David Okafor", role: "Principal · Atomico", seed: "david" } },
    { id: "priya", title: "Priya Raman", preview: "Quarterly check-in plan", time: "2d", person: { name: "Priya Raman", role: "Partner · Balderton", seed: "priya" } },
    { id: "sara", title: "Sara Lindqvist", preview: "Platform role framing", time: "5d", person: { name: "Sara Lindqvist", role: "Head of Platform · EQT", seed: "sara" } },
    { id: "lucas", title: "Lucas Bernard", preview: "Cold outreach — Back Market hook", time: "1w", person: { name: "Lucas Bernard", role: "Director · Eurazeo", seed: "lucas" } },
  ]);

  function deleteSession(id) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (active === id) setActive(next[0]?.id || "general");
      return next;
    });
    setConfirmDelete(null);
  }

  const session = sessions.find(s => s.id === active) || sessions[0];
  const thread = active === "general" ? window.GENERAL_THREAD : window.MARIE_THREAD;
  const title = session.person ? session.person.name : "General networking";
  const sub = session.person ? session.person.role : "Ongoing strategy thread";

  return (
    <div className="chat">
      <div className="chat__sessions scroll">
        <div className="chat__sessions-head">
          <h3>Threads</h3>
          <div style={{flex:1}} />
          <button className="btn btn--ghost" style={{height: 24, padding: "0 8px"}} title="Filter"><Icon name="tune" size={12}/></button>
        </div>
        <button className="chat__new"><Icon name="plus" size={13} /> New conversation</button>
        {sessions.map(s => (
          <div key={s.id} className="chat__session" aria-current={active === s.id} onClick={() => setActive(s.id)}>
            {s.person
              ? <Avatar name={s.person.name} seed={s.person.seed} />
              : <span className="avatar" style={{background: "var(--ink)", color: "var(--bg)"}}>⌘</span>}
            <div className="chat__session-body">
              <div className="chat__session-title truncate">{s.title}</div>
              <div className="chat__session-preview truncate">{s.preview}</div>
              <div className="chat__session-meta"><span>{s.time}</span>{s.person && <span>· artifact</span>}</div>
            </div>
            {!s.undeletable && (
              confirmDelete === s.id ? (
                <div className="chat__session-confirm" onClick={e => e.stopPropagation()}>
                  <button className="chat__session-confirm-cancel" onClick={() => setConfirmDelete(null)} title="Cancel">Cancel</button>
                  <button className="chat__session-confirm-delete" onClick={() => deleteSession(s.id)} title="Delete thread">Delete</button>
                </div>
              ) : (
                <button
                  className="chat__session-delete"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(s.id); }}
                  title="Delete thread"
                  aria-label={`Delete thread with ${s.title}`}
                >
                  <Icon name="trash" size={13} />
                </button>
              )
            )}
          </div>
        ))}
      </div>

      <div className="chat__main">
        <header className="chat__header">
          {session.person
            ? <Avatar name={session.person.name} seed={session.person.seed} size="lg" />
            : <span className="avatar avatar--lg" style={{background: "var(--ink)", color: "var(--bg)", fontSize: 26}}>⌘</span>}
          <div style={{flex:1}}>
            <h2>{title}</h2>
            <div className="sub">{sub}</div>
          </div>
          {session.person && (
            <div className="topbar__actions">
              <button className="btn"><Icon name="linkedin" /> LinkedIn</button>
              <button className="btn" onClick={() => onOpenContact(active === "marie" ? "marie-chen" : "david-okafor")}>
                <Icon name="external" /> Open profile
              </button>
            </div>
          )}
        </header>

        <div className="chat__stream scroll">
          {thread.map((m, i) => <Message key={i} m={m} person={session.person} onOpenArtifact={onOpenArtifact} active={active} />)}
          <div style={{height: 12}} />
        </div>

        <div className="chat__composer">
          <div className="composer">
            <textarea
              className="composer__input"
              placeholder={session.person
                ? `Ask about ${title.split(" ")[0]} — draft a follow-up, prep a call, plan next step…`
                : "Ask for a discovery plan, strategy advice, or drop a LinkedIn URL…"}
              rows={2}
            />
            <div className="composer__row">
              <div className="composer__chips">
                <button className="chip"><Icon name="sparkle" size={11} /> Prep a meeting</button>
                <button className="chip"><Icon name="paperclip" size={11} /> Paste LinkedIn</button>
                <button className="chip"><Icon name="bolt" size={11} /> Run discovery</button>
              </div>
              <div className="spacer" />
              <span className="composer__hint">Haiku · ⌘↵ to send</span>
              <button className="btn btn--primary"><Icon name="send" size={12} /> Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m, person, onOpenArtifact, active }) {
  const { Avatar } = window.CRM;
  const isAgent = m.from === "agent";
  return (
    <div className={"msg " + (isAgent ? "msg--agent" : "msg--user")}>
      <div className="msg__gutter">
        {isAgent
          ? <div className="msg__gutter--agent">c</div>
          : <Avatar initials="AM" seed="alex" />}
      </div>
      <div className="msg__body">
        <div className="msg__meta">
          <span className="name">{isAgent ? "Coach" : "Alex"}</span>
          <span>·</span>
          <span>{m.time}</span>
        </div>
        <div className="msg__text">{m.text}</div>
        {m.artifact && <ArtifactCard a={m.artifact} onOpen={() => onOpenArtifact(artifactRefFor(m.artifact, active))} />}
        {m.actionPlan && <ActionPlan items={m.actionPlan} />}
      </div>
    </div>
  );
}

function artifactRefFor(a, active) {
  if (a.type === "meeting_prep" && active === "general") return "meeting_prep_marie";
  if (a.type === "meeting_prep" && active === "marie") return "meeting_prep_first";
  if (a.type === "outreach") return "outreach_marie";
  return "meeting_prep_marie";
}

function ArtifactCard({ a, onOpen }) {
  const iconFor = { meeting_prep: "P", outreach: "O", meeting_notes: "N", follow_up: "F" }[a.type] || "A";
  return (
    <button className="artifact-card" onClick={onOpen}>
      <div className="artifact-card__icon">{iconFor}</div>
      <div className="artifact-card__body">
        <div className="artifact-card__type">{a.type.replace(/_/g," ")}</div>
        <div className="artifact-card__title">{a.title}</div>
        <div className="artifact-card__preview">{a.preview}</div>
        <div className="artifact-card__open">Open in full ↗</div>
      </div>
    </button>
  );
}

function ActionPlan({ items }) {
  return (
    <div className="action-plan">
      <div className="action-plan__head">Progression plan</div>
      {items.map((it, i) => (
        <div key={i} className="action-plan__item">
          <div className="action-plan__when">{it.when}</div>
          <div>{it.what}</div>
        </div>
      ))}
    </div>
  );
}

window.CRM.ChatView = ChatView;
