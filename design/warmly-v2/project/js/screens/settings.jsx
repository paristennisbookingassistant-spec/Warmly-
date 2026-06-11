// Settings, Account / Profile / Materials cards

function SettingsScreen({ user, onSignOut }) {
  const { Btn, Field, TextInput, Select, Radio, Chip, SectionLabel, Picker, CITY_OPTIONS, COUNTRY_OPTIONS } = Shared;
  const showToast = Shared.useToast();
  const [name, setName] = useState(user.fullName);
  const [bg, setBg] = useState(user.background);
  const [target, setTarget] = useState(user.target);
  const [companyDraft, setCompanyDraft] = useState('');
  const geoOptions = ['Paris', 'London', 'Singapore', 'NYC', 'Bay Area', 'Berlin', 'Dubai'];

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
    <div className="px-12 pt-12 pb-16 max-w-[820px] mx-auto">
      <h1 className="text-[36px] leading-[1.05] font-serif-i text-ink mb-8 fade-up">Settings</h1>

      <div className="flex flex-col gap-6">
        {/* Account */}
        <div className="bg-white border rounded-2xl p-7" style={{ borderColor: '#e5d8be' }}>
          <SectionLabel className="mb-5">Account</SectionLabel>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Email">
              <div className="h-10 px-3 rounded-lg text-[13.5px] text-ink-3 flex items-center border" style={{ background: '#f4ede0', borderColor: '#d9cdb4' }}>
                {user.email}
              </div>
            </Field>
            <Field label="Name">
              <TextInput value={name} onChange={setName} />
            </Field>
          </div>
          <div className="flex justify-end mt-5">
            <Btn variant="ghost" icon={Icon.LogOut} onClick={onSignOut}>Sign out</Btn>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border rounded-2xl p-7" style={{ borderColor: '#e5d8be' }}>
          <SectionLabel className="mb-5">Your profile</SectionLabel>
          <div className="grid grid-cols-2 gap-5">
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
                {bg.workAuth.map(c => (
                  <Chip key={c} variant="selected" removable onRemove={() => setBg(b => ({ ...b, workAuth: b.workAuth.filter(x => x !== c) }))}>{c}</Chip>
                ))}
                <Picker options={COUNTRY_OPTIONS} selected={bg.workAuth} label="add country"
                  onPick={c => setBg(b => ({ ...b, workAuth: b.workAuth.includes(c) ? b.workAuth.filter(x => x !== c) : [...b.workAuth, c] }))} />
              </div>
            </Field>
          </div>
          <div className="h-px my-6" style={{ background: '#e5d8be' }} />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Target industry">
              <Select value={target.industry} onChange={v => setTarget({ ...target, industry: v })}
                options={['Tech (AI)', 'Tech (other)', 'Consulting', 'Finance', 'Venture Capital', 'Private Equity', 'Healthcare', 'Other']} />
            </Field>
            <Field label="Target role">
              <TextInput value={target.role} onChange={v => setTarget({ ...target, role: v })} />
            </Field>
            <div className="col-span-2">
              <Field label="Target companies">
                <div className="flex flex-wrap gap-2">
                  {target.companies.map(c => (
                    <Chip key={c} variant="selected" removable onRemove={() => removeCompany(c)}>{c}</Chip>
                  ))}
                  <input
                    value={companyDraft}
                    onChange={e => setCompanyDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany(); } }}
                    placeholder="+ add"
                    className="h-8 px-3 rounded-full text-[12.5px] bg-transparent focus-ring transition-shadow"
                    style={{ border: '1px dashed #cdbf9f', width: 92, color: '#3d352c' }}
                  />
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Target geography">
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...geoOptions, ...target.geography])).map(g => {
                    const sel = target.geography.includes(g);
                    return (
                      <Chip key={g} variant={sel ? 'selected' : 'default'} checked={sel} onClick={() => toggleGeo(g)}>
                        {g}
                      </Chip>
                    );
                  })}
                  <Picker options={CITY_OPTIONS} selected={target.geography} label="more"
                    onPick={g => toggleGeo(g)} />
                </div>
              </Field>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Btn onClick={() => showToast('Profile updated.')}>Save changes</Btn>
          </div>
        </div>

        {/* Materials */}
        <div className="bg-white border rounded-2xl p-7" style={{ borderColor: '#e5d8be' }}>
          <SectionLabel className="mb-5">Materials</SectionLabel>
          <div className="flex flex-col gap-2">
            {user.materials.map(m => (
              <div key={m.name} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: '#f0e6d0' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#f3e2cd', color: '#7a4a25' }}>
                  <Icon.FileText size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] text-ink-2 truncate">{m.name}</div>
                  <div className="text-[11.5px] text-ink-3 capitalize">{m.kind === 'cv' ? 'CV / resume' : m.kind === 'assessment' ? 'Career assessment' : 'Writing sample'}</div>
                </div>
                <button onClick={() => showToast(`Re-uploaded ${m.name}`)} className="text-[12.5px] text-sienna-ink hover:underline">Re-upload</button>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={() => showToast('Added another sample.')} className="inline-flex items-center gap-1.5 text-[12.5px] text-sienna-ink hover:underline">
              <Icon.Plus size={12} />
              Add another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
