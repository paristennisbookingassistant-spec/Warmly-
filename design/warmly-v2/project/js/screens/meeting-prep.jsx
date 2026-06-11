// Meeting Prep, intake panel (inline on Contact Detail), loading state, and
// the full-page 4-tab artifact view. The intake panel is rendered inline by
// ContactDetailScreen; the full-page view is its own routed screen.

// ============================================================================
// Intake panel, slides down inline on Contact Detail
// ============================================================================
function MeetingPrepIntake({ contact, onCancel, onGenerate, defaultGoal }) {
  const { SectionLabel, Btn } = Shared;
  const [purpose, setPurpose] = useState('First intro or coffee chat');
  const [duration, setDuration] = useState('30');
  const [goal, setGoal] = useState(defaultGoal || '');
  const [focus, setFocus] = useState('');
  const [purposeOpen, setPurposeOpen] = useState(false);

  const purposeOptions = [
  'First intro or coffee chat',
  'Reconnect after a while',
  'Pitch a role or an idea',
  'Ask for a specific intro or referral',
  'Investor or customer conversation',
  'Something else'];


  const canSubmit = goal.trim().length > 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden fade-up mb-6"
      style={{ borderColor: '#b87a4a', background: '#ffffff', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 8px 24px rgba(184,122,74,0.10)' }}>
      
      {/* Header */}
      <div className="px-7 py-5 flex items-start justify-between gap-4 border-b" style={{ borderColor: '#f0e6d0', background: '#fdf6e9' }}>
        <div>
          <div className="font-mono-tag mb-1.5" style={{ color: '#b87a4a' }}>Meeting prep · intake</div>
          <h2 className="font-serif-i text-ink leading-tight" style={{ fontSize: 24 }}>
            Prep your meeting with {contact.first}
          </h2>
          <div className="text-[13.5px] text-ink-3 mt-1">{contact.role} at {contact.company}, {contact.location}</div>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-md text-ink-3 hover:bg-white hover:text-ink inline-flex items-center justify-center transition-colors">
          
          <Icon.X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-7 py-6 flex flex-col gap-6">
        {/* Purpose */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">What's the purpose of this meeting?</label>
          <div className="relative" style={{ maxWidth: 480 }}>
            <button
              onClick={() => setPurposeOpen((v) => !v)}
              className="w-full h-10 px-3.5 rounded-lg border bg-white text-left text-[13.5px] text-ink-2 inline-flex items-center justify-between focus-ring outline-none"
              style={{ borderColor: '#d9cdb4' }}>
              
              <span>{purpose}</span>
              <Icon.ChevronDown size={14} className={`text-ink-3 transition-transform ${purposeOpen ? 'rotate-180' : ''}`} />
            </button>
            {purposeOpen &&
            <div
              className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border rounded-lg overflow-hidden z-10 shadow-pop fade-in"
              style={{ borderColor: '#d9cdb4' }}>
              
                {purposeOptions.map((opt) =>
              <button
                key={opt}
                onClick={() => {setPurpose(opt);setPurposeOpen(false);}}
                className="w-full px-3.5 py-2.5 text-left text-[13px] text-ink-2 hover:bg-cream/40 transition-colors flex items-center gap-2.5"
                style={{ borderTop: opt !== purposeOptions[0] ? '1px solid #f0e6d0' : 'none' }}>
                
                    <span className={`radio-outer ${purpose === opt ? 'checked' : ''}`} />
                    {opt}
                  </button>
              )}
              </div>
            }
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">How long is the meeting?</label>
          <div className="inline-flex items-center gap-2 p-1 rounded-lg border" style={{ borderColor: '#d9cdb4', background: '#fbf6ec' }}>
            {['15', '30', '45', '60'].map((m) =>
            <button
              key={m}
              onClick={() => setDuration(m)}
              className="h-8 px-3.5 rounded-md text-[12.5px] font-medium transition-colors"
              style={{
                background: duration === m ? '#ffffff' : 'transparent',
                color: duration === m ? '#7a4a25' : '#6b5e4a',
                boxShadow: duration === m ? '0 1px 2px rgba(31,27,22,0.06)' : 'none'
              }}>
              
                {m} min
              </button>
            )}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">What do you want to walk away with?</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Understand Parloa's product roadmap and explore if there's a fit for an AI PM internship for summer 2027."
            className="w-full text-[13.5px] text-ink-2 placeholder:text-ink-4 rounded-lg border bg-white px-3.5 py-3 outline-none focus-ring resize-none leading-relaxed"
            style={{ borderColor: '#d9cdb4', maxWidth: 640 }}
            rows={3} />
          
        </div>

        {/* Focus */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">
            Anything specific on your mind? <span className="text-ink-4 font-normal">(optional)</span>
          </label>
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. worried about coming across too job-search-y; want to test the AI PM angle without overcommitting."
            className="w-full text-[13.5px] text-ink-2 placeholder:text-ink-4 rounded-lg border bg-white px-3.5 py-3 outline-none focus-ring resize-none leading-relaxed"
            style={{ borderColor: '#d9cdb4', maxWidth: 640 }}
            rows={2} />
          
        </div>
      </div>

      {/* Footer */}
      <div className="px-7 py-4 flex items-center justify-end gap-2 border-t" style={{ borderColor: '#f0e6d0', background: '#fcf8ef' }}>
        <button onClick={onCancel} className="text-[13px] text-ink-3 hover:text-ink px-3 h-9">Cancel</button>
        <Btn
          disabled={!canSubmit}
          onClick={() => onGenerate({ purpose, duration: `${duration} min`, goal: goal.trim(), focus: focus.trim() })}
          icon={Icon.Sparkles}>
          
          Generate prep brief
        </Btn>
      </div>
    </div>);

}

// ============================================================================
// Loading state, 6-second calm message sequence
// ============================================================================
function MeetingPrepLoading({ contact, onDone }) {
  const messages = [
  'Researching Parloa.',
  'Pulling LinkedIn signals on Mathieu.',
  'Drafting questions.',
  'Almost ready.'];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const stepMs = 1500;
    const total = messages.length * stepMs;
    const t1 = setInterval(() => setIdx((i) => Math.min(i + 1, messages.length - 1)), stepMs);
    const t2 = setTimeout(() => onDone(), total);
    return () => {clearInterval(t1);clearTimeout(t2);};
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center px-12 py-12">
      <div className="text-center max-w-[420px]">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ background: '#f3e2cd' }}>
          <Icon.Sparkles size={26} className="text-sienna-ink" style={{ animation: 'pulseDot 1.6s ease-in-out infinite' }} />
        </div>
        <h2 className="font-serif-i text-ink leading-tight mb-3" style={{ fontSize: 28 }}>
          Building your prep brief for {contact.first}…
        </h2>
        <div className="text-[14px] text-ink-3 min-h-[44px] flex items-center justify-center">
          <span key={idx} className="fade-in">{messages[idx]}</span>
        </div>
        <div className="mt-8 flex items-center justify-center gap-1.5">
          {messages.map((_, i) =>
          <span
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 28 : 14,
              background: i <= idx ? '#b87a4a' : '#e5d8be'
            }} />

          )}
        </div>
      </div>
    </div>);

}

