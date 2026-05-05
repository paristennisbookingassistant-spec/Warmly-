function DirectoryView({ onOpenContact, onAdd }) {
  const { Icon, Avatar, Chip, StageDot, HealthDot } = window.CRM;
  const [layout, setLayout] = React.useState(() => localStorage.getItem("crm.dir.layout") || "directory");
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("relevance");

  React.useEffect(() => localStorage.setItem("crm.dir.layout", layout), [layout]);

  const stats = {
    total: window.CONTACTS.length,
    tier1: window.CONTACTS.filter(c => c.tier === 1).length,
    active: window.CONTACTS.filter(c => c.stage === "Met" || c.stage === "Ongoing" || c.stage === "Contacted").length,
    overdue: window.CONTACTS.filter(c => c.health === "red").length,
  };

  // "Today" curated feed — 3 people the coach thinks you should focus on right now
  const today = React.useMemo(() => {
    const overdue = window.CONTACTS.find(c => c.health === "red");
    const warm = window.CONTACTS.find(c => c.health === "green" && c.stage === "Met");
    const discover = window.CONTACTS.find(c => c.stage === "Discovered" && c.tier === 1) ||
                     window.CONTACTS.find(c => c.stage === "Discovered");
    return [
      overdue && { c: overdue, kind: "Re-warm", why: `${overdue.lastInteraction} since your last exchange — she flagged Q2 hiring.` },
      warm && { c: warm, kind: "Follow up", why: `Meeting went well — send the Atomico report before the trail goes cold.` },
      discover && { c: discover, kind: "Reach out", why: `Strongest new match this week — ${discover.hook.slice(0, 70).replace(/\s+\S*$/, "")}…` },
    ].filter(Boolean);
  }, []);

  const filtered = React.useMemo(() => {
    let list = window.CONTACTS.filter(c => {
      if (filter === "tier1" && c.tier !== 1) return false;
      if (filter === "met" && !(c.stage === "Met" || c.stage === "Ongoing")) return false;
      if (filter === "overdue" && c.health !== "red" && c.health !== "yellow") return false;
      if (filter === "new" && c.stage !== "Discovered") return false;
      if (query && !(c.name + c.company + c.tags.join(" ") + c.role + c.location).toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    if (sort === "recency") {
      const score = (c) => c.lastInteraction === "—" ? 9999 : parseRecency(c.lastInteraction);
      list = [...list].sort((a, b) => score(a) - score(b));
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "company") {
      list = [...list].sort((a, b) => a.company.localeCompare(b.company));
    } else {
      list = [...list].sort((a, b) => b.score - a.score);
    }
    return list;
  }, [filter, query, sort]);

  return (
    <div className="dir">
      <div className="dir__hero">
        <h1>A deliberate network.</h1>
        <div className="lede">
          <b>{stats.total} people</b> across your target industries. The coach surfaces who to reach, when, and why —
          so you can spend your time on the human part.
        </div>
      </div>

      {/* Today's focus — always on top, compact */}
      <section className="today">
        <div className="today__head">
          <div>
            <div className="today__kicker">Today · coach's focus</div>
            <div className="today__title">Three people worth your attention right now</div>
          </div>
          <button className="btn btn--ghost" style={{height: 24, padding: "0 8px"}}>Plan my week →</button>
        </div>
        <div className="today__row">
          {today.map((t, i) => (
            <button key={i} className="today__card" onClick={() => onOpenContact(t.c.id)}>
              <div className="today__kind">{t.kind}</div>
              <div className="today__who">
                <Avatar name={t.c.name} seed={t.c.id} />
                <div>
                  <div className="today__name">{t.c.name}</div>
                  <div className="today__role">{t.c.role} · {t.c.company}</div>
                </div>
              </div>
              <div className="today__why">{t.why}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="dir__toolbar">
        <label className="search">
          <Icon name="search" />
          <input placeholder="Search name, company, school, tag, location…" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className="filters">
          {["all","tier1","met","overdue","new"].map(f => (
            <button key={f} className="filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {{all: "All", tier1: "Tier 1", met: "Met / ongoing", overdue: "Going cold", new: "New"}[f]}
            </button>
          ))}
        </div>
        <div style={{flex:1}} />
        <div className="layout-toggle">
          <button aria-pressed={layout === "directory"} onClick={() => setLayout("directory")} title="Directory (dense)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <button aria-pressed={layout === "progress"} onClick={() => setLayout("progress")} title="Progress (grouped)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>
          </button>
        </div>
        <button className="btn" onClick={onAdd}><Icon name="plus" /> Add contact</button>
        <button className="btn btn--primary"><Icon name="bolt" /> Run discovery</button>
      </div>

      <div className="dir__body scroll">
        {layout === "directory" ? (
          <DirectoryTable list={filtered} onOpenContact={onOpenContact} sort={sort} onSort={setSort} />
        ) : (
          <GroupedView list={filtered} onOpenContact={onOpenContact} />
        )}
      </div>
    </div>
  );
}

function parseRecency(s) {
  if (!s || s === "—") return 9999;
  const m = s.match(/(\d+)\s*(d|w|wk|mo|week|day|month|h)/i);
  if (!m) { if (/today|now/i.test(s)) return 0; if (/yest/i.test(s)) return 1; return 50; }
  const n = +m[1];
  const u = m[2].toLowerCase();
  if (u.startsWith("h")) return n / 24;
  if (u.startsWith("d")) return n;
  if (u.startsWith("w")) return n * 7;
  if (u.startsWith("mo")) return n * 30;
  return n;
}

function DirectoryTable({ list, onOpenContact, sort, onSort }) {
  const { Avatar, Icon, HealthDot } = window.CRM;
  const cols = [
    { k: "name", label: "Name", sort: "name" },
    { k: "role", label: "Role · Company", sort: "company" },
    { k: "stage", label: "Stage", sort: null },
    { k: "tags", label: "Context", sort: null },
    { k: "last", label: "Last contact", sort: "recency" },
    { k: "score", label: "Fit", sort: "relevance" },
  ];

  return (
    <>
      <div className="table__count">{list.length} contacts</div>
      <div className="table" role="table">
        <div className="table__head" role="row">
          {cols.map(c => (
            <button key={c.k} role="columnheader" className="table__th"
              onClick={() => c.sort && onSort(c.sort)}
              data-active={sort === c.sort || undefined}>
              {c.label}
              {c.sort && <span className="table__sort">↕</span>}
            </button>
          ))}
        </div>
        {list.map(c => (
          <button key={c.id} className="table__row" role="row" onClick={() => onOpenContact(c.id)}>
            <div className="table__cell table__cell--name">
              <Avatar name={c.name} seed={c.id} />
              <div>
                <div className="table__name">{c.name}</div>
                <div className="table__loc">{c.location}</div>
              </div>
            </div>
            <div className="table__cell">
              <div>{c.role}</div>
              <div className="muted" style={{fontSize: 12}}>{c.company}</div>
            </div>
            <div className="table__cell">
              <span className="stage-pill" data-stage={c.stage}>
                <HealthDot h={c.health} /> {c.stage}
              </span>
            </div>
            <div className="table__cell table__cell--tags">
              {c.tags.slice(0, 2).map(t => <span key={t} className="chip">{t}</span>)}
              {c.tags.length > 2 && <span className="muted mono" style={{fontSize: 10.5}}>+{c.tags.length - 2}</span>}
            </div>
            <div className="table__cell mono" style={{fontSize: 11.5, color: "var(--ink-3)"}}>{c.lastInteraction}</div>
            <div className="table__cell">
              <span className={"table__score" + (c.tier === 1 ? " table__score--t1" : "")}>
                {c.score.toFixed(1)}<span className="muted"> ·T{c.tier}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function GroupedView({ list, onOpenContact }) {
  const bySection = React.useMemo(() => {
    const s = { "Needs attention": [], "In motion": [], "Recently discovered": [] };
    list.forEach(c => {
      if (c.health === "red" || (c.stage === "Ongoing" && c.health === "yellow")) s["Needs attention"].push(c);
      else if (c.stage === "Discovered") s["Recently discovered"].push(c);
      else s["In motion"].push(c);
    });
    return s;
  }, [list]);
  return (
    <>
      {Object.entries(bySection).map(([label, sub]) => (
        sub.length === 0 ? null : (
          <section key={label}>
            <div className="dir__section-head">
              <h3>{label}</h3>
              <span className="count">{sub.length}</span>
            </div>
            <div className="grid">
              {sub.map(c => <ContactCard key={c.id} c={c} onClick={() => onOpenContact(c.id)} />)}
            </div>
          </section>
        )
      ))}
    </>
  );
}

function ContactCard({ c, onClick }) {
  const { Avatar, Chip, StageDot } = window.CRM;
  return (
    <button className="card" onClick={onClick}>
      <div className="card__head">
        <Avatar name={c.name} seed={c.id} />
        <div className="card__who">
          <div className="card__name truncate">{c.name}</div>
          <div className="card__role truncate">{c.role} · {c.company}</div>
        </div>
        <div className="card__score">
          <span className={"big " + (c.tier === 1 ? "score--tier1" : "")}>{c.score.toFixed(1)}</span>
          <span>Tier {c.tier}</span>
        </div>
      </div>
      {c.hook && <div className="card__hook">{c.hook}</div>}
      <div className="row gap-2" style={{flexWrap: "wrap"}}>
        {c.tags.slice(0,3).map(t => <Chip key={t}>{t}</Chip>)}
      </div>
      <div className="card__foot">
        <div className="card__stage"><StageDot stage={c.stage}/> {c.stage}<span className="muted" style={{marginLeft: 8}}>{c.location}</span></div>
        <div className="card__last">{c.lastInteraction}</div>
      </div>
    </button>
  );
}

window.CRM.DirectoryView = DirectoryView;
