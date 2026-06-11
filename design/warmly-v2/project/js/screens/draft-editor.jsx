// Draft Editor, main pane (textarea) + right pane (refine)

function DraftEditorScreen({ contact, onBack, onSent }) {
  const { Btn, Avatar, SectionLabel } = Shared;
  const showToast = Shared.useToast();
  const variants = SEED.DRAFTS_FOR_ANNA;
  const variantKeys = ['initial', 'shorter', 'formal', 'ask', 'paris'];
  const [variant, setVariant] = useState('initial');
  const [history, setHistory] = useState(['initial']);
  const [draftType, setDraftType] = useState('Connection note');
  const [shimmering, setShimmering] = useState(false);
  const [swapKey, setSwapKey] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [content, setContent] = useState(variants[variant]);
  const [messages, setMessages] = useState([
    { role: 'agent', text: "Here's a first pass, warm, direct, mirroring your past French outreach. Tell me how to refine, or tap a quick prompt below." }]
  );
  const [typing, setTyping] = useState(false);
  const taRef = useRef();

  // First-paint shimmer
  useEffect(() => {
    setShimmering(true);
    const t = setTimeout(() => setShimmering(false), 700);
    return () => clearTimeout(t);
  }, []);

  const applyVariant = (key) => {
    setShimmering(true);
    setTimeout(() => {
      setVariant(key);
      setContent(variants[key]);
      setHistory((h) => [...h, key]);
      setSwapKey((k) => k + 1);
      setShimmering(false);
    }, 380);
  };

  // Chat-style refine: user message → typing → agent reply → variant applied
  const sendChat = (userText, presetKey) => {
    if (!userText.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: userText }]);
    setTyping(true);
    const { key, reply, hint } = routeRefine(userText, presetKey);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { role: 'agent', text: reply, hint }]);
      applyVariant(key);
    }, 700);
  };

  const copyToClipboard = () => {
    try {navigator.clipboard.writeText(content);} catch {}
    showToast('Draft copied to clipboard.');
  };

  const revert = () => {
    if (history.length < 2) return;
    const newHistory = history.slice(0, -1);
    const prev = newHistory[newHistory.length - 1];
    setShimmering(true);
    setTimeout(() => {
      setVariant(prev);
      setContent(variants[prev]);
      setHistory(newHistory);
      setSwapKey((k) => k + 1);
      setShimmering(false);
    }, 280);
  };

  return (
    <div className="px-10 pt-6 pb-6 max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <Icon.ArrowLeft size={14} />
          Back to {contact.name}
        </button>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" icon={Icon.Copy} size="md" onClick={copyToClipboard}>Copy</Btn>
          <Btn icon={Icon.Send} size="md" onClick={() => onSent && onSent(contact.id)}>Save & sent</Btn>
        </div>
      </div>

      <div className="mb-4">
        <div className="font-mono-tag text-ink-3 mb-2">Draft to {contact.name.toUpperCase()}</div>
        {/* Draft type tabs */}
        <div className="inline-flex p-1 rounded-lg" style={{ background: '#ece2d0' }}>
          {['Connection note', 'Intro email', 'Follow-up'].map((t) =>
          <button
            key={t}
            onClick={() => setDraftType(t)}
            className="h-8 px-3.5 text-[12.5px] font-medium rounded-md transition-all"
            style={{
              background: draftType === t ? '#ffffff' : 'transparent',
              color: draftType === t ? '#1f1b16' : '#6b5e4a',
              boxShadow: draftType === t ? '0 1px 2px rgba(31,27,22,0.06)' : 'none'
            }}>
            
              {t}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-5 flex-1 min-h-0">
        {/* LEFT, editor */}
        <div className="bg-white border rounded-2xl overflow-hidden flex flex-col min-h-0" style={{ borderColor: '#e5d8be' }}>
          <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e5d8be' }}>
            <Avatar src={contact.avatar} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-ink-3">To</div>
              <div className="text-[13.5px] font-medium text-ink truncate">{contact.name}, {contact.role} · {contact.company}</div>
            </div>
          </div>
          <div className="relative px-7 py-6 flex-1 flex flex-col min-h-0">
            {shimmering &&
            <div className="absolute inset-x-7 top-6 bottom-6 rounded-lg shimmering pointer-events-none" />
            }
            <textarea
              key={swapKey}
              ref={taRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 bg-transparent border-0 resize-none text-[15px] text-ink-2 leading-[1.75] focus:outline-none fade-in"
              style={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'pre-wrap', opacity: shimmering ? 0 : 1, transition: 'opacity 200ms ease' }} data-comment-anchor="8ac7d251bb-textarea-117-13" />
            
          </div>
        </div>

        {/* RIGHT, refine */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto scroll-area">
          {/* Accordions */}
          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#e5d8be' }}>
            <Accordion open={whyOpen} setOpen={setWhyOpen} title="Why this draft">
              <div className="text-[12.5px] text-ink-2 leading-relaxed">
                Anna's INSEAD 22D class match and her Bain to Parloa pivot are the two strongest signals.
                Tone is set to mirror your past French outreach style: warm but direct, low pressure ask.
              </div>
            </Accordion>
            <Divider />
            <Accordion open={voiceOpen} setOpen={setVoiceOpen} title="Voice signals used">
              <ul className="flex flex-col gap-2 text-[12.5px] text-ink-2">
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#b87a4a' }} /> French informal "tu"</li>
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#b87a4a' }} /> Short sentences, low pressure ask</li>
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#b87a4a' }} /> Sign off with "À bientôt"</li>
              </ul>
            </Accordion>
          </div>

          {/* Refine chat, agent-style coach, mirrors Discover screen */}
          <RefineChat
            messages={messages}
            typing={typing}
            onSend={sendChat}
            variant={variant}
            historyLen={history.length}
            totalVariants={variantKeys.length}
            onRevert={revert} />
        </div>
      </div>
    </div>);

}

// ============================================================================
// RefineChat, chat-style coach panel for the Draft Editor right pane
// ============================================================================
function RefineChat({ messages, typing, onSend, variant, historyLen, totalVariants, onRevert }) {
  const { Btn } = Shared;
  const [val, setVal] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!val.trim()) return;
    onSend(val);
    setVal('');
  };

  const prompts = [
  { label: 'Make it simpler', preset: 'shorter' },
  { label: 'Add more detail', preset: 'ask' },
  { label: 'More formal', preset: 'formal' }];


  const showPrompts = messages.length <= 1 && !typing;

  return (
    <div className="bg-white border rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden" style={{ borderColor: '#e5d8be' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2.5 flex-shrink-0" style={{ borderColor: '#ece2d0' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f3e2cd', color: '#b87a4a' }}>
          <Icon.Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink leading-tight">Refine with your coach</div>
          <div className="text-[10.5px] text-ink-4 flex items-center gap-1.5 mt-0.5">
            <span className="dot pulse-dot" style={{ background: '#5e8d6a' }} />
            v{historyLen} of {totalVariants} · <span className="font-mono-tag" style={{ fontSize: 9.5 }}>{variant}</span>
          </div>
        </div>
        <button
          disabled={historyLen < 2}
          onClick={onRevert}
          className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          
          <Icon.Revert size={11} />
          revert
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-area px-4 py-4 flex flex-col gap-3 min-h-0">
        {messages.map((m, i) => <RefineMessage key={i} msg={m} />)}
        {typing && <RefineTyping />}
      </div>

      {/* Suggestion chips */}
      {showPrompts &&
      <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div className="font-mono-tag text-ink-4" style={{ fontSize: 9 }}>Try</div>
          <div className="flex flex-wrap gap-1.5">
            {prompts.map((p) =>
          <button
            key={p.preset}
            onClick={() => onSend(p.label, p.preset)}
            className="text-[11.5px] px-2.5 h-7 rounded-full border text-ink-2 hover:bg-cream transition-colors text-left"
            style={{ borderColor: '#d9cdb4', background: '#fdfaf3' }}>
            
                {p.label}
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
            placeholder="e.g. mention I'm based in Paris"
            className="flex-1 text-[12.5px] text-ink-2 placeholder:text-ink-4 outline-none bg-transparent" />
          
          <button
            type="submit"
            disabled={!val.trim()}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: val.trim() ? '#b87a4a' : '#ece2d0', color: val.trim() ? '#ffffff' : '#8e8170' }}>
            
            <Icon.Send size={12} />
          </button>
        </div>
      </form>
    </div>);

}

function RefineMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="self-end max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug" style={{ background: '#1f1b16', color: '#f4ede0', borderBottomRightRadius: 4 }}>
        {msg.text}
      </div>);

  }
  return (
    <div className="self-start max-w-[92%] flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#f3e2cd', color: '#b87a4a' }}>
        <Icon.Sparkles size={12} />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-ink-2" style={{ background: '#fdfaf3', borderBottomLeftRadius: 4, whiteSpace: 'pre-wrap', border: '1px solid #ece2d0' }}>
          {msg.text}
        </div>
        {msg.hint &&
        <div className="inline-flex items-center gap-1.5 self-start text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
            <span className="dot" style={{ background: '#b87a4a' }} />
            {msg.hint.label}
          </div>
        }
      </div>
    </div>);

}

