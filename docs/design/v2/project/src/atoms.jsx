// Shared UI bits
// --- Atoms --------------------------------------------------------------
function Avatar({ name, initials, size = "md", seed }) {
  const hue = React.useMemo(() => {
    const s = (seed || name || initials || "x");
    let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }, [seed, name, initials]);
  const cls = "avatar" + (size === "lg" ? " avatar--lg" : size === "xl" ? " avatar--xl" : "");
  const bg = `oklch(0.93 0.035 ${hue})`;
  const ring = `oklch(0.55 0.10 ${hue} / 0.18)`;
  return (
    <span className={cls} style={{ background: bg, boxShadow: `inset 0 0 0 1px ${ring}` }}>
      {initials || (name || "").split(" ").map(s => s[0]).slice(0,2).join("")}
    </span>
  );
}

function Chip({ children, variant }) {
  const cls = "chip" + (variant ? ` chip--${variant}` : "");
  return <span className={cls}>{children}</span>;
}

function StageDot({ stage }) {
  const map = { Met: "green", Ongoing: "green", Contacted: "yellow", Discovered: "gray", Connected: "yellow" };
  return <span className={`dot dot--${map[stage] || "gray"}`} />;
}

function HealthDot({ h }) { return <span className={`dot dot--${h}`} />; }

function Icon({ name, size = 14 }) {
  // Minimal stroke icons — no fancy SVGs
  const s = { width: size, height: size, stroke: "currentColor", fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" };
  switch (name) {
    case "chat": return <svg {...s}><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2z"/></svg>;
    case "users": return <svg {...s}><circle cx="9" cy="8" r="3"/><path d="M3 19c.8-3 3-5 6-5s5.2 2 6 5"/><circle cx="17" cy="7" r="2"/><path d="M16 13c2.5 0 4.5 1.8 5 4.5"/></svg>;
    case "target": return <svg {...s}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>;
    case "sparkle": return <svg {...s}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></svg>;
    case "search": return <svg {...s}><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></svg>;
    case "plus": return <svg {...s}><path d="M12 5v14M5 12h14"/></svg>;
    case "send": return <svg {...s}><path d="M5 12 20 5l-4 15-4-7z"/></svg>;
    case "paperclip": return <svg {...s}><path d="M21 11.5 12 20a5 5 0 1 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8"/></svg>;
    case "bolt": return <svg {...s}><path d="M13 3 4 14h6l-1 7 9-11h-6z"/></svg>;
    case "external": return <svg {...s}><path d="M14 4h6v6M10 14 20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>;
    case "linkedin": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg>;
    case "pin": return <svg {...s}><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "calendar": return <svg {...s}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case "tune": return <svg {...s}><path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4"/></svg>;
    case "arrow-right": return <svg {...s}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "chevron-down": return <svg {...s}><path d="M6 9l6 6 6-6"/></svg>;
    case "trash": return <svg {...s}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6"/></svg>;
    case "type": return <svg {...s}><path d="M4 7V5h16v2M9 5v14M15 5v14M7 19h4M13 19h4"/></svg>;
    case "flame": return <svg {...s}><path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 2-3 6a6 6 0 0 0 12 0c0-6-6-11-6-11z"/></svg>;
    case "trend": return <svg {...s}><path d="M3 17l6-6 4 4 7-8M14 7h6v6"/></svg>;
    case "check": return <svg {...s}><path d="M5 12l4 4L19 6"/></svg>;
    default: return null;
  }
}

// --- Sidebar ------------------------------------------------------------
function Sidebar({ view, onNav, onReplayOnboarding }) {
  const items = [
    { id: "chat", label: "Chat", icon: "chat", kbd: "G C" },
    { id: "contacts", label: "Contacts", icon: "users", kbd: "G N" },
    { id: "goals", label: "Goals", icon: "target", kbd: "G G" },
    { id: "fonts", label: "Type Lab", icon: "type", kbd: "G T" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark">Warmly<span className="brand__dot" /></span>
      </div>

      <nav className="nav">
        {items.map(it => (
          <button key={it.id} className="nav__item" aria-current={view === it.id ? "page" : undefined} onClick={() => onNav(it.id)}>
            <span className="nav__glyph"><Icon name={it.icon} /></span>
            {it.label}
            <span className="kbd">{it.kbd}</span>
          </button>
        ))}
      </nav>

      <div style={{flex: 1}} />

      <div className="sidebar__footer">
        <Avatar initials="AM" seed="alex" />
        <div className="who">
          <span className="who__name">Alex Moreau</span>
          <span className="who__sub">MBA26D · INSEAD</span>
        </div>
        {onReplayOnboarding && (
          <button className="btn btn--ghost" style={{height: 24, padding: "0 8px", fontSize: 11}} title="Replay onboarding" onClick={onReplayOnboarding}>↺</button>
        )}
      </div>
    </aside>
  );
}

window.CRM = { Avatar, Chip, StageDot, HealthDot, Icon, Sidebar };
