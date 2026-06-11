// Contacts (CRM list), with "Saved today" cards row at the top

function ContactsScreen({ contacts, onOpenContact, onDiscover }) {
  const { Avatar, StatusBadge, TextInput, TierBadge, InseadPill } = Shared;
  const [filter, setFilter] = useState('all'); // all / saved / contacted / met / followup
  const [search, setSearch] = useState('');

  // "Saved today" = anything saved within the last 24h (savedAt present)
  const now = Date.now();
  const savedToday = contacts.filter(c =>
    c.savedAt && (now - c.savedAt) < 24 * 60 * 60 * 1000
  ).sort((a, b) => b.savedAt - a.savedAt);

  let visible = contacts.filter(c => c.status !== 'New');
  if (filter === 'saved') visible = visible.filter(c => c.status === 'Saved');
  if (filter === 'contacted') visible = visible.filter(c => c.status === 'Contacted');
  if (filter === 'met') visible = visible.filter(c => c.status === 'Met');
  if (filter === 'followup') visible = visible.filter(c => c.followUpDue);
  if (search) {
    const s = search.toLowerCase();
    visible = visible.filter(c => c.name.toLowerCase().includes(s) || c.company.toLowerCase().includes(s));
  }

  // Sort: by status order, then recency
  const order = { Saved: 1, Contacted: 2, Met: 3, Archived: 9 };
  visible.sort((a, b) => (order[a.status] || 5) - (order[b.status] || 5));

  const counts = {
    total: contacts.filter(c => c.status !== 'New').length,
    met: contacts.filter(c => c.status === 'Met').length,
    followup: contacts.filter(c => c.followUpDue).length,
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'saved', label: 'Saved' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'met', label: 'Met' },
    { id: 'followup', label: 'Follow-up due', icon: Icon.Alert },
  ];

  return (
    <div className="px-12 pt-12 pb-16 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between mb-8 fade-up flex-wrap gap-3">
        <h1 className="text-[36px] leading-[1.05] font-serif-i text-ink">Contacts</h1>
        <div className="text-[12.5px] text-ink-3">
          {counts.total} contacts · {counts.met} met · {counts.followup} follow-up due
        </div>
      </div>

      {/* ---------- Saved today ---------- */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[15px] font-semibold text-ink leading-none">Saved today</h2>
          <span
            className="inline-flex items-center px-2 h-[20px] rounded-full text-[10.5px] font-medium"
            style={{ background: '#f3e2cd', color: '#7a4a25', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}
          >
            {savedToday.length}
          </span>
          <div className="flex-1 h-px ml-2" style={{ background: '#e5d8be' }} />
          {savedToday.length > 0 && (
            <button onClick={onDiscover} className="text-[12px] text-sienna-ink hover:underline inline-flex items-center gap-1">
              Discover more
              <Icon.ArrowRight size={11} />
            </button>
          )}
        </div>

        {savedToday.length === 0 ? (
          <EmptySavedToday onDiscover={onDiscover} />
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {savedToday.map((c, idx) => (
              <SavedTodayCard key={c.id} contact={c} onClick={() => onOpenContact(c.id)} idx={idx} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Full list ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[15px] font-semibold text-ink leading-none">All contacts</h2>
        <div className="flex-1 h-px ml-2" style={{ background: '#e5d8be' }} />
      </div>

      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map(f => {
            const active = filter === f.id;
            const IconCmp = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="h-8 px-3 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{
                  background: active ? '#1f1b16' : '#ffffff',
                  color: active ? '#f4ede0' : '#3d352c',
                  border: `1px solid ${active ? '#1f1b16' : '#d9cdb4'}`,
                }}
              >
                {IconCmp && <IconCmp size={12} />}
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="w-[260px]">
          <TextInput value={search} onChange={setSearch} placeholder="Search" icon={Icon.Search} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#e5d8be' }}>
        {visible.length === 0 && (
          <div className="px-6 py-12 text-center text-[13.5px] text-ink-4">
            No contacts here yet.
          </div>
        )}
        {visible.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => onOpenContact(c.id)}
            className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cream/40 border-b last:border-b-0"
            style={{ borderColor: '#f0e6d0' }}
          >
            <Avatar src={c.avatar} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13.5px] font-medium text-ink truncate">{c.name}</span>
                <span className="text-[12px] text-ink-3 truncate">· {c.role} · {c.company}</span>
                <span className="text-[11.5px] text-ink-4 hidden md:inline">· {c.insead}</span>
              </div>
            </div>
            <StatusBadge status={c.status} followUpDue={c.followUpDue} />
            <div className="text-[12px] text-ink-3 w-[72px] text-right inline-flex items-center justify-end gap-1">
              {c.followUpDue && <Icon.Alert size={11} className="text-warning" />}
              <span>{c.lastContact || '·'}</span>
            </div>
            <Icon.ChevronRight size={14} className="text-ink-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Saved-today card (mirrors the Discover Tinder profile, condensed) ----------
function SavedTodayCard({ contact: c, onClick, idx }) {
  const { Avatar, TierBadge, InseadPill } = Shared;
  const isLinkedIn = c.source === 'linkedin';
  // Channel palette (kept inline so we don't depend on discover.jsx)
  const palette = isLinkedIn
    ? { accent: '#4a6f87', soft: '#dde6ee', ink: '#2f4d63' }
    : { accent: '#b87a4a', soft: '#f3e2cd', ink: '#7a4a25' };

  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-2xl card-hover cursor-pointer fade-up overflow-hidden"
      style={{
        borderColor: '#e5d8be',
        boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)',
        animationDelay: `${idx * 40}ms`,
      }}
    >
      {/* Source ribbon */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ background: palette.soft, borderColor: `${palette.accent}33` }}
      >
        {isLinkedIn && c.via ? (
          <>
            <img src={c.via.avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
            <div className="text-[11.5px] leading-tight min-w-0 flex-1 truncate" style={{ color: palette.ink }}>
              via <span className="font-semibold">{c.via.name}</span>
            </div>
            <span className="text-[10px] font-medium px-1.5 h-[16px] inline-flex items-center rounded-sm" style={{ background: '#ffffff', color: palette.ink, fontFamily: '"JetBrains Mono", monospace' }}>2nd</span>
          </>
        ) : (
          <>
            <Icon.Book size={12} style={{ color: palette.accent }} />
            <div className="text-[11.5px] leading-tight" style={{ color: palette.ink }}>
              From <span className="font-semibold">INSEAD CV book</span>
            </div>
            <span className="ml-auto text-[10px] font-medium px-1.5 h-[16px] inline-flex items-center rounded-sm" style={{ background: '#ffffff', color: palette.ink, fontFamily: '"JetBrains Mono", monospace' }}>1st</span>
          </>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar src={c.avatar} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold text-ink leading-tight truncate">{c.name}</div>
            <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">{c.role} · {c.company}</div>
            <div className="text-[11.5px] text-ink-4 mt-0.5">{c.location}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          <InseadPill>{c.inseadShort}</InseadPill>
          <TierBadge tier={c.tier} />
        </div>
        <p className="text-[12.5px] text-ink-2 leading-relaxed italic clamp-3" style={{ minHeight: 54 }}>
          &ldquo;{c.short || c.rationale}&rdquo;
        </p>
        <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: '#ece2d0' }}>
          <span className="text-[11px] text-ink-4">Saved just now</span>
          <span className="text-[11.5px] font-medium inline-flex items-center gap-1" style={{ color: palette.ink }}>
            Draft outreach
            <Icon.ChevronRight size={11} />
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptySavedToday({ onDiscover }) {
  return (
    <div
      className="rounded-2xl border placeholder-stripes px-6 py-10 flex items-center justify-between gap-4"
      style={{ borderColor: '#d9cdb4' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#f3e2cd', color: '#b87a4a' }}>
          <Icon.HeartFill size={16} />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink mb-0.5">No contacts saved today yet</div>
          <div className="text-[12.5px] text-ink-3">Open Discover, swipe through alumni, and saved leads land here.</div>
        </div>
      </div>
      <Shared.Btn onClick={onDiscover} icon={Icon.Compass}>Open Discover</Shared.Btn>
    </div>
  );
}

window.ContactsScreen = ContactsScreen;
