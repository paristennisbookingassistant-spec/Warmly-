// Onboarding, 2 steps + processing animation

function OnboardingScreen({ onDone, onSample }) {
  const { Btn, Field, TextInput, Select, Radio, Chip, SectionLabel, Picker, CITY_OPTIONS, COUNTRY_OPTIONS } = Shared;
  const [step, setStep] = useState(1); // 1, 2, 3 (processing)

  // Step 1 uploaded files
  const [cv, setCv] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [writing, setWriting] = useState(null);

  // Step 2 fields (pre-filled with extraction)
  const [bg, setBg] = useState({
    priorIndustry: 'Consulting',
    priorFunction: 'Strategy',
    nationality: 'Chinese',
    workAuth: ['China'],
    inseadClass: 'MBA · 26D',
  });
  const [target, setTarget] = useState({
    industry: 'Tech (AI)',
    role: 'Product Manager',
    companies: ['Parloa', 'Mistral', 'Anthropic'],
    geography: ['Paris', 'Berlin'],
  });
  const [companyDraft, setCompanyDraft] = useState('');

  const geoOptions = ['Paris', 'London', 'Singapore', 'NYC', 'Bay Area', 'Berlin', 'Dubai'];

  // Processing animation
  const [stages, setStages] = useState([
    { label: 'Reading your CV', done: false, active: true },
    { label: 'Mapping your transition', done: false, active: false },
    { label: 'Calibrating your voice', done: false, active: false },
    { label: 'Finding your first matches', done: false, active: false },
  ]);
  useEffect(() => {
    if (step !== 3) return;
    const timers = [];
    const advance = (i) => () => {
      setStages(prev => prev.map((s, idx) => {
        if (idx < i + 1) return { ...s, done: true, active: false };
        if (idx === i + 1) return { ...s, active: true };
        return s;
      }));
    };
    timers.push(setTimeout(advance(0), 600));
    timers.push(setTimeout(advance(1), 1300));
    timers.push(setTimeout(advance(2), 2000));
    timers.push(setTimeout(() => {
      setStages(prev => prev.map(s => ({ ...s, done: true, active: false })));
    }, 2700));
    timers.push(setTimeout(() => onDone && onDone(), 3300));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // STEP 1
  if (step === 1) {
    return (
      <div className="h-full flex flex-col" style={{ background: '#f4ede0' }}>
        <TopOnboardBar step={1} onSample={onSample} />
        <div className="flex-1 flex items-center justify-center px-6 pb-8 min-h-0 overflow-y-auto scroll-area">
          <div className="w-full max-w-[640px]">
            <h1 className="text-[34px] leading-[1.1] font-serif-i text-ink mb-2">Let's build your coach.</h1>
            <p className="text-[14.5px] text-ink-3 mb-6">Upload your CV and we'll pull your background automatically.</p>

            <DropZone
              required
              label="Drop your CV here, or click"
              hint="PDF, .docx, or .txt · Required"
              file={cv}
              onPick={() => setCv({ name: 'Liyang_Guo_CV.pdf' })}
              onRemove={() => setCv(null)}
              big />
            

            <div className="mt-6 mb-3">
              <SectionLabel>Optional, makes recommendations better</SectionLabel>
            </div>

            <div className="flex flex-col gap-2.5">
              <DropZone
                label="Career assessment"
                hint="CareerLeader, Strengths, etc. Helps us match you to people who can amplify your strengths."
                file={assessment}
                onPick={() => setAssessment({ name: 'CareerLeader_Assessment.pdf' })}
                onRemove={() => setAssessment(null)} />
              
              <DropZone
                label="Writing samples"
                hint="Cover letters, past emails. We learn your tone so drafts sound like you."
                file={writing}
                onPick={() => setWriting({ name: 'cover_letter_sample.docx' })}
                onRemove={() => setWriting(null)} />
              
            </div>

            <div className="mt-6 flex justify-end">
              <Btn
                size="lg"
                disabled={!cv}
                iconRight={Icon.ArrowRight}
                onClick={() => setStep(2)}>
                
                Continue
              </Btn>
            </div>
          </div>
        </div>
      </div>);

  }

  // STEP 2
  if (step === 2) {
    const toggleGeo = (g) => setTarget(t => ({
      ...t,
      geography: t.geography.includes(g) ? t.geography.filter(x => x !== g) : [...t.geography, g],
    }));
    const removeCompany = (c) => setTarget(t => ({ ...t, companies: t.companies.filter(x => x !== c) }));
    const addCompany = () => {
      const v = companyDraft.trim();
      if (!v) return;
      setTarget(t => ({ ...t, companies: [...t.companies, v] }));
      setCompanyDraft('');
    };

    return (
      <div className="h-full flex flex-col" style={{ background: '#f4ede0' }}>
        <TopOnboardBar step={2} onSample={onSample} />
        <div className="flex-1 flex items-center justify-center px-6 pb-6 min-h-0 overflow-y-auto scroll-area">
          <div className="w-full max-w-[960px]">
            <h1 className="text-[32px] leading-[1.1] font-serif-i text-ink mb-2">Here's what we pulled from your CV.</h1>
            <p className="text-[14.5px] text-ink-3 mb-6">Edit anything that's off, then tell us where you want to go.</p>

            <div className="grid grid-cols-2 gap-4">
              {/* LEFT, extracted */}
              <div className="bg-white border rounded-2xl p-6" style={{ borderColor: '#e5d8be' }}>
                <div className="flex items-center gap-2 mb-1">
                  <SectionLabel>Your background</SectionLabel>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-sienna-ink mb-4">
                  <Icon.Sparkles size={11} />
                  <span style={{ fontStyle: 'italic' }}>inferred from CV</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Field label="Prior industry">
                    <Select value={bg.priorIndustry} onChange={v => setBg({ ...bg, priorIndustry: v })}
                      options={['Consulting', 'Tech', 'Finance', 'Engineering', 'Healthcare', 'Marketing', 'Education', 'Government', 'Retail', 'Other']} />
                  </Field>
                  <Field label="Prior function">
                    <Select value={bg.priorFunction} onChange={v => setBg({ ...bg, priorFunction: v })}
                      options={['Strategy', 'Sales', 'Marketing', 'Product', 'Engineering', 'Operations', 'Finance', 'GTM', 'Other']} />
                  </Field>
                  <Field label="Nationality">
                    <Select value={bg.nationality} onChange={v => setBg({ ...bg, nationality: v })}
                      options={['Chinese', 'French', 'Indian', 'American', 'German', 'British', 'Brazilian', 'Other']} />
                  </Field>
                  <Field label="Where are you authorized to work?">
                    <div className="flex flex-wrap gap-2">
                      {bg.workAuth.map(c =>
                      <Chip key={c} variant="selected" removable onRemove={() => setBg(b => ({ ...b, workAuth: b.workAuth.filter(x => x !== c) }))}>{c}</Chip>
                      )}
                      <Picker options={COUNTRY_OPTIONS} selected={bg.workAuth} label="add country"
                        onPick={c => setBg(b => ({ ...b, workAuth: b.workAuth.includes(c) ? b.workAuth.filter(x => x !== c) : [...b.workAuth, c] }))} />
                    </div>
                  </Field>
                  <Field label="INSEAD class">
                    <Select value={bg.inseadClass} onChange={v => setBg({ ...bg, inseadClass: v })}
                      options={['MBA · 26D', 'MBA · 26J', 'MBA · 25D', 'MBA · 25J', 'MIM · 26', 'EMBA']} />
                  </Field>
                </div>
              </div>

              {/* RIGHT, targets */}
              <div className="bg-white border rounded-2xl p-6" style={{ borderColor: '#e5d8be' }}>
                <div className="mb-4">
                  <SectionLabel>Your targets</SectionLabel>
                </div>
                <div className="flex flex-col gap-3">
                  <Field label="Target industry">
                    <Select value={target.industry} onChange={v => setTarget({ ...target, industry: v })}
                      options={['Tech (AI)', 'Tech (other)', 'Consulting', 'Finance', 'Venture Capital', 'Private Equity', 'Healthcare', 'Other']} />
                  </Field>
                  <Field label="Target role">
                    <TextInput value={target.role} onChange={v => setTarget({ ...target, role: v })} />
                  </Field>
                  <Field label="Target companies">
                    <div className="flex flex-wrap gap-2">
                      {target.companies.map(c =>
                      <Chip key={c} variant="selected" removable onRemove={() => removeCompany(c)}>{c}</Chip>
                      )}
                      <div className="flex items-center gap-1.5">
                        <input
                          value={companyDraft}
                          onChange={e => setCompanyDraft(e.target.value)}
                          onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault();addCompany();}}}
                          placeholder="+ add"
                          className="h-8 px-3 rounded-full text-[12.5px] bg-transparent focus-ring transition-shadow"
                          style={{ border: '1px dashed #cdbf9f', width: 92, color: '#3d352c' }} />
                        
                      </div>
                    </div>
                  </Field>
                  <Field label="Target geography">
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set([...geoOptions, ...target.geography])).map(g => {
                        const sel = target.geography.includes(g);
                        return (
                          <Chip key={g} variant={sel ? 'selected' : 'default'} checked={sel} onClick={() => toggleGeo(g)}>
                            {g}
                          </Chip>);

                      })}
                      <Picker options={CITY_OPTIONS} selected={target.geography} label="more"
                        onPick={g => toggleGeo(g)} />
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Btn variant="ghost" icon={Icon.ArrowLeft} onClick={() => setStep(1)}>Back</Btn>
              <Btn size="lg" iconRight={Icon.ArrowRight} onClick={() => setStep(3)}>Build my coach</Btn>
            </div>
          </div>
        </div>
      </div>);

  }

  // STEP 3, processing
  return (
    <div className="h-full flex flex-col items-center justify-center px-4" style={{ background: '#f4ede0' }}>
      <div className="flex flex-col items-center gap-8 fade-up">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#f3e2cd' }}>
          <span className="rounded-full pulse-dot" style={{ width: 16, height: 16, background: '#b87a4a' }} />
        </div>
        <h2 className="text-[32px] leading-[1.1] font-serif-i text-ink">Building your coach...</h2>
        <div className="flex flex-col gap-3 mt-2 min-w-[320px]">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-[14px] transition-opacity duration-300" style={{ opacity: s.done || s.active ? 1 : 0.4 }}>
              {s.done ? (
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#5e8d6a', color: 'white' }}>
                  <Icon.Check size={12} strokeWidth={2.5} />
                </span>
              ) : s.active ? (
                <span className="w-5 h-5 rounded-full flex items-center justify-center pulse-dot" style={{ background: '#f3e2cd' }}>
                  <span className="rounded-full" style={{ width: 7, height: 7, background: '#b87a4a' }} />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border" style={{ borderColor: '#cdbf9f' }} />
              )}
              <span style={{ color: s.done ? '#3d352c' : (s.active ? '#1f1b16' : '#8e8170') }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopOnboardBar({ step, onSample }) {
  return (
    <div className="flex items-center justify-between px-8 pt-7">
      <div className="text-[12px] text-ink-3 font-medium">
        <span style={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}>{step} of 2</span>
      </div>
      <button
        onClick={onSample}
        className="text-[12.5px] inline-flex items-center gap-1.5 text-sienna-ink hover:underline"
      >
        <Icon.Sparkles size={12} />
        Try sample →
      </button>
    </div>
  );
}

function DropZone({ label, hint, file, onPick, onRemove, required, big }) {
  return (
    <div
      onClick={() => !file && onPick && onPick()}
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${big ? 'p-9' : 'p-5'}`}
      style={{
        borderColor: file ? '#b87a4a' : '#cdbf9f',
        background: file ? '#f3e2cd' : 'white',
      }}
    >
      <div className={`flex ${big ? 'flex-col items-center text-center gap-3' : 'items-center gap-4'}`}>
        <div className={`flex items-center justify-center rounded-xl ${big ? 'w-12 h-12' : 'w-10 h-10'}`} style={{ background: file ? '#fff' : '#f4ede0', color: '#7a4a25' }}>
          <Icon.FileText size={big ? 22 : 18} />
        </div>
        <div className={`flex-1 ${big ? 'text-center' : ''}`}>
          {file ? (
            <div className={`flex items-center gap-2 ${big ? 'justify-center' : ''}`}>
              <span className="text-[14px] font-medium text-ink">{file.name}</span>
              <span
                className="cursor-pointer text-ink-3 hover:text-ink-2 transition-colors"
                onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}
              >
                <Icon.X size={14} />
              </span>
            </div>
          ) : (
            <>
              <div className={`${big ? 'text-[15px]' : 'text-[13.5px]'} font-medium text-ink-2`}>{label}</div>
              {hint && <div className="text-[12px] text-ink-3 mt-1">{hint}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;
