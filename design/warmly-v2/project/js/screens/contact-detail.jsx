// Contact Detail, left info column + right action sidebar
// Note + meeting log are now editable forms.

function ContactDetailScreen({ contact, onBack, onDraft, onSave, onMet, onArchive, onAddNote, onLogMeeting, onPrepMeeting, onOpenPrep, onOpenPrepIntake, onClosePrepIntake, onUpdateStory, story, scheduledMeeting, meetingPrep, prepIntakeOpen }) {
  const { Avatar, Btn, TierBadge, StatusBadge, InseadPill, SectionLabel } = Shared;
  if (!contact) return null;
  const c = contact;

  // State-dependent primary action
  let primary = { label: 'Save to my list', icon: Icon.Heart, fn: onSave };
  if (c.status === 'Saved') primary = { label: 'Draft outreach', icon: Icon.Edit, fn: onDraft };
  if (c.status === 'Drafted') primary = { label: 'Open draft', icon: Icon.FileText, fn: onDraft };
  if (c.status === 'Contacted') primary = { label: 'Add follow-up', icon: Icon.Edit, fn: onDraft };
  if (c.status === 'Met') primary = { label: 'Draft follow-up', icon: Icon.Edit, fn: onDraft };

  // Prep button is enabled if there's a scheduled meeting OR the user has set a goal
  // (we treat the existence of a story.goal as evidence of an intent for this contact).
  const hasGoal = !!(story && story.goal);
  const prepEnabled = !!scheduledMeeting || hasGoal;
  const prepTooltip = prepEnabled ? null : 'Add a goal for this contact first';

  // Mock fallback note/meeting entries based on legacy counts (so existing seed
  // contacts still show something). Real entries from onAddNote/onLogMeeting
  // are stored on noteEntries / meetingEntries and shown alongside.
  const mockNotes = mockNoteEntries(c);
  const mockMeetings = mockMeetingEntries(c);
  const noteEntries = [...(c.noteEntries || []), ...mockNotes];
  const meetingEntries = [...(c.meetingEntries || []), ...mockMeetings];

  return (
    <div className="px-12 pt-8 pb-16 max-w-[1240px] mx-auto">
      <div className="flex items-center justify-between mb-7">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <Icon.ArrowLeft size={14} />
          Back
        </button>
        <button className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-ink-3 transition-colors">
          <Icon.MoreH size={16} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_312px] gap-7">
        {/* LEFT */}
        <div className="bg-white border rounded-2xl p-8" style={{ borderColor: '#e5d8be' }}>
          {/* Identity */}
          <div className="flex items-start gap-5 mb-7">
            <Avatar src={c.avatar} size={72} />
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[26px] leading-tight font-serif-i text-ink">{c.name}</h1>
              <div className="text-[14px] text-ink-2 mt-1">{c.role} · {c.company}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-3">
                  <Icon.MapPin size={12} /> {c.location}
                </span>
                <span className="text-ink-4">·</span>
                <span className="text-[12.5px] text-ink-3">INSEAD {c.inseadShort}</span>
                <span className="ml-2"><TierBadge tier={c.tier} /></span>
              </div>
              {scheduledMeeting &&
              <div className="inline-flex items-center gap-2 mt-3 px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
                  <Icon.Calendar size={11} />
                  <span className="font-medium">{scheduledMeeting.type}</span>
                  <span className="text-ink-3">· {scheduledMeeting.label}</span>
                  {scheduledMeeting.location && <span className="text-ink-3">· {scheduledMeeting.location}</span>}
                </div>
              }
            </div>
          </div>

          {/* Why */}
          <div className="mb-8">
            <div className="text-[15px] font-serif-i italic text-ink-2 mb-3">Why I think you should talk to {c.first}</div>
            <p className="text-[14.5px] leading-relaxed text-ink-2" style={{ maxWidth: 640 }}>
              {c.rationale}
            </p>
          </div>

          {/* The story so far, single narrative memory block */}
          <StorySoFar contact={c} story={story} onUpdateStory={onUpdateStory} />

          {/* Inline Meeting Prep intake panel (opens below story when triggered) */}
          {prepIntakeOpen &&
          <MeetingPrepIntake
            contact={c}
            defaultGoal={story?.goal || ''}
            onCancel={onClosePrepIntake}
            onGenerate={onPrepMeeting} />
          
          }

          {/* Meeting Prep artifact, shown in the timeline if one exists */}
          {meetingPrep &&
          <MeetingPrepArtifactRow prep={meetingPrep} contact={c} onClick={onOpenPrep} />
          }

          <Divider />

          {/* About */}
          <div className="my-7">
            <SectionLabel className="mb-3">About</SectionLabel>
            <ul className="flex flex-col gap-2">
              {c.about.map((a, i) =>
              <li key={i} className="text-[13.5px] text-ink-2 flex items-baseline gap-2.5">
                  <span className="dot mt-1.5" style={{ background: '#b87a4a' }} />
                  <span>{a}</span>
                </li>
              )}
            </ul>
          </div>

          <Divider />

          {/* Notes, editable */}
          <NotesSection
            entries={noteEntries}
            onAdd={onAddNote} />
          

          <Divider />

          {/* Meetings, editable with file upload */}
          <MeetingsSection
            entries={meetingEntries}
            onLog={onLogMeeting} />
          

          <Divider />

          {/* Drafts */}
          <ListSection
            label={`Your drafts (${c.drafts})`}
            empty="No drafts yet."
            cta="+ Draft outreach"
            count={c.drafts}
            onCta={onDraft}
            renderItems={() =>
            <div className="flex flex-col gap-2">
                {Array.from({ length: c.drafts }).map((_, i) => {
                const types = ['Connection note', 'Intro email', 'Follow-up'];
                const versions = ['v1', 'v2', 'v3'];
                const dates = ['2d ago', '5d ago', '1w ago'];
                return (
                  <button key={i} onClick={onDraft} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-sunk/30 transition-colors text-left" style={{ borderColor: '#e5d8be' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
                        <Icon.FileText size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-ink-2">{types[i] || 'Draft'}</div>
                        <div className="text-[11.5px] text-ink-3 mt-0.5">{versions[i] || 'v1'} · {dates[i] || 'today'}</div>
                      </div>
                      <Icon.ChevronRight size={14} className="text-ink-3" />
                    </button>);

              })}
              </div>
            } />
          
        </div>

        {/* RIGHT, action sidebar, stretches to match left column height */}
        <div className="flex flex-col gap-5">
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#e5d8be' }}>
            <SectionLabel className="mb-3">Actions</SectionLabel>
            <div className="flex flex-col gap-2">
              <Btn icon={primary.icon} className="w-full justify-start" onClick={primary.fn}>{primary.label}</Btn>
              {c.status === 'New' &&
              <Btn variant="secondary" icon={Icon.Edit} className="w-full justify-start" onClick={onDraft}>Draft outreach</Btn>
              }
              <Btn
                variant="secondary"
                icon={Icon.Calendar}
                className="w-full justify-start"
                disabled={!prepEnabled}
                title={prepTooltip}
                onClick={prepEnabled ? (meetingPrep ? onOpenPrep : onOpenPrepIntake) : undefined}>
                {meetingPrep ? 'Open meeting prep' : 'Prep a meeting'}
              </Btn>
              {c.status !== 'Met' &&
              <Btn variant="secondary" icon={Icon.Coffee} className="w-full justify-start" onClick={onMet}>Mark as met</Btn>
              }
              {c.status !== 'Archived' &&
              <Btn variant="ghost" icon={Icon.X} className="w-full justify-start" onClick={onArchive}>Archive</Btn>
              }
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-5 flex-1 flex flex-col" style={{ borderColor: '#e5d8be' }}>
            <div className="flex flex-col gap-4">
              <div data-comment-anchor="2189ff848a-div-148-15">
                <SectionLabel className="mb-2">Status</SectionLabel>
                <StatusBadge status={c.status} followUpDue={c.followUpDue} />
              </div>
              <div>
                <SectionLabel className="mb-2">Last contact</SectionLabel>
                <div className="text-[13px] text-ink-2">{c.lastContactLabel || 'Never'}</div>
              </div>
              <div>
                <SectionLabel className="mb-2">Next action</SectionLabel>
                <div className="text-[13px] text-ink-3">{c.followUpDue ? 'Follow-up overdue' : ', '}</div>
              </div>
            </div>

            {/* Filler: derived match signals so the box reaches the bottom of the left column. */}
            <SignalsBlock contact={c} />
          </div>
        </div>
      </div>
    </div>);

}

