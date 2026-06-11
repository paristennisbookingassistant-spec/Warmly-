// Shared UI primitives — wordmark, sidebar, buttons, badges, toasts, inputs

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

// ---------- Wordmark ----------
function Wordmark({ size = 26, dark = false, withDot = true }) {
  const color = dark ? '#1f1b16' : '#f4ede0';
  return (
    <div className="inline-flex items-baseline gap-[3px] select-none leading-none" style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: size, color, letterSpacing: '-0.01em' }}>
      <span>Warmly</span>
      {withDot && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: '#b87a4a', transform: 'translateY(-1px)' }} />}
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ current, onNav, user }) {
  const items = [
    { id: 'home', label: 'Home', icon: Icon.Home },
    { id: 'discover', label: 'Discover', icon: Icon.Compass },
    { id: 'contacts', label: 'Contacts', icon: Icon.Users },
    { id: 'settings', label: 'Settings', icon: Icon.Settings },
  ];
  return (
    <aside className="flex flex-col h-full text-cream/90" style={{ width: 232, background: '#1f1b16', flexShrink: 0 }}>
      <div className="px-6 pt-7 pb-8">
        <Wordmark size={26} />
      </div>
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {items.map(it => {
          const active = current === it.id;
          const IconCmp = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onNav(it.id)}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-colors duration-150"
              style={{
                color: active ? '#f3e2cd' : 'rgba(244,237,224,0.72)',
                background: active ? 'rgba(184,122,74,0.16)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(244,237,224,0.06)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <IconCmp size={17} />
              <span>{it.label}</span>
              {active && <span className="ml-auto w-1 h-4 rounded-full" style={{ background: '#b87a4a' }} />}
            </button>
          );
        })}
      </nav>
      <div className="px-3 pb-5 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(244,237,224,0.04)' }}>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#3d352c' }}>
            <img src={`https://i.pravatar.cc/80?u=warmly-user-liyang`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] leading-tight" style={{ color: '#f4ede0' }}>{user.fullName}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(244,237,224,0.48)' }}>{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------- Button ----------
function Btn({ variant = 'primary', size = 'md', children, icon: IconCmp, iconRight: IconRight, className = '', onClick, disabled, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 select-none focus-ring';
  const sizes = {
    sm: 'h-8 px-3 text-[12.5px] rounded-md',
    md: 'h-10 px-4 text-[13.5px] rounded-lg',
    lg: 'h-11 px-5 text-[14px] rounded-lg',
  };
  let variantStyles = {};
  if (variant === 'primary') {
    variantStyles = { background: '#b87a4a', color: 'white' };
  } else if (variant === 'secondary') {
    variantStyles = { background: '#ffffff', color: '#3d352c', border: '1px solid #d9cdb4' };
  } else if (variant === 'ghost') {
    variantStyles = { background: 'transparent', color: '#3d352c' };
  } else if (variant === 'dark') {
    variantStyles = { background: '#1f1b16', color: '#f4ede0' };
  } else if (variant === 'sienna-soft') {
    variantStyles = { background: '#f3e2cd', color: '#7a4a25' };
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${className}`}
      style={{ ...variantStyles, opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.96)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.filter = 'none'; }}
      {...rest}
    >
      {IconCmp && <IconCmp size={size === 'sm' ? 14 : 15} />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 14 : 15} />}
    </button>
  );
}

// ---------- Tier + Status badges ----------
function TierBadge({ tier }) {
  const styles = {
    Strong: { bg: '#dcebd9', fg: '#34553e', dot: '#5e8d6a' },
    Good: { bg: '#f3e2cd', fg: '#7a4a25', dot: '#b87a4a' },
    Adjacent: { bg: '#ece2d0', fg: '#6b5e4a', dot: '#8e8170' },
  };
  const s = styles[tier] || styles.Adjacent;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium" style={{ background: s.bg, color: s.fg }}>
      <span className="dot" style={{ background: s.dot }} />
      {tier}
    </span>
  );
}

function StatusBadge({ status, followUpDue }) {
  // New / Saved / Contacted / Met / Archived; followUpDue overrides to warning
  if (followUpDue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium" style={{ background: '#f6e7c5', color: '#7a521a' }}>
        <Icon.Alert size={11} />
        Follow-up due
      </span>
    );
  }
  const map = {
    New: { bg: '#ece2d0', fg: '#6b5e4a', dot: '#8e8170', label: 'New' },
    Saved: { bg: '#f3e2cd', fg: '#7a4a25', dot: '#b87a4a', label: 'Saved' },
    Contacted: { bg: '#f3e2cd', fg: '#7a4a25', dot: '#b87a4a', label: 'Contacted' },
    Met: { bg: '#dcebd9', fg: '#34553e', dot: '#5e8d6a', label: 'Met' },
    Drafted: { bg: '#f3e2cd', fg: '#7a4a25', dot: '#b87a4a', label: 'Drafted' },
    Archived: { bg: '#ece2d0', fg: '#8e8170', dot: '#8e8170', label: 'Archived' },
  };
  const s = map[status] || map.New;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium transition-colors duration-300" style={{ background: s.bg, color: s.fg }}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function InseadPill({ children }) {
  return (
    <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-medium" style={{ background: '#f3e2cd', color: '#7a4a25', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em' }}>
      {children}
    </span>
  );
}

// ---------- Inputs ----------
function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[12px] font-medium text-ink-2">{label}</label>}
      {children}
      {hint && <div className="text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', icon: IconCmp, className = '', ...rest }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {IconCmp && (
        <div className="absolute left-3 text-ink-4 pointer-events-none">
          <IconCmp size={15} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-white border rounded-lg text-[13.5px] text-ink-2 placeholder:text-ink-4 focus-ring transition-shadow"
        style={{ borderColor: '#d9cdb4', paddingLeft: IconCmp ? 36 : 12, paddingRight: 12 }}
        {...rest}
      />
    </div>
  );
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        className="w-full h-10 bg-white border rounded-lg text-[13.5px] text-ink-2 focus-ring appearance-none pl-3 pr-9"
        style={{ borderColor: '#d9cdb4' }}
      >
        {options.map(o => (
          typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3">
        <Icon.ChevronDown size={14} />
      </div>
    </div>
  );
}

function Radio({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange && onChange()}
      className="flex items-center gap-2.5 text-[13px] text-ink-2 py-1 text-left"
    >
      <span className={`radio-outer ${checked ? 'checked' : ''}`} />
      <span>{label}</span>
    </button>
  );
}

function Chip({ children, removable, onRemove, checked, onClick, variant = 'default' }) {
  let style = { background: '#ffffff', color: '#3d352c', border: '1px solid #d9cdb4' };
  if (variant === 'selected') style = { background: '#f3e2cd', color: '#7a4a25', border: '1px solid #b87a4a' };
  if (variant === 'add') style = { background: 'transparent', color: '#6b5e4a', border: '1px dashed #cdbf9f' };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium transition-all"
      style={style}
    >
      {checked && <Icon.Check size={12} />}
      <span>{children}</span>
      {removable && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}
          className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Icon.X size={12} />
        </span>
      )}
    </button>
  );
}

// ---------- Card ----------
function Card({ children, className = '', padding = 'p-6', interactive }) {
  return (
    <div
      className={`bg-white border rounded-2xl ${padding} ${interactive ? 'card-hover cursor-pointer' : ''} ${className}`}
      style={{ borderColor: '#e5d8be', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.04)' }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, className = '' }) {
  return <div className={`font-mono-tag text-ink-3 ${className}`}>{children}</div>;
}

// ---------- Picker (chip-trigger dropdown with searchable list) ----------
const CITY_OPTIONS = [
  'Paris', 'London', 'Singapore', 'NYC', 'Bay Area', 'Berlin', 'Dubai',
  'Amsterdam', 'Munich', 'Zurich', 'Hong Kong', 'Tokyo', 'Toronto',
  'Stockholm', 'Madrid', 'Milan', 'Dublin', 'Lisbon', 'Tel Aviv',
  'Bangalore', 'Shanghai', 'Sydney', 'Geneva', 'Brussels', 'Copenhagen',
];

const COUNTRY_OPTIONS = [
  'European Union (EU)', 'United Kingdom', 'United States', 'Switzerland',
  'Canada', 'Singapore', 'United Arab Emirates', 'China', 'Hong Kong',
  'India', 'Japan', 'Australia', 'Brazil', 'Germany', 'France',
  'Netherlands', 'Ireland', 'Sweden', 'Israel', 'Other',
];

function Picker({ options, selected = [], onPick, label = '+ add', width = 220, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const filtered = options.filter(o => o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium transition-all"
        style={{ background: open ? '#f3e2cd' : 'transparent', color: '#6b5e4a', border: '1px dashed #cdbf9f' }}
      >
        <Icon.Plus size={12} />
        <span>{label.replace(/^\+\s*/, '')}</span>
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1.5 rounded-xl bg-white shadow-pop overflow-hidden"
          style={{ width, border: '1px solid #e5d8be', [align === 'right' ? 'right' : 'left']: 0 }}
        >
          <div className="flex items-center gap-2 px-3 h-9 border-b" style={{ borderColor: '#efe6d4' }}>
            <span className="text-ink-3"><Icon.Search size={13} /></span>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-[12.5px] text-ink-2 focus:outline-none"
            />
          </div>
          <div className="max-h-[184px] overflow-y-auto scroll-area py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-ink-3">No matches</div>
            )}
            {filtered.map(o => {
              const sel = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onPick(o); setQ(''); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[12.5px] text-ink-2 text-left transition-colors picker-row"
                >
                  <span>{o}</span>
                  {sel && <span style={{ color: '#b87a4a' }}><Icon.Check size={13} /></span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Toast (controlled by App) ----------
const ToastContext = createContext(null);
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const tRef = useRef();
  const show = useCallback((msg, opts = {}) => {
    clearTimeout(tRef.current);
    setToast({ msg, ...opts, id: Date.now() });
    tRef.current = setTimeout(() => setToast(null), opts.duration || 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className="fixed bottom-6 right-6 z-50 toast-in">
          <div className="flex items-center gap-3 bg-ink text-cream pl-4 pr-5 py-3 rounded-xl shadow-pop" style={{ minWidth: 280, maxWidth: 420 }}>
            <span className="dot pulse-dot" style={{ background: '#b87a4a' }} />
            <div className="text-[13px] leading-snug">{toast.msg}</div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ---------- Avatar ----------
function Avatar({ src, size = 40, className = '' }) {
  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: '#ece2d0' }}
    >
      {src && <img src={src} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

// ---------- Sample illustrations for Home cards ----------
function HomeIllustration({ kind, size = 96 }) {
  // Simple iconographic placeholder. kind: 'pickup' | 'discover'
  if (kind === 'pickup') {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <circle cx="48" cy="48" r="42" fill="#f3e2cd" />
        <rect x="28" y="34" width="40" height="32" rx="4" fill="#fff" stroke="#b87a4a" strokeWidth="1.5" />
        <path d="M34 44h28M34 50h24M34 56h18" stroke="#b87a4a" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="68" cy="32" r="6" fill="#b87a4a" />
        <text x="68" y="35.5" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" fontFamily="Inter">3</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="42" fill="#dcebd9" />
      <circle cx="48" cy="48" r="22" stroke="#34553e" strokeWidth="1.5" fill="white" />
      <path d="m54 42-4 12-12 4 4-12 12-4z" fill="#5e8d6a" stroke="#34553e" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="48" cy="48" r="1.5" fill="#34553e" />
    </svg>
  );
}

window.Shared = {
  Wordmark, Sidebar, Btn, TierBadge, StatusBadge, InseadPill,
  Field, TextInput, Select, Radio, Chip, Card, SectionLabel, Picker,
  CITY_OPTIONS, COUNTRY_OPTIONS,
  ToastProvider, useToast, Avatar, HomeIllustration,
};