// ============================================================================
// Meeting Prep, full-page artifact view
// ============================================================================
function MeetingPrepScreen({ contact, prep, onBack, onDraftFollowUp }) {
  const { Btn } = Shared;
  const showToast = Shared.useToast();
  const [tab, setTab] = useState('questions'); // default = questions
  const [notes, setNotes] = usePrepNotes(prep?.id);
  const [savedAt, setSavedAt] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Keyboard shortcuts 1-4 for tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'INPUT') return;
      if (e.key === '1') setTab('snapshot');
      if (e.key === '2') setTab('person');
      if (e.key === '3') setTab('agenda');
      if (e.key === '4') setTab('questions');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track save-stamp on every note change
  useEffect(() => {
    if (notes && Object.keys(notes).length > 0) {
      const now = new Date();
      setSavedAt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
  }, [notes]);

  if (!prep) {
    return (
      <div className="px-12 py-16 text-center">
        <div className="text-[15px] text-ink-3">This contact doesn't have a prep brief yet.</div>
        <button onClick={onBack} className="mt-4 text-[13px] text-sienna-ink hover:underline">Back to contact</button>
      </div>);

  }

  const setNote = (key, val) => setNotes((prev) => ({ ...prev, [key]: val }));

  const handleClear = () => {
    if (!clearConfirm) {setClearConfirm(true);setTimeout(() => setClearConfirm(false), 3000);return;}
    setNotes({});
    setClearConfirm(false);
    showToast('Notes cleared.');
  };

  const handleCopyNotes = () => {
    const md = renderNotesAsMarkdown(prep, notes, contact);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(md).then(() => showToast('Notes copied as markdown.'));
    } else {
      showToast('Copy not supported in this browser.');
    }
  };

  const handleSnapshot = () => {
    // In a real build, downloads a static HTML snapshot. Here we just confirm.
    showToast('Snapshot saved to your downloads.');
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Top header */}
      <div className="sticky top-0 z-20 border-b" style={{ background: '#f4ede0', borderColor: '#e5d8be' }}>
        <div className="px-10 pt-5 pb-3 max-w-[1240px] mx-auto">
          <div className="flex items-center justify-between gap-4 mb-3">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
              <Icon.ArrowLeft size={14} />
              Back to {contact.first}
            </button>
            <div className="text-[11.5px] text-ink-4 font-mono-tag">
              {savedAt ? `Saved ${savedAt}` : 'Live notes autosave'}
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
                <Icon.Calendar size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-mono-tag text-sienna-ink mb-0.5">Meeting prep</div>
                <h1 className="text-[20px] font-serif-i text-ink leading-tight truncate">
                  {contact.name}<span className="text-ink-3"> · {prep.duration} {prep.purpose.toLowerCase()}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Btn size="sm" variant="secondary" icon={Icon.Upload} onClick={handleSnapshot}>Save snapshot</Btn>
              <Btn size="sm" variant="secondary" icon={Icon.Copy} onClick={handleCopyNotes}>Copy notes</Btn>
              <Btn size="sm" variant="ghost" icon={Icon.X} onClick={handleClear}>
                {clearConfirm ? 'Click again to confirm' : 'Clear notes'}
              </Btn>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 mt-4 -mb-px">
            {[
            { id: 'snapshot', label: 'Snapshot', n: 1 },
            { id: 'person', label: 'Person', n: 2 },
            { id: 'agenda', label: 'Agenda', n: 3 },
            { id: 'questions', label: 'Questions', n: 4 }].
            map((t) =>
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 h-10 text-[13px] font-medium transition-colors relative inline-flex items-center gap-2"
              style={{
                color: tab === t.id ? '#7a4a25' : '#6b5e4a'
              }}>
              
                {t.label}
                <span className="font-mono-tag text-ink-4" style={{ fontSize: 9.5 }}>{t.n}</span>
                {tab === t.id &&
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#b87a4a' }} />
              }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div key={tab} className="fade-in flex-1 max-w-[1080px] mx-auto w-full px-10 py-10">
        {tab === 'snapshot' && <SnapshotTab prep={prep} />}
        {tab === 'person' && <PersonTab prep={prep} />}
        {tab === 'agenda' && <AgendaTab prep={prep} />}
        {tab === 'questions' &&
        <QuestionsTab
          prep={prep}
          notes={notes}
          setNote={setNote}
          onDraftFollowUp={() => onDraftFollowUp(notes)} />

        }
      </div>
    </div>);

}

