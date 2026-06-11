// Main App, routing + state

function App() {
  const { Sidebar, ToastProvider, useToast } = Shared;
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const { Sidebar } = Shared;
  const showToast = Shared.useToast();

  // Top-level mode
  const [mode, setMode] = useState('auth'); // 'auth' | 'onboarding' | 'app'
  const [firstTime, setFirstTime] = useState(false);
  const [user, setUser] = useState(SEED.USER);
  const [contacts, setContacts] = useState(SEED.CONTACTS);

  // App routing
  const [screen, setScreen] = useState('home'); // home | discover | contacts | settings | detail | draft | prep-loading | prep
  const [activeContactId, setActiveContactId] = useState(null);

  // Meeting prep state
  const [prepIntakeOpen, setPrepIntakeOpen] = useState(false);
  const [generatedPreps, setGeneratedPreps] = useState({}); // contactId -> prep override
  const [stories, setStories] = useState(SEED.STORIES || {}); // contactId -> story

  // Discovery, LinkedIn channel connection status (session-only)
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  // Tweaks (Tweaks panel toggle)
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "heroGreeting": "Hello",
    "homeFirstTime": false,
    "linkedInPreConnected": false,
    "draftLanguage": "French (tu)",
    "displayFont": "Instrument Serif"
  }/*EDITMODE-END*/);
  useEffect(() => { setFirstTime(tweaks.homeFirstTime); }, [tweaks.homeFirstTime]);

  // Swap the display serif live via a CSS variable consumed by .font-serif-i.
  // Selected font keeps the italic style declared on .font-serif-i; the four
  // non-italic faces (Source Serif 4, Lora, DM Serif Display) ship italic
  // variants that read as more refined display type when the rule fires.
  useEffect(() => {
    document.documentElement.style.setProperty('--serif-display', `'${tweaks.displayFont}'`);
  }, [tweaks.displayFont]);

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeStory = activeContact ? stories[activeContact.id] : null;
  const activeScheduledMeeting = activeContact ? (SEED.SCHEDULED_MEETINGS || {})[activeContact.id] : null;
  const activeMeetingPrep = activeContact ? (generatedPreps[activeContact.id] || (SEED.MEETING_PREPS || {})[activeContact.id]) : null;

  const goTo = (s) => setScreen(s);
  const openContact = (id) => { setActiveContactId(id); setScreen('detail'); setPrepIntakeOpen(false); };
  const openDraft = () => setScreen('draft');

  // Meeting prep handlers
  const openPrepIntake = () => setPrepIntakeOpen(true);
  const closePrepIntake = () => setPrepIntakeOpen(false);
  const generatePrep = (formData) => {
    // formData: { purpose, duration, goal, focus } from the intake form
    if (!activeContact) return;
    setPrepIntakeOpen(false);
    // If we already have a seed prep for this contact, merge in the form data
    const existing = (SEED.MEETING_PREPS || {})[activeContact.id];
    const merged = existing ? {
      ...existing,
      ...formData,
      createdAt: new Date().toISOString().slice(0, 10)
    } : {
      id: `prep-${activeContact.id}-${Date.now()}`,
      contactId: activeContact.id,
      createdAt: new Date().toISOString().slice(0, 10),
      ...formData,
      snapshot: { personLines: [], companyLines: [], whyMatters: '', dontDo: '' },
      person: { journey: '', mutuals: [], sharedLinks: [], angle: '' },
      agenda: { blocks: [], tone: '' },
      questions: { phases: [] }
    };
    setGeneratedPreps(prev => ({ ...prev, [activeContact.id]: merged }));
    setScreen('prep-loading');
  };
  const onPrepLoadingDone = () => setScreen('prep');
  const openPrep = () => setScreen('prep');
  const onDraftFollowUpFromNotes = (notes) => {
    // For demo: just toast + jump to draft editor for this contact
    showToast('Draft prepared from your meeting notes.');
    setScreen('draft');
  };
  const updateStory = (contactId, patch) => {
    setStories(prev => ({ ...prev, [contactId]: { ...(prev[contactId] || {}), ...patch } }));
  };

  // Auth -> Onboarding -> Home
  const onSignedIn = ({ email }) => {
    setUser({ ...user, email });
    setMode('onboarding');
  };
  const onSampleData = () => {
    setMode('app');
    setFirstTime(false);
    setScreen('home');
    setTimeout(() => showToast(`${user.firstName}, your coach is ready. 12 alumni waiting for you.`), 350);
  };
  const onboardingDone = () => {
    setMode('app');
    setFirstTime(false); // tester demo: jump straight into populated state
    setScreen('home');
    setTimeout(() => showToast(`${user.firstName}, your coach is ready. 12 alumni waiting for you.`), 350);
  };

  // Contact actions
  const updateContact = (id, patch) => setContacts(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  const onSave = () => {
    if (!activeContact) return;
    updateContact(activeContact.id, { status: 'Saved', lastContact: 'just now', lastContactLabel: 'Just now' });
    showToast(`Saved ${activeContact.first} to your contacts.`);
  };
  const onMet = () => {
    if (!activeContact) return;
    updateContact(activeContact.id, { status: 'Met', lastContact: 'just now', lastContactLabel: 'Just now', followUpDue: false, meetings: (activeContact.meetings || 0) + 1 });
    showToast(`Meeting logged. We'll remind you to follow up in 30 days.`);
  };
  const onArchive = () => {
    if (!activeContact) return;
    updateContact(activeContact.id, { status: 'Archived' });
    showToast(`Archived ${activeContact.first}.`);
    setScreen('contacts');
  };
  // Discovery, save a lead from the Tinder deck
  const onSaveLead = (lead) => {
    setContacts(cs => {
      const exists = cs.find(c => c.id === lead.id);
      if (exists) {
        return cs.map(c => c.id === lead.id
          ? { ...c, status: 'Saved', savedAt: Date.now(), lastContact: 'just now', lastContactLabel: 'Just now' }
          : c);
      }
      // Append new contact from deck
      return [...cs, {
        ...lead,
        status: 'Saved',
        savedAt: Date.now(),
        lastContact: 'just now',
        lastContactLabel: 'Just now',
        followUpDue: false,
        drafts: 0,
        notes: 0,
        meetings: 0,
        noteEntries: [],
        meetingEntries: [],
      }];
    });
    showToast(`${lead.first} saved to your contacts.`);
  };

  // Contact detail, add note + log meeting
  const onAddNote = (id, text) => {
    if (!text || !text.trim()) return;
    const entry = { id: `n-${Date.now()}`, date: new Date(), text: text.trim() };
    setContacts(cs => cs.map(c => c.id === id
      ? { ...c, notes: (c.notes || 0) + 1, noteEntries: [entry, ...(c.noteEntries || [])] }
      : c));
    showToast('Note added.');
  };

  const onLogMeeting = (id, meeting) => {
    const entry = { id: `m-${Date.now()}`, date: meeting.date || new Date(), title: meeting.title || 'Meeting', text: meeting.text || '', file: meeting.file || null };
    setContacts(cs => cs.map(c => c.id === id
      ? {
          ...c,
          status: 'Met',
          meetings: (c.meetings || 0) + 1,
          meetingEntries: [entry, ...(c.meetingEntries || [])],
          followUpDue: false,
          lastContact: 'just now',
          lastContactLabel: 'Just now',
        }
      : c));
    showToast('Meeting logged.');
  };

  const onDraftSent = () => {
    if (!activeContact) return;
    updateContact(activeContact.id, { status: 'Contacted', lastContact: 'just now', lastContactLabel: 'Just now', drafts: (activeContact.drafts || 0) + 1 });
    showToast(`Sent to ${activeContact.first}. Logged in your CRM.`);
    setScreen('detail');
  };

  // "Pick up where you left off", open most urgent pending contact (Mathieu has a pending draft)
  const onPickup = () => {
    const pending = contacts.find(c => c.drafts > 0 && c.status === 'Saved') || contacts[1];
    setActiveContactId(pending.id);
    setScreen('detail');
  };

  // ----- Render -----
  if (mode === 'auth') {
    return <AuthScreen onSignedIn={onSignedIn} onSampleData={onSampleData} />;
  }
  if (mode === 'onboarding') {
    return <OnboardingScreen onDone={onboardingDone} onSample={onSampleData} />;
  }

  const navScreen = (() => {
    if (screen === 'home' || screen === 'discover' || screen === 'contacts' || screen === 'settings') return screen;
    if (screen === 'detail') return activeContact?.status === 'New' ? 'discover' : 'contacts';
    if (screen === 'draft' || screen === 'prep' || screen === 'prep-loading') return activeContact?.status === 'New' ? 'discover' : 'contacts';
    return 'home';
  })();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4ede0' }}>
      <Sidebar current={navScreen} onNav={(s) => { setScreen(s); }} user={user} />
      <main className="flex-1 overflow-y-auto scroll-area">
        <div key={screen + (activeContactId || '')} className="fade-in min-h-full flex flex-col">
          {screen === 'home' && (
            <HomeScreen
              contacts={contacts}
              pendingCount={3}
              newLeadCount={12}
              firstTime={firstTime}
              userFirstName={user.firstName}
              greeting={tweaks.heroGreeting}
              onPickup={onPickup}
              onDiscover={() => setScreen('discover')}
              onOpenContact={openContact}
            />
          )}
          {screen === 'discover' && (
            <DiscoverScreen
              user={user}
              linkedInConnected={linkedInConnected || tweaks.linkedInPreConnected}
              onConnectLinkedIn={() => setLinkedInConnected(true)}
              onSaveLead={onSaveLead}
              onOpenContact={openContact}
            />
          )}
          {screen === 'contacts' && (
            <ContactsScreen contacts={contacts} onOpenContact={openContact} onDiscover={() => setScreen('discover')} />
          )}
          {screen === 'settings' && (
            <SettingsScreen user={user} onSignOut={() => { setMode('auth'); setScreen('home'); }} />
          )}
          {screen === 'detail' && (
            <ContactDetailScreen
              contact={activeContact}
              story={activeStory}
              scheduledMeeting={activeScheduledMeeting}
              meetingPrep={activeMeetingPrep}
              prepIntakeOpen={prepIntakeOpen}
              onBack={() => setScreen(navScreen)}
              onDraft={openDraft}
              onSave={onSave}
              onMet={onMet}
              onArchive={onArchive}
              onAddNote={(text) => onAddNote(activeContact.id, text)}
              onLogMeeting={(meeting) => onLogMeeting(activeContact.id, meeting)}
              onOpenPrepIntake={openPrepIntake}
              onClosePrepIntake={closePrepIntake}
              onPrepMeeting={generatePrep}
              onOpenPrep={openPrep}
              onUpdateStory={updateStory}
            />
          )}
          {screen === 'prep-loading' && activeContact && (
            <MeetingPrepLoading contact={activeContact} onDone={onPrepLoadingDone} />
          )}
          {screen === 'prep' && activeContact && (
            <MeetingPrepScreen
              contact={activeContact}
              prep={activeMeetingPrep}
              onBack={() => setScreen('detail')}
              onDraftFollowUp={onDraftFollowUpFromNotes}
            />
          )}
          {screen === 'draft' && activeContact && (
            <DraftEditorScreen
              contact={activeContact}
              onBack={() => setScreen('detail')}
              onSent={onDraftSent}
            />
          )}
        </div>
      </main>

      <WarmlyTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

// --- Tweaks panel ---
function WarmlyTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Typography">
        <TweakSelect
          label="Display serif"
          value={tweaks.displayFont}
          options={[
            { value: 'Instrument Serif',   label: 'Instrument Serif · current' },
            { value: 'Cormorant Garamond', label: 'Cormorant Garamond · refined' },
            { value: 'EB Garamond',        label: 'EB Garamond · classical' },
            { value: 'Source Serif 4',     label: 'Source Serif 4 · neutral' },
            { value: 'Lora',               label: 'Lora · balanced' },
            { value: 'DM Serif Display',   label: 'DM Serif Display · bold' },
          ]}
          onChange={v => setTweak('displayFont', v)}
        />
        <FontSpecimen tweaks={tweaks} />
      </TweakSection>
      <TweakSection label="Home state">
        <TweakRadio
          label="First visit"
          value={tweaks.homeFirstTime ? 'first' : 'returning'}
          options={[
            { value: 'first', label: 'First time' },
            { value: 'returning', label: 'Returning' },
          ]}
          onChange={v => setTweak('homeFirstTime', v === 'first')}
        />
        <TweakText
          label="Greeting"
          value={tweaks.heroGreeting}
          onChange={v => setTweak('heroGreeting', v)}
        />
      </TweakSection>
      <TweakSection label="Discover">
        <TweakToggle
          label="LinkedIn pre-connected"
          value={tweaks.linkedInPreConnected}
          onChange={v => setTweak('linkedInPreConnected', v)}
        />
      </TweakSection>
      <TweakSection label="Draft language">
        <TweakRadio
          label="Default"
          value={tweaks.draftLanguage}
          options={[
            { value: 'French (tu)', label: 'FR · tu' },
            { value: 'French (vous)', label: 'FR · vous' },
            { value: 'English', label: 'EN' },
          ]}
          onChange={v => setTweak('draftLanguage', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// --- Font specimen, live preview of the selected display serif ---
function FontSpecimen({ tweaks }) {
  return (
    <div
      className="rounded-md border px-3 py-2.5 mt-1"
      style={{ borderColor: '#e5d8be', background: '#faf5ea' }}
    >
      <div className="font-serif-i text-ink leading-[1.05]" style={{ fontSize: 26 }}>
        Hello Liyang.
      </div>
      <div className="text-[11px] text-ink-3 mt-1">
        {tweaks.displayFont} · italic display
      </div>
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
