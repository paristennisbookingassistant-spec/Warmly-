// Discover · Tinder view, unified workspace, fills viewport, no scroll
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ Top strip: ← Back   ⊙ Channel · live   • queue · saved · skip   │  ← chrome
//   ├──────────────────────────────────────┬──────────────────────────┤
//   │                                      │                          │
//   │  [Card stack centered]               │  Refine with your coach  │
//   │                                      │  · messages              │
//   │  [Skip]  [Save]                      │  · suggestions           │
//   │                                      │  · composer              │
//   │                                      │                          │
//   └──────────────────────────────────────┴──────────────────────────┘

function TinderView({ channel, user, deck, onBack, onSaveLead, onOpenContact }) {
  const c = window.DiscoverShared.CH[channel];
  const [idx, setIdx] = useState(0);
  const [savedIds, setSavedIds] = useState([]);
  const [skippedIds, setSkippedIds] = useState([]);
  const [swipe, setSwipe] = useState(null); // {dir: 'left'|'right'}
  const [chat, setChat] = useState(() => seedChat(channel, user));
  const [chatTyping, setChatTyping] = useState(false);
  const [searchHint, setSearchHint] = useState(null);

  const current = deck[idx];
  const remaining = deck.length - idx;
  const done = idx >= deck.length;

  const advance = () => {setSwipe(null);setIdx((i) => i + 1);};

  const handleSkip = () => {
    if (!current || swipe) return;
    setSkippedIds((s) => [...s, current.id]);
    setSwipe({ dir: 'left' });
    setTimeout(advance, 280);
  };

  const handleSave = () => {
    if (!current || swipe) return;
    setSavedIds((s) => [...s, current.id]);
    onSaveLead && onSaveLead({ ...current, source: channel === 'cv' ? 'cv-book' : 'linkedin' });
    setSwipe({ dir: 'right' });
    setTimeout(advance, 280);
  };

  const handleSendChat = (text) => {
    if (!text.trim()) return;
    setChat((prev) => [...prev, { role: 'user', text }]);
    setChatTyping(true);
    setTimeout(() => {
      const { reply, hint } = generateAgentReply(text, channel);
      setChat((prev) => [...prev, { role: 'agent', text: reply }]);
      setChatTyping(false);
      if (hint) setSearchHint({ ...hint, idx });
    }, 900);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      {/* ===== Top strip, minimal chrome ===== */}
      <TopStrip
        channel={channel}
        onBack={onBack} />
      

      {/* ===== Workspace ===== */}
      <div
        className="flex-1 mt-4 bg-white border rounded-3xl overflow-hidden flex min-h-0"
        style={{
          borderColor: '#e5d8be',
          boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 12px 32px rgba(31,27,22,0.06)'
        }}>
        
        {/* ----- LEFT: card stage ----- */}
        <div
          className="flex-1 flex flex-col relative min-w-0"
          style={{
            background: channel === 'cv' ?
            'radial-gradient(circle at 50% 40%, #fdf8ec 0%, #faf2e0 75%)' :
            'radial-gradient(circle at 50% 40%, #f4f8fc 0%, #ecf1f6 75%)'
          }} data-comment-anchor="ac82719dd5-div-79-9">
          
          {/* subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: channel === 'cv' ?
              'radial-gradient(circle at 1px 1px, rgba(184,122,74,0.18) 1px, transparent 0)' :
              'radial-gradient(circle at 1px 1px, rgba(74,111,135,0.20) 1px, transparent 0)',
              backgroundSize: '22px 22px'
            }} />
          

          {/* Queue banner, inside the card stage quadrant */}
          <QueueBanner
            channel={channel}
            deck={deck}
            idx={idx}
            savedIds={savedIds}
            skippedIds={skippedIds} />

          {/* Card stack + action buttons, centered in remaining space */}
          <div className="flex-1 flex flex-col items-center justify-center px-10 pb-8 relative z-10 min-h-0">
            {done ?
            <EmptyDeck channel={channel} savedIds={savedIds} onBack={onBack} /> :

            <>
                <CardStack
                deck={deck}
                idx={idx}
                channel={channel}
                swipe={swipe}
                searchHint={searchHint}
                onOpenFull={() => onOpenContact && onOpenContact(current.id)} />
              

                <div className="flex items-center gap-5 mt-7">
                  <SwipeBtn variant="skip" onClick={handleSkip} label="Skip" hint="←" />
                  <SwipeBtn variant="save" channel={channel} onClick={handleSave} label="Save" hint="→" />
                </div>
              </>
            }
          </div>
        </div>

        {/* ----- RIGHT: chat panel ----- */}
        <ChatSidebar
          channel={channel}
          messages={chat}
          typing={chatTyping}
          onSend={handleSendChat} />
        
      </div>
    </div>);

}