function RefineTyping() {
  return (
    <div className="self-start flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#f3e2cd', color: '#b87a4a' }}>
        <Icon.Sparkles size={12} />
      </div>
      <div className="px-3.5 py-3 rounded-2xl" style={{ background: '#fdfaf3', borderBottomLeftRadius: 4, border: '1px solid #ece2d0' }}>
        <div className="flex items-center gap-1">
          <span className="dot pulse-dot" style={{ background: '#b87a4a', animationDelay: '0ms' }} />
          <span className="dot pulse-dot" style={{ background: '#b87a4a', animationDelay: '160ms' }} />
          <span className="dot pulse-dot" style={{ background: '#b87a4a', animationDelay: '320ms' }} />
        </div>
      </div>
    </div>);

}

// Route a free-text or preset prompt to the right variant + canned reply
function routeRefine(text, presetKey) {
  const t = text.toLowerCase();
  let key = presetKey;
  if (!key) {
    if (/(formal|vous|professional)/.test(t)) key = 'formal';else
    if (/(short|simpler|simple|brief|tight|trim|court)/.test(t)) key = 'shorter';else
    if (/(ask|specific|demande|coffee|chat|call)/.test(t)) key = 'ask';else
    if (/(paris|france|where i live|local)/.test(t)) key = 'paris';else
    key = 'paris';
  }
  const replies = {
    shorter: { text: 'Tightened it, same warmth, half the words. Cut the over-explanation around the Bain pivot.', hint: { label: 'Shorter draft' } },
    formal: { text: 'Swapped to "vous" and a more measured tone. Kept the INSEAD signal up front since that\'s your warmest hook.', hint: { label: 'More formal' } },
    ask: { text: 'Added a concrete ask, 20-min call next week, and a soft fallback if timing is bad.', hint: { label: 'Specific ask added' } },
    paris: { text: "Mentioned you're based in Paris and floated a coffee in-person as a softer alternative to a call.", hint: { label: 'Paris context' } }
  };
  const r = replies[key] || replies.paris;
  return { key, reply: r.text, hint: r.hint };
}

function Accordion({ open, setOpen, title, children }) {
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left">
        
        <span className="text-[12.5px] font-medium text-ink-2 uppercase tracking-wider" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, letterSpacing: '0.12em' }}>{title}</span>
        <Icon.ChevronRight size={14} className="text-ink-3 transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)' }} />
      </button>
      {open &&
      <div className="px-5 pb-4 fade-in">
          {children}
        </div>
      }
    </div>);

}

function Divider() {
  return <div className="h-px" style={{ background: '#e5d8be' }} />;
}

window.DraftEditorScreen = DraftEditorScreen;