// ============================================================================
// Tab 1, Snapshot
// ============================================================================
function SnapshotTab({ prep }) {
  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>Snapshot</PrepHeading>

      <PrepBlock label="Person">
        {prep.snapshot.personLines.map((l, i) =>
        <p key={i} className="text-[14.5px] leading-[1.6] text-ink-2">{l}</p>
        )}
      </PrepBlock>

      <PrepBlock label="Company">
        {prep.snapshot.companyLines.map((l, i) =>
        <p key={i} className="text-[14.5px] leading-[1.6] text-ink-2">{l}</p>
        )}
      </PrepBlock>

      <div className="grid grid-cols-2 gap-5 mt-3">
        <Callout
          tone="sienna"
          label="Why this meeting matters"
          body={prep.snapshot.whyMatters} />
        
        <Callout
          tone="warning"
          label="What NOT to do"
          body={prep.snapshot.dontDo} />
        
      </div>
    </div>);

}

function Callout({ tone, label, body }) {
  const palette = tone === 'sienna' ?
  { bg: '#fdf6e9', border: '#ebcfa0', label: '#7a4a25', icon: '#b87a4a' } :
  { bg: '#fbf3df', border: '#e7c98a', label: '#7a521a', icon: '#c8923a' };

  return (
    <div
      className="rounded-2xl border px-5 py-4 flex flex-col gap-2"
      style={{ background: palette.bg, borderColor: palette.border }}>
      
      <div className="flex items-center gap-2">
        {tone === 'warning' ?
        <Icon.Alert size={13} style={{ color: palette.icon }} /> :

        <Icon.Sparkles size={13} style={{ color: palette.icon }} />
        }
        <div className="font-mono-tag" style={{ color: palette.label, fontSize: 10 }}>{label}</div>
      </div>
      <p className="text-[13.5px] leading-[1.55] text-ink-2">{body}</p>
    </div>);

}