// ============================================================================
// Notes section
// ============================================================================
function NotesSection({ entries, onAdd }) {
  const { SectionLabel, Btn } = Shared;
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const ref = useRef(null);

  useEffect(() => {if (adding) ref.current?.focus();}, [adding]);

  const commit = () => {
    if (!val.trim()) {setAdding(false);return;}
    onAdd && onAdd(val);
    setVal('');setAdding(false);
  };

  return (
    <div className="my-7">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Your notes ({entries.length})</SectionLabel>
        {!adding &&
        <button onClick={() => setAdding(true)} className="text-[12px] inline-flex items-center gap-1 text-sienna-ink hover:underline">
            + Add a note
          </button>
        }
      </div>

      {adding &&
      <div className="mb-4 rounded-xl border p-3" style={{ borderColor: '#b87a4a', background: '#fffaf2', boxShadow: '0 0 0 1px #b87a4a inset' }}>
          <textarea
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Café de Flore on the 12th, open to chatting again after summer. Mentioned hiring a junior PM in Q3…"
          className="w-full text-[13.5px] text-ink-2 placeholder:text-ink-4 bg-transparent outline-none resize-none leading-relaxed"
          rows={4} />
        
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: '#f0e6d0' }}>
            <div className="text-[11px] text-ink-4">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · Markdown supported</div>
            <div className="flex items-center gap-2">
              <button onClick={() => {setVal('');setAdding(false);}} className="text-[12.5px] text-ink-3 hover:text-ink px-2 h-8">Cancel</button>
              <Btn size="sm" onClick={commit} disabled={!val.trim()} icon={Icon.Check}>Save note</Btn>
            </div>
          </div>
        </div>
      }

      {entries.length === 0 ?
      <div className="text-[13px] text-ink-4">No notes yet.</div> :

      <div className="flex flex-col gap-3">
          {entries.map((n) =>
        <div key={n.id} className="p-3.5 rounded-lg border" style={{ background: '#f9f3e7', borderColor: '#e5d8be' }}>
              <div className="text-[11.5px] text-ink-3 mb-1.5">{formatDate(n.date)}</div>
              <div className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">{n.text}</div>
            </div>
        )}
        </div>
      }
    </div>);

}