// ============================================================================
// Top strip, minimal: just back button + channel chip
// ============================================================================
function TopStrip({ channel, onBack }) {
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors flex-shrink-0">
        <Icon.ArrowLeft size={14} />
        Back to doors
      </button>

      <div className="w-px h-6" style={{ background: '#d9cdb4' }} />

      <ChannelChip channel={channel} />

      <div className="flex-1" />

      <div className="text-[11.5px] text-ink-4 hidden md:block">
        Tip: chat with your coach on the right to refine the queue.
      </div>
    </div>);

}

// ============================================================================
// Queue banner, sits inside the card stage quadrant, above the card stack
// ============================================================================
function QueueBanner({ channel, deck, idx, savedIds, skippedIds }) {
  const c = window.DiscoverShared.CH[channel];
  const total = deck.length;
  const remaining = total - idx;

  return (
    <div
      className="relative z-10 px-7 border-b flex items-center gap-5 flex-shrink-0"
      style={{ borderColor: channel === 'cv' ? 'rgba(184,122,74,0.18)' : 'rgba(74,111,135,0.20)', height: 84 }}>

      {/* Big counter */}
      <div className="inline-flex items-baseline gap-2 flex-shrink-0">
        <span className="font-serif-i text-ink leading-none" style={{ fontSize: 36 }}>{remaining}</span>
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-ink-2 leading-tight">
            {channel === 'cv' ? 'alumni' : 'leads'}
          </span>
          <span className="text-[11px] text-ink-3 leading-tight">left to screen</span>
        </div>
      </div>

      <div className="w-px h-10" style={{ background: channel === 'cv' ? 'rgba(184,122,74,0.22)' : 'rgba(74,111,135,0.24)' }} />

      {/* Mini-avatar row */}
      <div className="flex-1 min-w-0">
        <div className="font-mono-tag mb-1.5" style={{ fontSize: 9, color: c.accent }}>Queue</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {deck.map((p, i) => {
            const isSaved = savedIds.includes(p.id);
            const isSkipped = skippedIds.includes(p.id);
            const isCurrent = i === idx;
            let style = {};
            if (isSaved) style = { background: c.accent, border: `2px solid ${c.accent}` };
            else if (isSkipped) style = { background: '#cdbf9f', border: '2px solid #cdbf9f', opacity: 0.55 };
            else if (isCurrent) style = { background: '#ffffff', border: `2px solid ${c.accent}`, boxShadow: `0 0 0 3px ${c.tint}` };
            else style = { background: '#ffffff', border: '2px solid #d9cdb4' };

            return (
              <div
                key={p.id}
                className="rounded-full overflow-hidden flex-shrink-0 transition-all duration-300"
                style={{ width: isCurrent ? 30 : 24, height: isCurrent ? 30 : 24, ...style }}
                title={p.name}>
                <img
                  src={p.avatar}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                  style={{ opacity: isSkipped ? 0.5 : 1 }} />
              </div>);
          })}
        </div>
      </div>

      <div className="w-px h-10" style={{ background: channel === 'cv' ? 'rgba(184,122,74,0.22)' : 'rgba(74,111,135,0.24)' }} />

      {/* Saved / skipped */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <div className="inline-flex items-center gap-1.5 text-[12.5px]">
          <Icon.HeartFill size={12} style={{ color: c.accent }} />
          <span className="text-ink-3"><strong className="text-ink">{savedIds.length}</strong> saved</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[12.5px]">
          <Icon.X size={12} className="text-ink-4" />
          <span className="text-ink-3"><strong className="text-ink-2">{skippedIds.length}</strong> skipped</span>
        </div>
      </div>
    </div>);

}

function ChannelChip({ channel }) {
  const c = window.DiscoverShared.CH[channel];
  return (
    <div className="inline-flex items-center gap-2 px-2.5 h-8 rounded-full" style={{ background: c.soft }}>
      {channel === 'cv' ?
      <img src="assets/insead-logo.png" alt="INSEAD" className="h-4 w-auto object-contain" /> :
      <img src="assets/linkedin-logo.png" alt="LinkedIn" className="h-3 w-auto object-contain" />}
      <span className="text-[12px] font-medium" style={{ color: c.ink }}>{c.label}</span>
      <span className="dot pulse-dot" style={{ background: '#5e8d6a' }} />
      <span className="text-[11px] text-ink-3">live</span>
    </div>);

}

// ============================================================================
// Card stack, show up to 3 cards behind current, progressively blurred
// ============================================================================
function CardStack({ deck, idx, channel, swipe, searchHint, onOpenFull }) {
  const cards = [];
  for (let d = 3; d >= 0; d--) {
    const card = deck[idx + d];
    if (!card) continue;
    cards.push(
      <ProfileCard
        key={card.id}
        profile={card}
        channel={channel}
        depth={d}
        swipe={d === 0 ? swipe : null}
        searchHint={d === 0 && searchHint && searchHint.idx === idx ? searchHint : null}
        onOpenFull={d === 0 ? onOpenFull : null} />

    );
  }
  return (
    <div className="relative w-full max-w-[460px] z-10" style={{ height: 540 }}>
      {cards}
    </div>);

}

// ============================================================================
// Profile Card
// ============================================================================
function ProfileCard({ profile: p, channel, depth = 0, swipe, searchHint, onOpenFull }) {
  const { Avatar, TierBadge, InseadPill } = Shared;
  const c = window.DiscoverShared.CH[channel];

  // Stack the next cards UP and behind so the user can SEE there's a queue waiting.
  // Slight scale-down + upward offset = classic deck-of-papers; cream tint shades them back.
  // Math: scale-down centers the card, so translateY must be larger than the shrink-margin
  // for the top edge to actually peek above the front card.
  const depthStyles = [
  {},
  { transform: 'scale(0.955) translateY(-24px)', filter: 'saturate(0.85) brightness(0.985)', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 10px 22px rgba(31,27,22,0.07)', background: '#faf3e6' },
  { transform: 'scale(0.91) translateY(-46px)', filter: 'saturate(0.7) brightness(0.97)', boxShadow: '0 1px 0 rgba(31,27,22,0.03), 0 6px 14px rgba(31,27,22,0.05)', background: '#f4ecdb' },
  { transform: 'scale(0.865) translateY(-66px)', filter: 'saturate(0.55) brightness(0.955)', opacity: 0.55, boxShadow: '0 1px 0 rgba(31,27,22,0.02), 0 3px 10px rgba(31,27,22,0.03)', background: '#efe6d0' }];

  let style = {
    borderColor: '#e5d8be',
    boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 18px 44px rgba(31,27,22,0.12)',
    transition: 'transform 280ms cubic-bezier(.2,.7,.3,1.2), opacity 280ms ease, filter 200ms ease, box-shadow 200ms ease',
    ...depthStyles[depth],
    zIndex: 10 - depth
  };
  if (swipe?.dir === 'left') {
    style.transform = 'translateX(-130%) rotate(-9deg)';
    style.opacity = 0;
  } else if (swipe?.dir === 'right') {
    style.transform = 'translateX(130%) rotate(9deg)';
    style.opacity = 0;
  }

  const interactive = depth === 0;

  return (
    <div
      className="absolute inset-0 bg-white border rounded-3xl overflow-hidden flex flex-col"
      style={style}>
      
      {/* Source ribbon */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 border-b flex-shrink-0"
        style={{ background: c.soft, borderColor: `${c.accent}33` }}>
        
        {channel === 'linkedin' ?
        <>
            <img src="assets/linkedin-logo.png" alt="LinkedIn" className="h-3 w-auto object-contain" />
            <span className="text-ink-4">·</span>
            <img src={p.via.avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
            <div className="text-[11.5px] leading-tight flex-1 min-w-0 truncate" style={{ color: c.ink }}>
              via <span className="font-semibold">{p.via.name}</span>
              <span className="text-ink-4"> · {p.via.mutualCount} mutual</span>
            </div>
            <span className="text-[10px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md" style={{ background: '#ffffff', color: c.ink, fontFamily: '"JetBrains Mono", monospace' }}>{p.via.degree}</span>
          </> :

        <>
            <img src="assets/insead-logo.png" alt="INSEAD" className="h-4 w-auto object-contain" />
            <span className="text-ink-4">·</span>
            <Icon.Book size={12} style={{ color: c.accent }} />
            <div className="text-[11.5px] leading-tight flex-1" style={{ color: c.ink }}>
              <span className="font-semibold">INSEAD CV book</span> · indexed alumnus
            </div>
            <span className="text-[10px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md" style={{ background: '#ffffff', color: c.ink, fontFamily: '"JetBrains Mono", monospace' }}>1st</span>
          </>
        }
      </div>

      {/* Identity */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-start gap-4">
          <Avatar src={p.avatar} size={68} />
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-[20px] font-serif-i text-ink leading-tight">{p.name}</div>
            <div className="text-[13.5px] text-ink-2 mt-1 truncate">{p.role}</div>
            <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">
              {p.company} · <span className="inline-flex items-baseline gap-1"><Icon.MapPin size={10} className="translate-y-[1px]" /> {p.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <InseadPill>{p.inseadShort}</InseadPill>
          <TierBadge tier={p.tier} />
          {searchHint &&
          <span
            className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-medium"
            style={{ background: '#f3e2cd', color: '#7a4a25' }}>
            
              <Icon.Sparkles size={10} />
              {searchHint.label}
            </span>
          }
        </div>
      </div>

      {/* Rationale */}
      <div className="px-6 py-2 flex-1 overflow-hidden">
        <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>Why I&apos;m pushing them</div>
        <p className="text-[13px] text-ink-2 leading-relaxed">{p.rationale}</p>
      </div>

      {/* About */}
      <div className="px-6 pb-3">
        <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>About</div>
        <ul className="flex flex-col gap-1">
          {p.about.map((a, i) =>
          <li key={i} className="text-[12.5px] text-ink-2 flex items-baseline gap-2.5">
              <span className="dot" style={{ background: c.accent }} />
              <span>{a}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2.5 border-t flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderColor: '#ece2d0', background: '#fcf8ee' }}>
        
        {p.linkedinUrl ?
        <a
          href={p.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
          style={{ background: '#ffffff', color: '#0A66C2', border: '1px solid #d9cdb4', pointerEvents: interactive ? 'auto' : 'none' }}
          onMouseEnter={(e) => {e.currentTarget.style.background = '#f0f6fc';e.currentTarget.style.borderColor = '#0A66C2';}}
          onMouseLeave={(e) => {e.currentTarget.style.background = '#ffffff';e.currentTarget.style.borderColor = '#d9cdb4';}}>
          
            <img src="assets/linkedin-logo.png" alt="" className="h-2.5 w-auto object-contain" />
            View on LinkedIn
            <Icon.ArrowRight size={11} />
          </a> :
        <span />}

        <button
          onClick={onOpenFull}
          disabled={!interactive}
          className="text-[12px] text-ink-3 hover:text-ink inline-flex items-center gap-1 transition-colors">
          
          Full profile
          <Icon.ChevronRight size={12} />
        </button>
      </div>
    </div>);

}

// ============================================================================
// Save / Skip buttons
// ============================================================================
function SwipeBtn({ variant, channel, onClick, label, hint }) {
  const isSave = variant === 'save';
  const c = channel ? window.DiscoverShared.CH[channel] : null;
  const styles = isSave ?
  { background: c.accent, color: '#ffffff', border: 'none' } :
  { background: '#ffffff', color: '#6b5e4a', border: '1px solid #d9cdb4' };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.04] focus-ring"
      style={{
        ...styles,
        width: 168,
        height: 52,
        borderRadius: 999,
        boxShadow: isSave ? `0 8px 22px ${c.tint}` : '0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.04)'
      }}>
      
      {isSave ? <Icon.HeartFill size={17} /> : <Icon.X size={17} />}
      <span className="text-[14px] font-medium">{label}</span>
      <span className="text-[11px] opacity-60 ml-1">{hint}</span>
    </button>);

}

// ============================================================================
// Empty deck
// ============================================================================
function EmptyDeck({ channel, savedIds, onBack }) {
  const c = window.DiscoverShared.CH[channel];
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 max-w-[440px] relative z-10">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: c.soft, color: c.accent }}>
        <Icon.Check size={28} />
      </div>
      <div className="text-[24px] font-serif-i text-ink mb-2">You&apos;ve seen the queue.</div>
      <p className="text-[14px] text-ink-3 mb-7 leading-relaxed">
        {savedIds.length > 0 ?
        `${savedIds.length} new contact${savedIds.length > 1 ? 's' : ''} saved. Ask the coach in chat to push more profiles tailored to a specific angle, or head back to the doors.` :
        'No saves this round. Tell the coach in chat to refine, try "find someone with go-to-market experience" or "anyone hiring sponsorship-friendly PMs."'}
      </p>
      <Shared.Btn onClick={onBack} icon={Icon.ArrowLeft} variant="secondary">Back to doors</Shared.Btn>
    </div>);

}

// ============================================================================
// Chat sidebar, right column of workspace, shares border with left
// ============================================================================
function ChatSidebar({ channel, messages, typing, onSend }) {
  const c = window.DiscoverShared.CH[channel];
  const [val, setVal] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!val.trim()) return;
    onSend(val);
    setVal('');
  };

  const suggestions = channel === 'cv' ?
  [
  'Find PMs with GTM experience',
  'Anyone hiring sponsorship-friendly',
  'Only Paris, drop Berlin'] :

  [
  'Show me VC connections only',
  'Filter to Paris-based',
  'Anyone with hiring authority'];


  return (
    <aside
      className="border-l flex flex-col min-h-0 flex-shrink-0"
      style={{ borderColor: '#e5d8be', background: '#fdfaf3', width: 380 }}>
      
      {/* Header, fixed height to match left QueueBanner so the bottom border lines up */}
      <div className="px-4 border-b flex items-center gap-2.5 flex-shrink-0" style={{ borderColor: '#ece2d0', height: 84 }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.soft, color: c.accent }}>
          <Icon.Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink leading-tight">Refine with your coach</div>
          <div className="text-[10.5px] text-ink-4 flex items-center gap-1.5 mt-0.5">
            <span className="dot pulse-dot" style={{ background: '#5e8d6a' }} />
            Searching {channel === 'cv' ? 'INSEAD directory' : 'peer networks'} live
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-area px-4 py-4 flex flex-col gap-3 min-h-0">
        {messages.map((m, i) => <ChatMessage key={i} msg={m} channel={channel} />)}
        {typing && <ChatTyping channel={channel} />}
      </div>

      {/* Suggestion chips */}
      {messages.length <= 2 && !typing &&
      <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div className="font-mono-tag text-ink-4" style={{ fontSize: 9 }}>Try</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) =>
          <button
            key={s}
            onClick={() => onSend(s)}
            className="text-[11.5px] px-2.5 h-7 rounded-full border text-ink-2 hover:bg-white transition-colors text-left"
            style={{ borderColor: '#d9cdb4', background: '#ffffff' }}>
            
                {s}
              </button>
          )}
          </div>
        </div>
      }

      {/* Composer */}
      <form onSubmit={submit} className="border-t p-3 flex-shrink-0" style={{ borderColor: '#ece2d0' }}>
        <div className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2" style={{ borderColor: '#d9cdb4' }}>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. find someone with GTM experience"
            className="flex-1 text-[12.5px] text-ink-2 placeholder:text-ink-4 outline-none bg-transparent" />
          
          <button
            type="submit"
            disabled={!val.trim()}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: val.trim() ? c.accent : '#ece2d0', color: val.trim() ? '#ffffff' : '#8e8170' }}>
            
            <Icon.Send size={12} />
          </button>
        </div>
      </form>
    </aside>);

}

