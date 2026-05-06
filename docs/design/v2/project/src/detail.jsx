function DetailView({ id, onBack, onOpenChat, onOpenArtifact }) {
  const { Avatar, Chip, Icon } = window.CRM;
  const c = window.CONTACTS.find(x => x.id === id) || window.CONTACTS[0];

  const experience = c.experience || [
    { title: c.role, org: c.company, dates: "Recent", detail: "Current position" },
  ];
  const education = c.education || [{ title: "MBA / MiM", org: "Top EU school", dates: "—" }];
  const artifacts = c.artifacts || [
    { type: "meeting_prep", title: "First-contact briefing", date: "—", status: "drafted", ref: "meeting_prep_first" },
    { type: "outreach", title: "Intro draft", date: "—", status: "ready", ref: "outreach_marie" },
  ];
  const nextSteps = c.nextSteps || [
    { when: "Today", what: `Send a warm, short intro referencing the ${c.company} angle` },
    { when: "+2 weeks", what: "Follow up with a specific observation — not a pitch" },
  ];

  // Why-this-match: natural-language signals derived from tags/fields
  const matchSignals = c.matchSignals || buildMatchSignals(c);

  const stages = ["Discovered","Contacted","Connected","Met","Ongoing"];
  const currentIdx = stages.indexOf(c.stage);

  const [expExpanded, setExpExpanded] = React.useState(false);
  const [eduExpanded, setEduExpanded] = React.useState(false);

  const expShown = expExpanded ? experience : experience.slice(0, 1);
  const eduShown = eduExpanded ? education : education.slice(0, 1);

  return (
    <div className="detail">
      <div className="detail__main scroll">
        <div className="crumbs" style={{marginBottom: 20}}>
          <button className="btn btn--ghost" style={{height: 24, padding: "0 8px"}} onClick={onBack}>← Contacts</button>
          <span className="sep">/</span>
          <span className="here">{c.name}</span>
        </div>

        <div className="detail__hero">
          <Avatar name={c.name} seed={c.id} size="xl" />
          <div className="detail__titles">
            <h1 className="detail__name">{c.name}</h1>
            <div className="detail__role">{c.role} <span className="at">at</span> {c.company}</div>
            <div className="detail__meta">
              <span className="item"><Icon name="pin" size={12}/> {c.location}</span>
              <span className="item"><Icon name="linkedin" size={12}/> linkedin.com/in/{c.id}</span>
              <span className="item"><Icon name="calendar" size={12}/> Last contact · {c.lastInteraction}</span>
            </div>
          </div>
          <div className="detail__actions">
            <button className="btn"><Icon name="sparkle"/> Prep a meeting</button>
            <button className="btn btn--primary" onClick={onOpenChat}><Icon name="chat"/> Open session</button>
          </div>
        </div>

        <section className="detail__section">
          <div className="hook-block">
            <div className="label">Why this person · why now</div>
            <div className="body">“{c.hook}”</div>
          </div>
        </section>

        <section className="detail__section">
          <h3>Relationship · {c.stage}</h3>
          <div className="stage-track">
            {stages.map((s, i) => (
              <div key={s} className="stage-track__node"
                data-done={i < currentIdx || undefined}
                data-current={i === currentIdx || undefined}>
                {s}
              </div>
            ))}
          </div>
        </section>

        <section className="detail__section">
          <div className="section-head">
            <h3>Career path</h3>
            {experience.length > 1 && (
              <button className="showmore" onClick={() => setExpExpanded(v => !v)}>
                {expExpanded ? "Show latest only" : `Show ${experience.length - 1} more`}
              </button>
            )}
          </div>
          <div className="timeline">
            {expShown.map((e, i) => (
              <div key={i} className={"timeline__item" + (i === 0 ? " timeline__item--current" : "")}>
                <div className="timeline__title">{e.title}</div>
                <div className="timeline__org">{e.org}</div>
                <div className="timeline__dates">{e.dates}</div>
                {e.detail && <div className="timeline__detail">{e.detail}</div>}
              </div>
            ))}
            {!expExpanded && experience.length > 1 && (
              <div className="timeline__item timeline__item--fade">
                <div className="timeline__faded">
                  {experience.slice(1).map(e => e.org).join(" · ")}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="detail__section">
          <div className="section-head">
            <h3>Education</h3>
            {education.length > 1 && (
              <button className="showmore" onClick={() => setEduExpanded(v => !v)}>
                {eduExpanded ? "Show latest only" : `Show ${education.length - 1} more`}
              </button>
            )}
          </div>
          <div className="timeline">
            {eduShown.map((e, i) => (
              <div key={i} className="timeline__item">
                <div className="timeline__title">{e.title}</div>
                <div className="timeline__org">{e.org}</div>
                <div className="timeline__dates">{e.dates}</div>
              </div>
            ))}
            {!eduExpanded && education.length > 1 && (
              <div className="timeline__item timeline__item--fade">
                <div className="timeline__faded">
                  {education.slice(1).map(e => e.org).join(" · ")}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="detail__section">
          <h3>Artifacts · produced by the coach</h3>
          <div className="artifact-list">
            {artifacts.map((a, i) => (
              <button key={i} className="artifact-row" onClick={() => onOpenArtifact(a.ref || "meeting_prep_marie")}>
                <div className="artifact-row__icon">{({meeting_prep:"P",outreach:"O",meeting_notes:"N",follow_up:"F"}[a.type] || "A")}</div>
                <div style={{textAlign: "left"}}>
                  <div className="artifact-row__title">{a.title}</div>
                  <div className="artifact-row__meta">{a.type.replace(/_/g," ")} · {a.date}</div>
                </div>
                <div className="artifact-row__status">{a.status} <Icon name="arrow-right" size={12}/></div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="detail__side scroll">
        <div className="side-block">
          <h4>Coach's take</h4>
          <div className="sidenotes">
            {c.summary || `A strong Tier ${c.tier} match. The shared thread with your trajectory is the opener — keep the first interaction about learning, not asking.`}
          </div>
        </div>

        <div className="side-block">
          <h4>Next steps</h4>
          {nextSteps.map((s, i) => (
            <div key={i} className="next-step">
              <div className="next-step__when">{s.when}</div>
              <div className="next-step__what">{s.what}</div>
            </div>
          ))}
        </div>

        <div className="side-block">
          <h4>Why this match</h4>
          <ul className="match-list">
            {matchSignals.map((s, i) => (
              <li key={i}>
                <span className="match-list__dot" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="side-block">
          <h4>Tags</h4>
          <div className="tag-list">
            {c.tags.map(t => <Chip key={t}>{t}</Chip>)}
            <Chip variant="ghost">+ add</Chip>
          </div>
        </div>
      </aside>
    </div>
  );
}

function buildMatchSignals(c) {
  const out = [];
  const hasInsead = c.tags.find(t => /INSEAD/i.test(t));
  if (hasInsead) out.push(`Shared INSEAD network — ${hasInsead}`);
  if (c.tags.find(t => /Bain|McKinsey|BCG|Consulting/i.test(t))) out.push("Same consulting → investing pivot you're targeting");
  if (c.stage === "Ongoing" || c.stage === "Met") out.push(`Relationship is warm — ${c.lastInteraction}`);
  if (c.stage === "Discovered") out.push("Not yet contacted — cold outreach opportunity");
  if (c.health === "red") out.push("Going cold · re-warm before asking anything");
  if (c.tags.find(t => /VC|PE|Fintech|SaaS|Consumer|Deep tech|Growth/i.test(t))) {
    out.push(`Active in your target space (${c.tags.filter(t => /VC|PE|Fintech|SaaS|Consumer|Deep tech|Growth/i.test(t)).join(", ")})`);
  }
  if (c.location) out.push(`Based in ${c.location} — accessible from your EU base`);
  return out.slice(0, 4);
}

window.CRM.DetailView = DetailView;