// ============================================================================
// Tab 2, Person
// ============================================================================
function PersonTab({ prep }) {
  const p = prep.person;
  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>Person</PrepHeading>

      <PrepBlock label="His journey">
        <p className="text-[14.5px] leading-[1.65] text-ink-2" style={{ maxWidth: 760 }}>{p.journey}</p>
      </PrepBlock>

      <PrepBlock label="Mutual connections">
        <ul className="flex flex-col gap-2">
          {p.mutuals.map((m, i) =>
          <li key={i} className="flex items-baseline gap-2.5">
              <span className="dot mt-1.5" style={{ background: '#b87a4a' }} />
              <span className="text-[14px] text-ink-2 leading-relaxed">
                <span className="font-medium">{m.name}</span>
                <span className="text-ink-3">, {m.detail}</span>
              </span>
            </li>
          )}
        </ul>
      </PrepBlock>

      <PrepBlock label="Shared links">
        <ul className="flex flex-col gap-1.5">
          {p.sharedLinks.map((l, i) =>
          <li key={i} className="text-[14px] text-ink-2 flex items-baseline gap-2.5 leading-relaxed">
              <Icon.Link size={11} className="text-ink-4 flex-shrink-0 translate-y-0.5" />
              {l}
            </li>
          )}
        </ul>
      </PrepBlock>

      <PrepBlock label="Your angle">
        <p className="text-[14.5px] leading-[1.65] text-ink-2" style={{ maxWidth: 760 }}>{p.angle}</p>
      </PrepBlock>
    </div>);

}

// ============================================================================
// Tab 3, Agenda
// ============================================================================
function AgendaTab({ prep }) {
  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>
        Agenda <span className="text-ink-3"> · {prep.duration}</span>
      </PrepHeading>

      <div className="flex flex-col gap-4">
        {prep.agenda.blocks.map((b, i) =>
        <div key={i} className="grid grid-cols-[120px_1fr] gap-6 items-baseline">
            <div className="font-mono-tag" style={{ color: '#b87a4a', fontSize: 11 }}>{b.range}</div>
            <div>
              <div className="text-[15.5px] font-medium text-ink mb-1">{b.title}</div>
              <p className="text-[13.5px] text-ink-2 leading-[1.6]" style={{ maxWidth: 660 }}>{b.body}</p>
            </div>
          </div>
        )}
      </div>

      <PrepBlock label="Tone">
        <p className="text-[14px] leading-[1.65] text-ink-2 italic" style={{ maxWidth: 760 }}>{prep.agenda.tone}</p>
      </PrepBlock>
    </div>);

}