// ============================================================================
// Meetings section
// ============================================================================
function MeetingsSection({ entries, onLog }) {
  const { SectionLabel, Btn, TextInput } = Shared;
  const [logging, setLogging] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const reset = () => {setTitle('');setDate(today());setText('');setFile(null);setLogging(false);};

  const commit = () => {
    if (!title.trim() && !text.trim()) {reset();return;}
    onLog && onLog({
      title: title.trim() || 'Meeting',
      date: new Date(date),
      text: text.trim(),
      file: file ? { name: file.name, size: file.size, type: file.type } : null
    });
    reset();
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <div className="my-7">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Your meetings ({entries.length})</SectionLabel>
        {!logging &&
        <button onClick={() => setLogging(true)} className="text-[12px] inline-flex items-center gap-1 text-sienna-ink hover:underline">
            + Log a meeting
          </button>
        }
      </div>

      {logging &&
      <div className="mb-4 rounded-xl border p-4" style={{ borderColor: '#b87a4a', background: '#fffaf2', boxShadow: '0 0 0 1px #b87a4a inset' }}>
          <div className="grid grid-cols-[1fr_140px] gap-3 mb-3">
            <div>
              <div className="font-mono-tag text-ink-4 mb-1" style={{ fontSize: 9.5 }}>Title</div>
              <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Coffee at Café de Flore"
              className="w-full h-9 px-3 rounded-md border bg-white text-[13px] text-ink-2 placeholder:text-ink-4 focus-ring outline-none"
              style={{ borderColor: '#d9cdb4' }} />
            
            </div>
            <div>
              <div className="font-mono-tag text-ink-4 mb-1" style={{ fontSize: 9.5 }}>Date</div>
              <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-white text-[13px] text-ink-2 focus-ring outline-none"
              style={{ borderColor: '#d9cdb4' }} />
            
            </div>
          </div>

          <div className="mb-3">
            <div className="font-mono-tag text-ink-4 mb-1" style={{ fontSize: 9.5 }}>Notes</div>
            <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you discuss? Decisions, follow-ups, intros offered…"
            className="w-full text-[13px] text-ink-2 placeholder:text-ink-4 rounded-md border bg-white px-3 py-2 focus-ring outline-none resize-none leading-relaxed"
            style={{ borderColor: '#d9cdb4' }}
            rows={4} />
          
          </div>

          <div className="mb-3">
            <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>Attach meeting notes</div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={pickFile} className="hidden" />
            {file ?
          <div className="flex items-center gap-3 p-2.5 rounded-md border bg-white" style={{ borderColor: '#d9cdb4' }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
                  <Icon.FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-ink-2 truncate">{file.name}</div>
                  <div className="text-[11px] text-ink-4">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button onClick={() => setFile(null)} className="w-6 h-6 rounded-md text-ink-3 hover:bg-cream/60 inline-flex items-center justify-center">
                  <Icon.X size={12} />
                </button>
              </div> :

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-dashed text-[12.5px] text-ink-3 hover:bg-cream/30 transition-colors"
            style={{ borderColor: '#cdbf9f' }}>
            
                <Icon.Upload size={13} />
                Upload .pdf, .docx, .md or .txt
              </button>
          }
          </div>

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f0e6d0' }}>
            <div className="text-[11px] text-ink-4">Marks contact as <strong>Met</strong>.</div>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="text-[12.5px] text-ink-3 hover:text-ink px-2 h-8">Cancel</button>
              <Btn size="sm" onClick={commit} disabled={!title.trim() && !text.trim()} icon={Icon.Check}>Log meeting</Btn>
            </div>
          </div>
        </div>
      }

      {entries.length === 0 ?
      <div className="text-[13px] text-ink-4">No meetings logged yet.</div> :

      <div className="flex flex-col gap-3">
          {entries.map((m) =>
        <div key={m.id} className="p-3.5 rounded-lg border flex items-start gap-3" style={{ background: '#ffffff', borderColor: '#e5d8be' }}>
              <DateChip date={m.date} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink-2">{m.title}</div>
                {m.text && <div className="text-[12px] text-ink-3 mt-0.5 leading-relaxed whitespace-pre-wrap">{m.text}</div>}
                {m.file &&
            <div className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] text-ink-2 px-2 py-1 rounded-md" style={{ background: '#f3e2cd' }}>
                    <Icon.FileText size={11} />
                    <span className="font-medium">{m.file.name}</span>
                    {m.file.size && <span className="text-ink-4">· {(m.file.size / 1024).toFixed(0)} KB</span>}
                  </div>
            }
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}

// ============================================================================
// Helpers
// ============================================================================
function DateChip({ date }) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const day = d.getDate();
  return (
    <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
      <span className="text-[9px] uppercase tracking-wide leading-none">{month}</span>
      <span className="text-[13px] font-semibold leading-none mt-0.5">{day}</span>
    </div>);

}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mockNoteEntries(c) {
  if (!c.notes || c.notes <= 0) return [];
  const texts = [
  'Coffee at Café de Flore. Open to chatting again after summer. Interested in our INSEAD club AI events.',
  'Sent connection note. Replied within an hour, warm signal.',
  'Mentioned she is hiring a junior PM in Q3.'];

  const dates = ['2025-05-12', '2025-05-08', '2025-05-02'];
  return Array.from({ length: c.notes }).map((_, i) => ({
    id: `mock-n-${c.id}-${i}`,
    date: dates[i] || '2025-05-01',
    text: texts[i] || 'Earlier note.'
  }));
}

function mockMeetingEntries(c) {
  if (!c.meetings || c.meetings <= 0) return [];
  const titles = ['Coffee at Café de Flore', 'Zoom intro call', 'Quick chat after class'];
  const texts = [
  'Talked about her Bain → Parloa pivot. She offered to introduce me to a PM on her team.',
  'Walked through her career path. She advised to anchor my pitch on the AI-strategy crossover.',
  'Short chat. Will reconnect after her offsite.'];

  const dates = ['2025-05-06', '2025-05-13', '2025-05-20'];
  return Array.from({ length: c.meetings }).map((_, i) => ({
    id: `mock-m-${c.id}-${i}`,
    date: dates[i] || '2025-05-08',
    title: titles[i] || 'Meeting',
    text: texts[i] || '',
    file: null
  }));
}

// ============================================================================
// Signals block, derived match signals shown at the bottom of the right
// sidebar so the box reaches the same height as the (much taller) left card.
// ============================================================================
function SignalsBlock({ contact: c }) {
  const { SectionLabel } = Shared;
  const signals = deriveSignals(c);
  return (
    <div className="mt-6 pt-5 border-t flex-1 flex flex-col" style={{ borderColor: '#f0e6d0' }}>
      <SectionLabel className="mb-3">Match signals</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {signals.map(s => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 px-2 h-[24px] rounded-full text-[11.5px] font-medium"
            style={{ background: s.bg, color: s.fg }}
          >
            <span className="dot" style={{ background: s.fg }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-auto pt-4 text-[11.5px] text-ink-4 leading-relaxed">
        Signals are inferred from the CV book entry and your target scope. The coach uses these to rank pushes.
      </div>
    </div>
  );
}

function deriveSignals(c) {
  const out = [];
  if (c.tier === 'Strong') out.push({ label: 'Strong match', bg: '#dcebd9', fg: '#34553e' });
  else if (c.tier === 'Good') out.push({ label: 'Good match', bg: '#f3e2cd', fg: '#7a4a25' });
  else if (c.tier === 'Adjacent') out.push({ label: 'Adjacent', bg: '#ece2d0', fg: '#6b5e4a' });
  if (c.inseadShort) out.push({ label: `INSEAD ${c.inseadShort}`, bg: '#f3e2cd', fg: '#7a4a25' });
  if (c.location) out.push({ label: c.location.split('/')[0].trim(), bg: '#dde6ee', fg: '#2f4d63' });
  if (c.company) out.push({ label: c.company, bg: '#ffffff', fg: '#3d352c' });
  return out;
}

function ListSection({ label, cta, onCta, count, empty, renderItems }) {
  const { SectionLabel } = Shared;
  return (
    <div className="my-7">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>{label}</SectionLabel>
        {cta &&
        <button onClick={onCta} className="text-[12px] inline-flex items-center gap-1 text-sienna-ink hover:underline">
            {cta}
          </button>
        }
      </div>
      {count > 0 ? renderItems() : <div className="text-[13px] text-ink-4">{empty}</div>}
    </div>);

}

function Divider() {
  return <div className="h-px" style={{ background: '#e5d8be' }} />;
}

// ============================================================================
// Compact row shown on the timeline when a Meeting Prep artifact exists
// ============================================================================
function MeetingPrepArtifactRow({ prep, contact, onClick }) {
  return (
    <button
      onClick={onClick}
      className="my-6 w-full flex items-center gap-4 px-5 py-4 rounded-2xl border bg-white hover:bg-cream/40 transition-colors text-left"
      style={{ borderColor: '#e5d8be' }}>
      
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
        <Icon.Calendar size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono-tag text-sienna-ink mb-0.5">Meeting prep</div>
        <div className="text-[14px] text-ink-2 leading-tight">
          {prep.duration} {prep.purpose.toLowerCase()} <span className="text-ink-3">· {prep.createdAt}</span>
        </div>
      </div>
      <Icon.ChevronRight size={15} className="text-ink-3 flex-shrink-0" />
    </button>);

}

window.ContactDetailScreen = ContactDetailScreen;