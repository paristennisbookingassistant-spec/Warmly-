// Home screen, bilingual hero, two big visual action cards, momentum strip at the bottom

function HomeScreen({
  contacts,
  pendingCount,
  newLeadCount,
  onPickup,
  onDiscover,
  onOpenContact,
  firstTime,
  userFirstName,
  greeting = 'Hello'
}) {
  const showPickup = !firstTime && pendingCount > 0;

  // Saved today, last 24h
  const now = Date.now();
  const savedToday = (contacts || []).
  filter((c) => c.savedAt && now - c.savedAt < 24 * 60 * 60 * 1000).
  sort((a, b) => b.savedAt - a.savedAt);

  // Momentum mock counts, derived from contact data when present
  const momentum = computeMomentum(contacts || []);

  // Concrete next-step items, what makes pickup actionable (named, urgency-tagged)
  const nextSteps = computeNextSteps(contacts || []);

  // Split the discover funnel, pipeline waiting to be screened vs. fresh matches
  const toScreen = (contacts || []).filter((c) => c.status === 'Saved' && !c.drafts).length;
  const freshMatches = newLeadCount;

  return (
    <div className="min-h-full px-12 pt-12 pb-12 flex flex-col items-center" data-comment-anchor="d9e57888f5-div-26-5">
      {/* ----- Hero ----- */}
      <div className="text-center mb-10 fade-up">
        <h1 className="text-[42px] leading-[1.05] font-serif-i text-ink mb-2">
          {firstTime ? `Welcome, ${userFirstName}.` : `${greeting} ${userFirstName}.`}
        </h1>
        <p className="text-[16px] text-ink-3">
          {firstTime ? `Let's find your first networking targets.` : 'Where do you want to go today?'}
        </p>
      </div>

      {/* ----- Action cards ----- */}
      <div className={`w-full max-w-[960px] grid gap-6 ${showPickup ? 'grid-cols-2' : 'grid-cols-1 max-w-[480px]'}`}>
        {showPickup &&
        <PickupCard
          nextSteps={nextSteps}
          pendingCount={pendingCount}
          onClick={onPickup} />

        }
        <DiscoverCard
          firstTime={firstTime}
          toScreen={toScreen}
          freshMatches={freshMatches}
          onClick={onDiscover} />

      </div>

      {/* ----- Bottom strip ----- */}
      <div className="w-full max-w-[960px] mt-12 flex flex-col gap-6">
        {savedToday.length > 0 &&
        <SavedTodayStrip contacts={savedToday} onOpen={onOpenContact} />
        }

        <WeeklyDisciplineCard momentum={momentum} />

        <div className="text-center text-[11.5px] font-mono-tag text-ink-4" style={{ letterSpacing: '0.08em' }}>
          coach last searched · 9 minutes ago
        </div>
      </div>
    </div>);

}