function ChatMessage({ msg, channel }) {
  const c = window.DiscoverShared.CH[channel];
  if (msg.role === 'user') {
    return (
      <div className="self-end max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug" style={{ background: '#1f1b16', color: '#f4ede0', borderBottomRightRadius: 4 }}>
        {msg.text}
      </div>);

  }
  return (
    <div className="self-start max-w-[92%] flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: c.soft, color: c.accent }}>
        <Icon.Sparkles size={12} />
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-ink-2" style={{ background: '#ffffff', borderBottomLeftRadius: 4, whiteSpace: 'pre-wrap', border: '1px solid #ece2d0' }}>
        {msg.text}
      </div>
    </div>);

}

function ChatTyping({ channel }) {
  const c = window.DiscoverShared.CH[channel];
  return (
    <div className="self-start flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: c.soft, color: c.accent }}>
        <Icon.Sparkles size={12} />
      </div>
      <div className="px-3.5 py-3 rounded-2xl" style={{ background: '#ffffff', borderBottomLeftRadius: 4, border: '1px solid #ece2d0' }}>
        <div className="flex items-center gap-1">
          <span className="dot pulse-dot" style={{ background: c.accent, animationDelay: '0ms' }} />
          <span className="dot pulse-dot" style={{ background: c.accent, animationDelay: '160ms' }} />
          <span className="dot pulse-dot" style={{ background: c.accent, animationDelay: '320ms' }} />
        </div>
      </div>
    </div>);

}