// ============================================================================
// Tab 4, Questions (the workhorse)
// ============================================================================
function QuestionsTab({ prep, notes, setNote, onDraftFollowUp }) {
  const { Btn } = Shared;

  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>Questions</PrepHeading>

      {/* Pre-meeting state + first impressions */}
      <div className="grid grid-cols-2 gap-5">
        <NoteField
          label="Pre-meeting state"
          placeholder="How are you walking in? Tired, curious, anxious, distracted…"
          value={notes['preMeeting'] || ''}
          onChange={(v) => setNote('preMeeting', v)}
          rows={3} />
        
        <NoteField
          label="First impressions"
          placeholder="Vibe in the first 60 seconds, warm, guarded, hurried…"
          value={notes['firstImpressions'] || ''}
          onChange={(v) => setNote('firstImpressions', v)}
          rows={3} />
        
      </div>

      <Divider />

      {/* Question phases */}
      {prep.questions.phases.map((phase) =>
      <div key={phase.id} className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h3 className="text-[15px] font-medium text-ink uppercase tracking-wide" style={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em', fontSize: 11.5 }}>
              {phase.id === 'warmup' ? 'Phase 1' : phase.id === 'core' ? 'Phase 2' : 'Phase 3'} · {phase.name}
            </h3>
            <span className="text-[12px] text-ink-4">({phase.minutes})</span>
          </div>
          <div className="h-px" style={{ background: '#e5d8be' }} />

          <div className="flex flex-col gap-5">
            {phase.items.map((q, idx) =>
          <QuestionItem
            key={q.id}
            number={`Q${phase.items.indexOf(q) + (phase.id === 'warmup' ? 0 : phase.id === 'core' ? 1 : 5)}`}
            question={q}
            value={notes[q.id] || ''}
            onChange={(v) => setNote(q.id, v)} />

          )}
          </div>
        </div>
      )}

      <Divider />

      {/* Wrap-up, 2x2 grid */}
      <div>
        <h3 className="font-serif-i text-ink mb-4" style={{ fontSize: 19 }}>Wrap-up</h3>
        <div className="grid grid-cols-2 gap-5">
          <NoteField
            label="Asks made"
            placeholder="What did you ask him for? What did he ask you for?"
            value={notes['asksMade'] || ''}
            onChange={(v) => setNote('asksMade', v)}
            rows={3} />
          
          <NoteField
            label="Follow-ups"
            placeholder="What you owe him. What he owes you."
            value={notes['followUps'] || ''}
            onChange={(v) => setNote('followUps', v)}
            rows={3} />
          
          <NoteField
            label="Surprises"
            placeholder="Anything that didn't match what you expected."
            value={notes['surprises'] || ''}
            onChange={(v) => setNote('surprises', v)}
            rows={3} />
          
          <NoteField
            label="Gut read"
            placeholder="One line: is this a relationship worth investing in?"
            value={notes['gutRead'] || ''}
            onChange={(v) => setNote('gutRead', v)}
            rows={3} />
          
        </div>
      </div>

      <Divider />

      {/* Closing CTA */}
      <div className="flex justify-center pt-2">
        <Btn size="lg" icon={Icon.Edit} onClick={onDraftFollowUp}>
          Draft follow-up message from these notes
        </Btn>
      </div>
    </div>);

}

