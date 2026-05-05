// Onboarding — conversational flow with a live user.md preview on the right.

function Onboarding({ onDone }) {
  const { Avatar, Icon } = window.CRM;
  const steps = window.ONBOARDING_STEPS;
  const [i, setI] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [draft, setDraft] = React.useState("");
  const [multi, setMulti] = React.useState([]);
  const [transcript, setTranscript] = React.useState([
    { from: "agent", text: steps[0].agentMsg }
  ]);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [transcript]);

  const step = steps[i];
  const pct = Math.round(((i) / steps.length) * 100);

  function submit(value) {
    const label = Array.isArray(value) ? value.map(v => step.options.find(o => o.k === v)?.label || v).join(", ")
                  : typeof value === "object" ? value.label
                  : value;
    setAnswers(a => ({ ...a, [step.field]: value }));
    const next = [...transcript, { from: "user", text: label || "—" }];
    if (i < steps.length - 1) {
      next.push({ from: "agent", text: steps[i+1].agentMsg });
      setTranscript(next);
      setI(i+1);
      setDraft(""); setMulti([]);
    } else {
      setTranscript([...next, { from: "agent", text: `Perfect. I've got what I need to start. Meet your coach — ${answers.agentName || "Orbit"}.` }]);
      setTimeout(onDone, 1200);
    }
  }

  function skipExtension() { submit({ label: "Skip for now" }); }
  function installExtension() { submit({ label: "Installed · ready" }); }

  return (
    <div className="onb">
      <div className="onb__left">
        <div className="onb__progress"><div style={{width: `${pct}%`}} /></div>

        <div className="onb__stream scroll" ref={streamRef}>
          <div className="onb__intro">
            <div className="onb__kicker">Setup · 4 min</div>
            <h1>Let's build your coach.</h1>
            <p>Everything you tell me becomes part of my memory. You can edit any of it later from Settings.</p>
          </div>

          {transcript.map((m, idx) => (
            <div key={idx} className={"onb__msg onb__msg--" + m.from}>
              {m.from === "agent"
                ? <span className="onb__avatar onb__avatar--agent">c</span>
                : <span className="onb__avatar onb__avatar--user">AM</span>}
              <div className="onb__bubble">{m.text.split("\n\n").map((p,j) => <p key={j}>{p}</p>)}</div>
            </div>
          ))}

          <div className="onb__input">
            {step.options && !step.multi && (
              <div className="onb__options">
                {step.options.map(o => (
                  <button key={o.k} className="onb__option" onClick={() => submit(o)}>
                    <div className="onb__option-k">{o.label}</div>
                    <div className="onb__option-h">{o.hint}</div>
                  </button>
                ))}
              </div>
            )}

            {step.options && step.multi && (
              <>
                <div className="onb__options">
                  {step.options.map(o => {
                    const on = multi.includes(o.k);
                    return (
                      <button key={o.k} className="onb__option" data-on={on} onClick={() => setMulti(m => on ? m.filter(x => x !== o.k) : [...m, o.k])}>
                        <div className="onb__option-k">{o.label} {on && "✓"}</div>
                        <div className="onb__option-h">{o.hint}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="onb__row">
                  <button className="btn btn--ghost" onClick={() => submit([])}>Skip</button>
                  <div style={{flex:1}} />
                  <button className="btn btn--primary" onClick={() => submit(multi)}>Continue <Icon name="arrow-right" size={12} /></button>
                </div>
              </>
            )}

            {step.custom === "extension" && (
              <div className="onb__ext">
                <div className="onb__ext-steps">
                  <div><b>1.</b> Click below to open the Chrome Web Store</div>
                  <div><b>2.</b> Click "Add to Chrome"</div>
                  <div><b>3.</b> Pin the extension so you can reach it from LinkedIn</div>
                </div>
                <div className="onb__row" style={{marginTop: 14}}>
                  <button className="btn btn--ghost" onClick={skipExtension}>Skip for now</button>
                  <div style={{flex:1}} />
                  <button className="btn btn--primary" onClick={installExtension}><Icon name="external" size={12}/> Add to Chrome</button>
                </div>
              </div>
            )}

            {!step.options && !step.custom && (
              <>
                {step.quickPicks && (
                  <div className="onb__pills">
                    {step.quickPicks.map(q => (
                      <button key={q} className="chip" onClick={() => setDraft(q)}>{q}</button>
                    ))}
                  </div>
                )}
                <div className="onb__field">
                  {step.multiline ? (
                    <textarea className="onb__textarea" placeholder={step.placeholder} value={draft} onChange={e => setDraft(e.target.value)} rows={3} />
                  ) : (
                    <input className="onb__text" placeholder={step.placeholder} value={draft} onChange={e => setDraft(e.target.value)} />
                  )}
                  <div className="onb__row" style={{marginTop: 10}}>
                    {step.uploadOk && <button className="btn"><Icon name="paperclip" size={12}/> Attach CV / cover letter</button>}
                    <div style={{flex:1}} />
                    <button className="btn btn--primary" onClick={() => submit(draft)} disabled={!draft.trim()}>
                      Continue <Icon name="arrow-right" size={12} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <aside className="onb__right scroll">
        <div className="onb__right-head">
          <div className="onb__kicker">Being written</div>
          <div className="mono" style={{fontSize: 11, color: "var(--ink-3)"}}>~/memory/user.md</div>
        </div>
        <div className="onb__md">
          <div className="onb__md-h1"># {answers.agentName ? `${answers.agentName}'s memory of Alex` : "Your coach's memory"}</div>
          <UserMd answers={answers} />
        </div>

        <div className="onb__right-head" style={{marginTop: 22}}>
          <div className="onb__kicker">System</div>
          <div className="mono" style={{fontSize: 11, color: "var(--ink-3)"}}>~/memory/agents.md</div>
        </div>
        <div className="onb__md onb__md--sm">
          <div className="onb__md-line">role: networking coach</div>
          <div className="onb__md-line">voice: {answers.style?.k || "—"}</div>
          <div className="onb__md-line">goals_priority: {answers.goal ? "defined" : "—"}</div>
          <div className="onb__md-line">network_gaps: {Array.isArray(answers.gaps) ? answers.gaps.join(", ") || "—" : "—"}</div>
          <div className="onb__md-line">extension: {answers.extension?.label || "—"}</div>
        </div>
      </aside>
    </div>
  );
}

function UserMd({ answers }) {
  const rows = [];
  if (answers.about) rows.push(["## Background", answers.about]);
  if (answers.goal) rows.push(["## Current networking goal", answers.goal]);
  if (answers.style) rows.push(["## Communication style", `${answers.style.label} — ${answers.style.hint}`]);
  if (Array.isArray(answers.gaps) && answers.gaps.length) rows.push(["## Network gaps (weight discovery here)", answers.gaps.map(g => `- ${g}`).join("\n")]);
  if (!rows.length) return <div className="onb__md-line muted">Your answers will appear here as we talk.</div>;
  return rows.map(([h, b], i) => (
    <div key={i} style={{marginBottom: 14}}>
      <div className="onb__md-h2">{h}</div>
      <div className="onb__md-body">{b}</div>
    </div>
  ));
}

window.CRM.Onboarding = Onboarding;