// ============================================================================
// Pickup card, named next-step rows so the user sees EXACTLY what's waiting
// ============================================================================
function PickupCard({ nextSteps, pendingCount, onClick }) {
  const palette = { accent: '#b87a4a', soft: '#f3e2cd', ink: '#7a4a25', tint: 'rgba(184,122,74,0.10)' };
  // Keep 2 named items: one follow-up + one draft (mixed signal, not 2 of the same kind)
  const followUp = nextSteps.find((s) => s.kind === 'followUp');
  const draft = nextSteps.find((s) => s.kind === 'draft');
  const visible = [followUp, draft].filter(Boolean);
  // Fallback: if only one kind exists, fill from sorted order
  if (visible.length < 2) {
    for (const s of nextSteps) {
      if (!visible.includes(s)) visible.push(s);
      if (visible.length === 2) break;
    }
  }
  const overflow = Math.max(0, pendingCount - visible.length);
  const urgentCount = nextSteps.filter((s) => s.urgency === 'overdue' || s.urgency === 'today').length;

  return (
    <button
      onClick={onClick}
      className="group bg-white border rounded-3xl text-left card-hover fade-up flex flex-col overflow-hidden relative transition-all duration-200"
      style={{
        borderColor: '#e5d8be',
        boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)'
      }}
      onMouseEnter={(e) => {e.currentTarget.style.borderColor = palette.accent;e.currentTarget.style.boxShadow = `0 0 0 1px ${palette.accent} inset, 0 14px 32px ${palette.tint}`;}}
      onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#e5d8be';e.currentTarget.style.boxShadow = '0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)';}}>
      
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: palette.accent }} />

      {/* Header band */}
      <div
        className="px-8 pt-8 pb-6 relative overflow-hidden flex flex-col justify-end"
        style={{ background: 'radial-gradient(circle at 92% 18%, #fdf3e1 0%, #faecd2 70%)', minHeight: 196 }} data-comment-anchor="23322a94e4-div-110-7">
        
        <div
          className="absolute inset-0 opacity-[0.45] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(184,122,74,0.18) 1px, transparent 0)',
            backgroundSize: '18px 18px'
          }} />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-mono-tag mb-2" style={{ color: palette.accent }}>
              Inbox · in progress
            </div>
            <div className="font-serif-i text-ink leading-tight mb-2" style={{ fontSize: 30, letterSpacing: '-0.01em' }}>
              Pick up where you<br />left off
            </div>
            <div className="text-[13.5px] text-ink-2">
              {pendingCount} action{pendingCount === 1 ? '' : 's'} waiting
              {urgentCount > 0 && <> · <span style={{ color: '#b04a1f', fontWeight: 600 }}>{urgentCount} urgent</span></>}
            </div>
          </div>
          <PickupIllustration palette={palette} urgentCount={urgentCount} />
        </div>
      </div>

      {/* Next-step list, THE answer to "what am I picking up?" */}
      <div className="flex-1 flex flex-col">
        <div className="px-8 py-4 flex flex-col gap-2.5 flex-1">
          {visible.map((step, i) =>
          <NextStepRow key={i} step={step} palette={palette} />
          )}
          {overflow > 0 &&
          <div className="text-[11.5px] text-ink-4 pl-7">+ {overflow} more in your queue</div>
          }
        </div>

        {/* CTA footer */}
        <div className="px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: '#ece2d0' }}>
          <span className="text-[11.5px] text-ink-3">Resume where you stopped</span>
          <span
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-medium transition-all group-hover:scale-[1.03]"
            style={{ background: palette.accent, color: '#ffffff' }}>
            
            Continue
            <Icon.ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>);

}

function NextStepRow({ step, palette }) {
  const VerbIcon = step.kind === 'draft' ? Icon.Edit : step.kind === 'followUp' ? Icon.Send : Icon.Mail;
  const urgencyStyle =
  step.urgency === 'overdue' ? { bg: '#fde8e0', fg: '#a8421a', label: step.urgencyLabel || 'overdue' } :
  step.urgency === 'today' ? { bg: '#fff4e6', fg: '#b04a1f', label: 'Due today' } :
  null;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: '#fbf6ec' }}>
      
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#ffffff', color: palette.accent, border: `1px solid ${palette.soft}` }}>
        
        <VerbIcon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-tight truncate">
          <span className="font-medium">{step.verb}</span>
          <span className="text-ink-2"> · {step.target}</span>
        </div>
        <div className="text-[11px] text-ink-4 mt-0.5 truncate">{step.context}</div>
      </div>
      {urgencyStyle &&
      <span
        className="text-[10px] font-semibold px-2 h-5 rounded-full inline-flex items-center flex-shrink-0 uppercase tracking-wide"
        style={{ background: urgencyStyle.bg, color: urgencyStyle.fg }}>
        
          {urgencyStyle.label}
        </span>
      }
    </div>);

}