// ----------------------------------------------------------------------------
// QuestionItem, question text + Why reveal + always-visible notes textarea
// ----------------------------------------------------------------------------
function QuestionItem({ number, question, value, onChange }) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <div className="grid grid-cols-[44px_1fr] gap-3">
      <div className="font-mono-tag pt-2" style={{ color: '#b87a4a', fontSize: 11 }}>{number}</div>
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-[15px] leading-[1.55] text-ink" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <span className="text-ink-2">"</span>{question.text}<span className="text-ink-2">"</span>
          </p>
          <button
            onClick={() => setWhyOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-sienna-ink transition-colors flex-shrink-0 mt-1">
            
            <span>Why</span>
            <Icon.ChevronDown size={11} className={`transition-transform ${whyOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {whyOpen &&
        <div
          className="mt-2.5 px-3.5 py-2.5 rounded-md text-[12.5px] text-ink-2 leading-relaxed fade-in"
          style={{ background: '#fdf6e9', borderLeft: '2px solid #b87a4a', maxWidth: 680 }}>
          
            {question.why}
          </div>
        }

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.hint}
          className="mt-3 w-full text-[13px] text-ink-2 placeholder:text-ink-4 bg-white border rounded-lg px-3.5 py-2.5 outline-none focus-ring resize-none leading-[1.6]"
          style={{ borderColor: '#d9cdb4', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5 }}
          rows={3} />
        
      </div>
    </div>);

}

// ----------------------------------------------------------------------------
// Shared bits for the prep tabs
// ----------------------------------------------------------------------------
function PrepHeading({ children }) {
  return (
    <div className="font-mono-tag text-ink-3" style={{ fontSize: 11, letterSpacing: '0.12em' }}>
      {children}
    </div>);

}

function PrepBlock({ label, children }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <h3 className="font-serif-i text-ink leading-tight" style={{ fontSize: 19 }}>{label}</h3>
        <div className="flex-1 h-px" style={{ background: '#e5d8be' }} />
      </div>
      <div className="flex flex-col gap-2 pt-1">{children}</div>
    </div>);

}

function NoteField({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono-tag" style={{ color: '#6b5e4a', fontSize: 10 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13px] text-ink-2 placeholder:text-ink-4 bg-white border rounded-lg px-3.5 py-2.5 outline-none focus-ring resize-none leading-[1.6]"
        style={{ borderColor: '#d9cdb4', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5 }}
        rows={rows} />
      
    </div>);

}

function Divider() {
  return <div className="h-px" style={{ background: '#e5d8be' }} />;
}

// ----------------------------------------------------------------------------
// usePrepNotes, localStorage-backed notes object, debounced 400ms
// ----------------------------------------------------------------------------
function usePrepNotes(prepId) {
  const key = `warmly:prep-notes:${prepId || 'unknown'}`;
  const [notes, setNotes] = useState(() => {
    if (!prepId) return {};
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const timer = useRef();
  useEffect(() => {
    if (!prepId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(notes));
      } catch (e) {/* ignore */}
    }, 400);
    return () => clearTimeout(timer.current);
  }, [notes, prepId]);

  return [notes, setNotes];
}

// ----------------------------------------------------------------------------
// Render notes as markdown, used by Copy Notes + Draft follow-up
// ----------------------------------------------------------------------------
function renderNotesAsMarkdown(prep, notes, contact) {
  const lines = [];
  lines.push(`# Meeting notes, ${contact.name}`);
  lines.push(`*${prep.duration} ${prep.purpose.toLowerCase()} · ${prep.createdAt}*`);
  lines.push('');
  if (notes.preMeeting) lines.push(`**Pre-meeting state:** ${notes.preMeeting}`);
  if (notes.firstImpressions) lines.push(`**First impressions:** ${notes.firstImpressions}`);
  lines.push('');
  prep.questions.phases.forEach((phase) => {
    lines.push(`## ${phase.name}`);
    phase.items.forEach((q) => {
      lines.push(`**Q: ${q.text}**`);
      lines.push(notes[q.id] || '_(no notes)_');
      lines.push('');
    });
  });
  lines.push('## Wrap-up');
  if (notes.asksMade) lines.push(`**Asks made:** ${notes.asksMade}`);
  if (notes.followUps) lines.push(`**Follow-ups:** ${notes.followUps}`);
  if (notes.surprises) lines.push(`**Surprises:** ${notes.surprises}`);
  if (notes.gutRead) lines.push(`**Gut read:** ${notes.gutRead}`);
  return lines.join('\n');
}

window.MeetingPrepIntake = MeetingPrepIntake;
window.MeetingPrepLoading = MeetingPrepLoading;
window.MeetingPrepScreen = MeetingPrepScreen;