// ============================================================================
// Chat seed + agent reply
// ============================================================================
function seedChat(channel, user) {
  if (channel === 'cv') {
    return [
    { role: 'agent', text:
      `I'm pushing INSEAD alumni who match your target, ${user.target.role} roles in ${user.target.geography.join(' / ')}, focused on ${user.target.industry}.` },
    { role: 'agent', text:
      'Save the ones worth a warm intro and skip the rest. Tell me anytime to narrow or widen, e.g. "find someone with GTM experience" or "drop Berlin".' }];

  }
  return [
  { role: 'agent', text:
    `Reading the LinkedIn graphs of your synced peers (Anna, Mathieu, Yuxuan). I'm prioritising 2nd-degree intros where mutual count is high and the peer is currently active with the target.` },
  { role: 'agent', text:
    'Save or skip, same as the directory. Or ask me to narrow: "show only Paris", "VC connections", "anyone hiring".' }];

}

function generateAgentReply(text, channel) {
  const t = text.toLowerCase();
  let reply,hint = null;
  if (/(gtm|go-?to-?market|commercial)/i.test(t)) {
    reply = 'Got it. Re-ranking the queue to prioritise GTM / commercial backgrounds. Pushing 2 fresh matches with strong GTM signal.';
    hint = { label: 'GTM signal' };
  } else if (/(paris)/i.test(t)) {
    reply = 'Narrowing to Paris-based only. 3 alumni in the queue match; Berlin and London cards are dropped.';
    hint = { label: 'Paris match' };
  } else if (/(berlin)/i.test(t)) {
    reply = 'Narrowing to Berlin-based only. 2 alumni in the queue match.';
    hint = { label: 'Berlin match' };
  } else if (/(vc|venture|investor)/i.test(t)) {
    reply = 'Filtering to VC / investor profiles. Re-ordering the queue, the next card is a Partner-level match.';
    hint = { label: 'VC profile' };
  } else if (/(sponsor|visa|non-?eu)/i.test(t)) {
    reply = 'Prioritising contacts whose teams have hired sponsorship-eligible candidates in the past 12 months. 2 strong matches surfaced.';
    hint = { label: 'Sponsorship-friendly' };
  } else if (/(hiring|hire|opening)/i.test(t)) {
    reply = 'Looking for alumni in roles with hiring authority who have active openings on their team. 2 matches.';
    hint = { label: 'Hiring authority' };
  } else if (/(drop|remove|exclude)/i.test(t)) {
    reply = 'Applied. Removing matching cards from the queue.';
  } else {
    reply = 'Got it, refining the queue based on that signal. Next card is a stronger match.';
    hint = { label: 'Refined' };
  }
  return { reply, hint };
}

window.TinderView = TinderView;