// ============================================================================
// Pickup illustration, stack of letters/drafts, matches the discover radar
// in size and visual weight so the two card headers feel consistent.
// ============================================================================
function PickupIllustration({ palette, urgentCount }) {
  return (
    <svg width="120" height="100" viewBox="0 0 140 120" className="flex-shrink-0">
      {/* Back card, tilted left */}
      <g transform="translate(28 18) rotate(-7 40 30)">
        <rect width="82" height="60" rx="6" fill="#ffffff" stroke={palette.accent} strokeOpacity="0.32" />
        <rect x="11" y="14" width="44" height="3" rx="1.5" fill={palette.accent} opacity="0.22" />
        <rect x="11" y="22" width="58" height="3" rx="1.5" fill={palette.accent} opacity="0.16" />
        <rect x="11" y="30" width="34" height="3" rx="1.5" fill={palette.accent} opacity="0.16" />
      </g>
      {/* Middle card */}
      <g transform="translate(18 28) rotate(3 40 30)">
        <rect width="82" height="60" rx="6" fill="#ffffff" stroke={palette.accent} strokeOpacity="0.42" />
        <rect x="11" y="14" width="38" height="3" rx="1.5" fill={palette.accent} opacity="0.32" />
        <rect x="11" y="22" width="60" height="3" rx="1.5" fill={palette.accent} opacity="0.2" />
        <rect x="11" y="30" width="44" height="3" rx="1.5" fill={palette.accent} opacity="0.2" />
      </g>
      {/* Top card with active cursor */}
      <g transform="translate(12 42)">
        <rect width="94" height="66" rx="7" fill="#ffffff" stroke={palette.accent} strokeWidth="1.5" />
        <rect x="12" y="14" width="42" height="4" rx="2" fill={palette.accent} />
        <rect x="12" y="25" width="70" height="3" rx="1.5" fill={palette.accent} opacity="0.45" />
        <rect x="12" y="33" width="58" height="3" rx="1.5" fill={palette.accent} opacity="0.45" />
        <rect x="12" y="41" width="38" height="3" rx="1.5" fill={palette.accent} opacity="0.45" />
        {/* Blinking cursor */}
        <rect x="52" y="39" width="1.5" height="8" fill={palette.accent}>
          <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
        </rect>
      </g>
      {/* Urgent count badge in top-right corner of the stack */}
      {urgentCount > 0 &&
      <>
          <circle cx="122" cy="22" r="10" fill="#d6622d" />
          <circle cx="122" cy="22" r="10" fill="none" stroke="#ffffff" strokeWidth="1.5">
            <animate attributeName="r" values="10;14;10" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x="122" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="JetBrains Mono">{urgentCount}</text>
        </>
      }
    </svg>);

}

