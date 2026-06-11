// Auth screen, Sign-up / Sign-in toggle, sample-data shortcut

function AuthScreen({ onSignedIn, onSampleData }) {
  const { Wordmark, Btn, Field, TextInput } = Shared;
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submitLabel = mode === 'signup' ? 'Create account' : 'Log in';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#f4ede0' }}>
      <div className="mb-9">
        <Wordmark size={42} dark />
      </div>
      <div className="w-full max-w-[420px] bg-white border rounded-2xl px-7 pt-6 pb-7" style={{ borderColor: '#e5d8be', boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 6px 28px rgba(31,27,22,0.06)' }}>
        {/* Toggle */}
        <div className="flex items-center p-1 rounded-lg mb-6" style={{ background: '#f4ede0' }}>
          {['signup', 'login'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 h-9 text-[13px] font-medium rounded-md transition-all"
              style={{
                background: mode === m ? '#ffffff' : 'transparent',
                color: mode === m ? '#1f1b16' : '#6b5e4a',
                boxShadow: mode === m ? '0 1px 2px rgba(31,27,22,0.06)' : 'none',
              }}
            >
              {m === 'signup' ? 'Sign up' : 'Log in'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Email">
            <TextInput value={email} onChange={setEmail} placeholder="you@insead.edu" icon={Icon.Mail} />
          </Field>
          <Field label="Password">
            <TextInput value={password} onChange={setPassword} placeholder="••••••••" type="password" icon={Icon.Lock} />
          </Field>
        </div>

        <Btn className="w-full mt-5" size="lg" onClick={() => onSignedIn({ email: email || 'liyang@insead.edu' })}>
          {submitLabel}
        </Btn>

        <div className="flex items-center gap-3 my-5 text-[11.5px] text-ink-3">
          <div className="flex-1 h-px" style={{ background: '#d9cdb4' }} />
          <span>or</span>
          <div className="flex-1 h-px" style={{ background: '#d9cdb4' }} />
        </div>

        <Btn variant="secondary" className="w-full" size="lg" onClick={() => onSignedIn({ email: 'liyang@insead.edu' })}>
          <Icon.Google size={16} />
          <span>Continue with Google</span>
        </Btn>
      </div>

      <div className="mt-6 text-[13px] text-ink-3">
        {mode === 'signup'
          ? <>Already have an account? <button onClick={() => setMode('login')} className="text-sienna-ink underline-offset-2 hover:underline">Log in →</button></>
          : <>New to Warmly? <button onClick={() => setMode('signup')} className="text-sienna-ink underline-offset-2 hover:underline">Create an account →</button></>}
      </div>

      <button onClick={onSampleData} className="mt-4 text-[13px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors hover:bg-white" style={{ borderColor: '#d9cdb4', color: '#7a4a25' }}>
        <Icon.Sparkles size={13} />
        Or try with sample data →
      </button>
    </div>
  );
}

window.AuthScreen = AuthScreen;
