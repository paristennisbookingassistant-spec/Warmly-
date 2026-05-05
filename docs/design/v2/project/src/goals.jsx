// Goals — tasteful gamification (streak, weekly targets, level, habits, quests)
function Goals() {
  const { Icon } = window.CRM;

  // --- Data (designed, not random) -------------------------------------
  const today = 4; // Thursday (0=Mon)
  const weekDays = ["M","T","W","T","F","S","S"];
  const weekStreak = [true, true, true, true, true, false, false]; // 5/7

  const weekly = [
    { name: "Conversations", current: 4, target: 5, hint: "1 more to hit your weekly rhythm" },
    { name: "Reach-outs",    current: 3, target: 3, hint: "Met. Anything beyond is bonus.", met: true },
    { name: "Coffees",       current: 1, target: 2, hint: "1 booked for Friday with Amélie" },
  ];

  const habits = [
    { name: "Daily check-in", sub: "Open Warmly", cells: [3,3,2,3,3,3,3,2,3,3,3,3,3,3,2,3,3,3,3,3,3], total: 21, unit: "days" },
    { name: "Logged a touch", sub: "Coffee, call, msg", cells: [2,3,1,2,3,2,3,0,2,3,2,3,2,1,2,3,2,3,2,3,2], total: 17, unit: "of 21" },
    { name: "Followed a nudge", sub: "Acted on suggestion", cells: [1,2,0,2,1,3,2,1,0,2,1,2,3,1,0,2,1,3,2,2,1], total: 14, unit: "of 21" },
    { name: "Asked a 2nd-circle intro", sub: "From a contact", cells: [0,1,0,0,2,0,1,0,0,1,0,0,2,0,0,1,0,1,0,0,1], total: 5, unit: "this month" },
  ];

  const quests = [
    {
      tag: "This week",
      title: "Reconnect with someone you haven't seen in 90+ days",
      body: "Marie Chen, Tomas Volkov and 4 others are due. Pick one — Warmly drafts the message.",
      progress: 0, target: 1, cta: "See suggestions",
    },
    {
      tag: "Quiet wins",
      title: "Send 3 thank-yous after coffees",
      body: "A short thank-you within 24h doubles the chance someone remembers you. You're at 1/3 this month.",
      progress: 1, target: 3, cta: "Draft one",
    },
    {
      tag: "Network depth",
      title: "Add a second connection from your INSEAD MBA cohort",
      body: "Right now 17% of your contacts are from school. Diversifying reduces the 'echo' in suggestions.",
      progress: 1, target: 2, cta: "Browse cohort",
    },
    {
      tag: "Done",
      title: "Logged 5 conversations this week",
      body: "On a Wednesday — earliest you've hit it in 6 weeks. Streak preserved.",
      progress: 5, target: 5, cta: null, done: true,
    },
  ];

  // Level data
  const level = { num: "III", name: "Connector", quote: "You don't keep score, but you remember who said what — and that's the rare thing.", progress: 64, current: 87, next: 120 };

  return (
    <div className="goals">
      <div className="goals__inner">

        {/* Header */}
        <header className="goals__head">
          <div>
            <div className="lab__eyebrow" style={{marginBottom: 14}}>Goals · Week of Mar 11</div>
            <h1 className="goals__title">Keep tending.</h1>
            <p className="goals__sub">
              Networks decay. <b>Warmly</b> keeps a quiet score — not to nag you, but so you can see the shape of your effort. Five days in, you're on pace.
            </p>
          </div>

          <div className="goals__streak">
            <div className="goals__flame"><Icon name="flame" size={26} /></div>
            <div>
              <div className="goals__streak-n">12<span style={{fontFamily: "var(--font-ui)", fontStyle: "normal", fontSize: 14, color: "var(--ink-3)", marginLeft: 8}}>day streak</span></div>
              <div className="goals__streak-l">Personal best · 14</div>
              <div className="goals__streak-bar">
                {weekDays.map((d, i) => (
                  <div key={i} className="goals__streak-day"
                    data-on={weekStreak[i]}
                    data-today={i === today}
                    title={d}
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Weekly targets */}
        <div className="goals__weekly">
          {weekly.map(w => {
            const p = Math.min(100, Math.round((w.current / w.target) * 100));
            return (
              <div key={w.name} className="weekly">
                <div className="weekly__top">
                  <span className="weekly__name">{w.name}</span>
                  <span className="weekly__nums"><b>{w.current}</b><span>of {w.target}{w.met ? " · met" : ""}</span></span>
                </div>
                <div className="weekly__ring" data-met={w.met} style={{"--p": p + "%"}} />
                <div className="weekly__hint">{w.hint}</div>
              </div>
            );
          })}
        </div>

        {/* Level / identity */}
        <div className="goals__level">
          <div>
            <div className="level__title">Networking level</div>
            <div className="level__name">Level {level.num} · <em>{level.name}</em></div>
            <div className="level__quote">"{level.quote}"</div>
            <div className="level__bar" style={{"--p": level.progress + "%"}} />
            <div className="level__progress">
              <span>{level.current} / {level.next} touches → Level IV · Anchor</span>
              <span>{level.next - level.current} to go</span>
            </div>
          </div>
          <div className="level__badge">{level.num}</div>
        </div>

        {/* Habits */}
        <h2 className="goals__section-h">Habits, last three weeks</h2>
        <p className="goals__section-sub">
          Each square is a day. Brighter means more activity. The point isn't to fill the grid — it's to notice when it goes pale.
        </p>
        <div className="heatmap">
          {habits.map(h => (
            <div key={h.name} className="heatmap__row">
              <div className="heatmap__habit">
                {h.name}
                <span className="heatmap__habit-sub">{h.sub}</span>
              </div>
              <div className="heatmap__cells">
                {h.cells.map((l, i) => (
                  <div key={i} className="heatmap__cell" data-l={l || ""} title={`Day ${i+1}`} />
                ))}
              </div>
              <div className="heatmap__total">
                {h.total}
                <small>{h.unit}</small>
              </div>
            </div>
          ))}
        </div>

        {/* Quests */}
        <h2 className="goals__section-h">Suggested next moves</h2>
        <p className="goals__section-sub">
          Small, specific, optional. Each one comes with a draft you can send in a click — or skip.
        </p>
        <div className="quests">
          {quests.map((q, i) => {
            const p = Math.round((q.progress / q.target) * 100);
            return (
              <div key={i} className={"quest" + (q.done ? " quest--done" : "")}>
                <div className="quest__tag">{q.tag}</div>
                <div className="quest__title">{q.title}</div>
                <div className="quest__body">{q.body}</div>
                <div className="quest__bar" style={{"--p": p + "%"}} />
                <div className="quest__foot">
                  <span>{q.progress} / {q.target}</span>
                  {q.cta && <button className="quest__cta">{q.cta} <Icon name="arrow-right" size={11} /></button>}
                  {q.done && <span style={{display: "inline-flex", alignItems: "center", gap: 4, color: "oklch(from var(--good) calc(l - 0.15) c h)"}}><Icon name="check" size={12} /> Complete</span>}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

window.CRM = Object.assign(window.CRM || {}, { Goals });
