// "The story so far", single AI-written narrative block on Contact Detail.
// Persisted edits live in component state; on regenerate, only unedited
// paragraphs are overwritten (manual edits are preserved).

function StorySoFar({ contact, story, onUpdateStory }) {
  const { SectionLabel, Btn } = Shared;
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const taRef = useRef();

  // No story for this contact yet, show goal-setting nudge
  if (!story) {
    return (
      <div
        className="my-7 rounded-2xl border px-6 py-5"
        style={{ background: '#fbf6ec', borderColor: '#ebdfc4' }}>
        
        <SectionLabel className="mb-2">The story so far</SectionLabel>
        <p className="text-[14.5px] text-ink-2 leading-relaxed" style={{ maxWidth: 640 }}>
          Add a goal for this contact to help Warmly remember why this relationship matters.
        </p>
        <div className="mt-3">
          <Btn size="sm" variant="secondary" icon={Icon.Plus}>Add a goal</Btn>
        </div>
      </div>);

  }

  const paragraphs = story.paragraphs || [];
  const fullText = paragraphs.join('\n\n');

  const startEdit = () => {
    setDraftText(fullText);
    setEditing(true);
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftText('');
  };

  const saveEdit = () => {
    const newParas = draftText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    onUpdateStory && onUpdateStory(contact.id, { paragraphs: newParas, updatedAt: 'Edited just now', userEdited: true });
    setEditing(false);
  };

  return (
    <div
      className="my-7 rounded-2xl border px-7 py-6 relative group"
      style={{ background: '#fbf6ec', borderColor: '#ebdfc4' }}>
      
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-serif-i text-ink leading-tight" style={{ fontSize: 20 }}>
            The story so far
          </h3>
          {story.updatedAt &&
          <span className="text-[11px] text-ink-4 font-mono-tag" style={{ fontSize: 9.5, letterSpacing: '0.06em' }}>
              {story.updatedAt}
            </span>
          }
        </div>
        {!editing &&
        <button
          onClick={startEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px] text-ink-3 hover:text-ink inline-flex items-center gap-1 px-2 h-7 rounded-md hover:bg-white">
          
            <Icon.Edit size={11} />
            Edit
          </button>
        }
      </div>

      {editing ?
      <div>
          <textarea
          ref={taRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          className="w-full text-[14.5px] leading-[1.6] text-ink-2 bg-white border rounded-lg p-4 resize-none outline-none focus-ring"
          style={{ borderColor: '#d9cdb4', maxWidth: 720, minHeight: 200 }}
          rows={Math.max(8, draftText.split('\n').length + 1)} />
        
          <div className="flex items-center justify-between mt-3">
            <div className="text-[11.5px] text-ink-4">Separate paragraphs with a blank line. Your edits will be preserved on regenerate.</div>
            <div className="flex items-center gap-2">
              <button onClick={cancelEdit} className="text-[12.5px] text-ink-3 hover:text-ink px-3 h-8">Cancel</button>
              <Btn size="sm" onClick={saveEdit} icon={Icon.Check}>Save</Btn>
            </div>
          </div>
        </div> :

      <div className="flex flex-col gap-4" style={{ maxWidth: 680 }}>
          {paragraphs.map((p, i) =>
        <p
          key={i}
          className="text-[15px] leading-[1.6] text-ink-2"
          style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
          
              {p}
            </p>
        )}
        </div>
      }
    </div>);

}

window.StorySoFar = StorySoFar;