// ============================================================================
// Discover card, split funnel: pipeline-to-screen vs. fresh matches
// ============================================================================
function DiscoverCard({ firstTime, toScreen, freshMatches, onClick }) {
  const palette = { accent: '#5e8d6a', soft: '#dce8d8', ink: '#34553e', tint: 'rgba(94,141,106,0.10)' };

  return (
    <button
      onClick={onClick}
      className="group bg-white border rounded-3xl text-left card-hover fade-up flex flex-col overflow-hidden relative transition-all duration-200"
      style={{
        borderColor: '#e5d8be',
        boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)'
      }}
      onMouseEnter={(e) => {e.currentTarget.style.borderColor = palette.accent;e.currentTarget.style.boxShadow = `0 0 0 1px ${palette.accent} inset, 0 14px 32px ${palette.tint}`;}}
      onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#e5d8be';e.currentTarget.style.boxShadow = '0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)';}}>
      
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: palette.accent }} />

      {/* Header band with illustration */}
      <div
        className="px-8 pt-8 pb-6 relative overflow-hidden flex flex-col justify-end"
        style={{ background: 'radial-gradient(circle at 78% 22%, #f0f6ec 0%, #e3edde 70%)', minHeight: 196 }} data-comment-anchor="d77dad213f-div-270-7">
        
        <div
          className="absolute inset-0 opacity-[0.45] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(94,141,106,0.18) 1px, transparent 0)',
            backgroundSize: '18px 18px'
          }} />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-mono-tag mb-2" style={{ color: palette.accent }}>
              Coach · discovery feed
            </div>
            <div className="font-serif-i text-ink leading-tight mb-2" style={{ fontSize: 30, letterSpacing: '-0.01em' }}>
              {firstTime ? <>Discover new<br />contacts</> : <>Keep building<br />your pipeline</>}
            </div>
            <div className="text-[13.5px] text-ink-2">
              {firstTime ? 'INSEAD alumni at your target companies' : 'Coach searched while you were away'}
            </div>
          </div>
          <BigActionIllustration kind="discover" palette={palette} />
        </div>
      </div>

      {/* Split funnel, two distinct buckets the user needs to understand */}
      <div className="flex-1 flex flex-col">
        <div className="px-8 py-4 flex-1 grid grid-cols-2 gap-3">
          <FunnelRow
            icon={Icon.Users}
            value={firstTime ? '47' : toScreen}
            label={firstTime ? 'in your target scope' : 'in your screening queue'}
            sub={firstTime ? 'INSEAD alumni indexed' : 'saved, waiting on a yes/no'}
            palette={palette} />
          
          <FunnelRow
            icon={Icon.Sparkles}
            value={firstTime ? '12.4k' : freshMatches}
            label={firstTime ? 'alumni network total' : 'fresh matches from coach'}
            sub={firstTime ? 'across INSEAD directory' : 'never seen, ready to review'}
            palette={palette}
            highlight={!firstTime && freshMatches > 0} />
          
        </div>

        {/* CTA footer */}
        <div className="px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: '#ece2d0' }}>
          <span className="text-[11.5px] text-ink-3">
            {firstTime ? 'First push from your coach' : 'Swipe through queue · review new matches'}
          </span>
          <span
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-medium transition-all group-hover:scale-[1.03]"
            style={{ background: palette.accent, color: '#ffffff' }}>
            
            {firstTime ? 'Start discovery' : 'Open discovery'}
            <Icon.ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>);

}

function FunnelRow({ icon: I, value, label, sub, palette, highlight }) {
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-xl relative"
      style={{
        background: highlight ? '#eef5ea' : '#fbf6ec',
        border: highlight ? `1px solid ${palette.soft}` : '1px solid transparent'
      }}>
      
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#ffffff', color: palette.accent, border: `1px solid ${palette.soft}` }}>
          
          {I && <I size={11} />}
        </div>
        <span className="font-serif-i leading-none text-ink" style={{ fontSize: 24 }}>{value}</span>
        {highlight &&
        <span className="dot pulse-dot ml-auto" style={{ background: palette.accent }} />
        }
      </div>
      <div className="text-[11.5px] font-medium text-ink-2 leading-tight">{label}</div>
      <div className="text-[10.5px] text-ink-4 leading-tight">{sub}</div>
    </div>);

}

// ============================================================================
// Big-action illustration, bespoke SVG per kind
// ============================================================================
function BigActionIllustration({ kind, palette }) {
  return (
    <svg width="120" height="100" viewBox="0 0 140 120" className="flex-shrink-0">
      <circle cx="70" cy="60" r="50" fill="none" stroke={palette.accent} strokeOpacity="0.18" />
      <circle cx="70" cy="60" r="34" fill="none" stroke={palette.accent} strokeOpacity="0.28" />
      <circle cx="70" cy="60" r="18" fill="none" stroke={palette.accent} strokeOpacity="0.4" />
      <circle cx="70" cy="60" r="9" fill="#1f1b16" />
      <circle cx="70" cy="60" r="9" fill="none" stroke="#ffffff" strokeWidth="2" />
      <g>
        <line x1="70" y1="60" x2="42" y2="32" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="42" cy="32" r="8" fill={palette.accent} />
      </g>
      <g>
        <line x1="70" y1="60" x2="108" y2="42" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="108" cy="42" r="6" fill={palette.accent} />
      </g>
      <g>
        <line x1="70" y1="60" x2="95" y2="92" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="95" cy="92" r="7" fill={palette.accent} />
      </g>
      <g>
        <line x1="70" y1="60" x2="32" y2="78" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="32" cy="78" r="5" fill={palette.accent} opacity="0.7" />
      </g>
      <circle cx="70" cy="60" r="50" fill="none" stroke={palette.accent} strokeWidth="1.5" opacity="0.6">
        <animate attributeName="r" values="40;58;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>);

}

// ============================================================================
// Saved today, small carousel of saved contact avatars
// ============================================================================
function SavedTodayStrip({ contacts, onOpen }) {
  return (
    <div
      className="bg-white border rounded-2xl px-6 py-5"
      style={{ borderColor: '#e5d8be', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)' }}>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="font-mono-tag text-ink-4">Saved today</div>
        <span className="text-[11.5px] font-medium px-2 h-[20px] rounded-full inline-flex items-center" style={{ background: '#f3e2cd', color: '#7a4a25', fontFamily: '"JetBrains Mono", monospace' }}>
          {contacts.length}
        </span>
        <div className="flex-1 h-px" style={{ background: '#ece2d0' }} />
      </div>
      <div className="flex items-center gap-3 overflow-x-auto scroll-area pb-1">
        {contacts.map((c) =>
        <button
          key={c.id}
          onClick={() => onOpen && onOpen(c.id)}
          className="flex items-center gap-3 flex-shrink-0 px-3 py-2 rounded-xl border hover:bg-cream/30 transition-colors text-left"
          style={{ borderColor: '#e5d8be', minWidth: 240 }}>
          
            <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-ink truncate">{c.name}</div>
              <div className="text-[11.5px] text-ink-3 truncate">{c.role} · {c.company}</div>
            </div>
            <div
            className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
            style={{ background: c.source === 'linkedin' ? '#dde6ee' : '#f3e2cd', color: c.source === 'linkedin' ? '#2f4d63' : '#7a4a25' }}
            title={c.source === 'linkedin' ? 'LinkedIn channel' : 'INSEAD directory'}>
            
              {c.source === 'linkedin' ? <Icon.Network size={10} /> : <Icon.Book size={10} />}
            </div>
          </button>
        )}
      </div>
    </div>);

}

// ============================================================================
// Weekly Discipline card, coach-style status check: weekly goal, progress,
// day pills, then secondary stats below.
// ============================================================================
function WeeklyDisciplineCard({ momentum }) {
  const goal = 5;
  const sentThisWeek = Math.min(momentum.sent, goal + 2);
  const progress = Math.min(sentThisWeek / goal, 1);
  const onTrack = progress >= 0.6;
  const dayIdx = new Date().getDay();
  const week = [
  { d: 'M', done: 1 },
  { d: 'T', done: 1 },
  { d: 'W', done: 0 },
  { d: 'T', done: 1 },
  { d: 'F', done: 0 },
  { d: 'S', done: 0 },
  { d: 'S', done: 0 }];

  const todayIdx = dayIdx === 0 ? 6 : dayIdx - 1;

  const tiles = [
  { label: 'Saved this week', value: momentum.savedThisWeek, accent: '#b87a4a' },
  { label: 'Drafts sent', value: momentum.sent, accent: '#5e8d6a' },
  { label: 'Meetings logged', value: momentum.meetings, accent: '#4a6f87' },
  { label: 'Reply rate', value: `${momentum.replyRate}%`, accent: '#7a4a25' }];


  return (
    <div
      className="bg-white border rounded-2xl overflow-hidden"
      style={{ borderColor: '#e5d8be', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)' }}>
      
      {/* Top: weekly goal hero */}
      <div className="px-6 pt-5 pb-5 border-b" style={{ borderColor: '#ece2d0', background: '#fbf6ec' }}>
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon.Calendar size={12} className="text-ink-3" />
              <span className="font-mono-tag text-ink-4">Your week · discipline check</span>
            </div>
            <div className="text-[20px] font-serif-i text-ink leading-tight">
              {sentThisWeek >= goal ?
              <>You hit your weekly goal. <span className="text-ink-3">Keep the streak alive.</span></> :
              sentThisWeek === 0 ?
              <>Nothing sent yet this week. <span className="text-ink-3">Start with one.</span></> :

              <>
                  <span className="text-ink">{sentThisWeek} of {goal}</span>
                  <span className="text-ink-3"> outreach sent this week</span>
                </>
              }
            </div>
            <div className="text-[12px] text-ink-3 mt-1">
              {onTrack ? 'On track. ' : 'Behind pace. '}
              Your coach checks in every Friday.
            </div>
          </div>

          {/* Day pills, week-at-a-glance */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {week.map((day, i) => {
              const isToday = i === todayIdx;
              const isPast = i < todayIdx;
              const isDone = day.done > 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold"
                    style={{
                      background: isDone ? '#5e8d6a' : isToday ? '#ffffff' : isPast ? '#f1e7d0' : '#f7eed9',
                      color: isDone ? '#ffffff' : isToday ? '#1f1b16' : '#9a8a72',
                      border: isToday ? '1.5px solid #1f1b16' : '1px solid #e5d8be'
                    }}>
                    
                    {isDone ? <Icon.Check size={11} /> : day.d}
                  </div>
                </div>);

            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#ece2d0' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: onTrack ? '#5e8d6a' : '#d6622d'
              }} />
            
          </div>
          <span className="text-[11.5px] font-mono-tag text-ink-3 flex-shrink-0">
            {sentThisWeek} / {goal}
          </span>
        </div>
      </div>

      {/* Secondary stats, kept for context but smaller */}
      <div className="grid grid-cols-4">
        {tiles.map((t, i) =>
        <div
          key={t.label}
          className="px-5 py-4 flex flex-col gap-1"
          style={{ borderLeft: i === 0 ? 'none' : '1px solid #ece2d0' }}>
          
            <span className="font-serif-i leading-none" style={{ fontSize: 24, color: t.accent }}>{t.value}</span>
            <span className="text-[11px] text-ink-3 mt-1">{t.label}</span>
          </div>
        )}
      </div>
    </div>);

}

function computeMomentum(contacts) {
  const sent = contacts.filter((c) => c.status === 'Contacted' || c.status === 'Met').length;
  const meetings = contacts.reduce((s, c) => s + (c.meetings || 0) + (c.meetingEntries?.length || 0), 0);
  const drafts = contacts.reduce((s, c) => s + (c.drafts || 0), 0);
  const followUps = contacts.filter((c) => c.followUpDue).length;
  const savedThisWeek = contacts.filter((c) => c.savedAt && Date.now() - c.savedAt < 7 * 24 * 60 * 60 * 1000).length ||
  contacts.filter((c) => c.status !== 'New' && c.status !== 'Archived').length;
  const replyRate = sent ? Math.min(72, 40 + sent * 6) : 0;
  return { drafts, followUps, sent, meetings, savedThisWeek, replyRate };
}

function computeNextSteps(contacts) {
  const steps = [];
  contacts.forEach((c) => {
    if (c.drafts > 0) {
      steps.push({
        kind: 'draft',
        verb: 'Sign off draft',
        target: c.name,
        context: `${c.role} · ${c.company}`,
        urgency: c.id === 'anna' ? 'today' : null,
        urgencyLabel: null,
        weight: c.id === 'anna' ? 100 : 80
      });
    }
  });
  contacts.forEach((c) => {
    if (c.followUpDue) {
      const weeksSince = parseInt((c.lastContact || '').match(/(\d+)w/)?.[1] || '0', 10);
      const overdue = weeksSince >= 3;
      steps.push({
        kind: 'followUp',
        verb: 'Follow up with',
        target: c.name,
        context: `Last contact ${c.lastContactLabel || c.lastContact}`,
        urgency: overdue ? 'overdue' : null,
        urgencyLabel: overdue ? `${weeksSince}w overdue` : null,
        weight: overdue ? 90 : 50
      });
    }
  });
  return steps.sort((a, b) => b.weight - a.weight);
}

window.HomeScreen = HomeScreen;