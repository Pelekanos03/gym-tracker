import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../types';

/**
 * Drop-in replacement for an exercise <select>: a button showing the
 * current pick that opens a sheet with a search box, body-part filter
 * chips, and a scrollable list grouped by primary muscle. On a phone the
 * sheet slides up from the bottom; on desktop it's a centred dialog.
 */
export function ExercisePicker({
  exercises,
  value,
  onChange,
  placeholder = 'Pick exercise',
  style,
}: {
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const selected = exercises.find((ex) => ex.id === value);

  return (
    <>
      <button
        type="button"
        className={`picker-trigger${selected ? '' : ' empty'}`}
        onClick={() => setOpen(true)}
        style={style}
      >
        <span>{selected ? selected.name : placeholder}</span>
        <span aria-hidden className="picker-chevron">
          ▾
        </span>
      </button>
      {open && (
        <PickerSheet
          exercises={exercises}
          value={value}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PickerSheet({
  exercises,
  value,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string>();
  const searchRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape closes; the page behind stops scrolling while the sheet is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focusing straight away on a phone pops the keyboard over half the
    // list; only do it where there's a real keyboard.
    if (window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const muscles = useMemo(
    () => [...new Set(exercises.map((ex) => ex.primaryMuscle))].sort((a, b) => a.localeCompare(b)),
    [exercises],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = exercises.filter(
      (ex) =>
        (!muscle || ex.primaryMuscle === muscle) &&
        (!q || ex.name.toLowerCase().includes(q) || ex.primaryMuscle.toLowerCase().includes(q)),
    );
    const byMuscle = new Map<string, Exercise[]>();
    for (const ex of [...matches].sort((a, b) => a.name.localeCompare(b.name))) {
      byMuscle.set(ex.primaryMuscle, [...(byMuscle.get(ex.primaryMuscle) ?? []), ex]);
    }
    return [...byMuscle.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [exercises, query, muscle]);

  const firstMatch = groups[0]?.[1][0];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-label="Pick an exercise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && firstMatch) {
                e.preventDefault();
                onPick(firstMatch.id);
              }
            }}
            placeholder="Search exercises…"
            aria-label="Search exercises"
          />
          <button type="button" className="ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="chips">
          <button
            type="button"
            className={`chip${muscle ? '' : ' active'}`}
            onClick={() => setMuscle(undefined)}
          >
            All
          </button>
          {muscles.map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${muscle === m ? ' active' : ''}`}
              onClick={() => setMuscle(muscle === m ? undefined : m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="sheet-list">
          {groups.length === 0 && (
            <p className="muted" style={{ padding: '1rem' }}>
              No exercise matches “{query}”. You can add it from My programs → Exercise library.
            </p>
          )}
          {groups.map(([groupMuscle, list]) => (
            <div key={groupMuscle}>
              <div className="sheet-group">
                {groupMuscle} <span className="muted">· {list.length}</span>
              </div>
              {list.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={`sheet-item${ex.id === value ? ' selected' : ''}`}
                  onClick={() => onPick(ex.id)}
                >
                  <span>
                    {ex.name}
                    {ex.isCompetitionLift && <span className="muted"> · competition lift</span>}
                  </span>
                  <span className="muted" style={{ fontSize: '.75rem' }}>
                    {ex.category === 'COMPOUND' ? 'Compound' : 'Isolation'}
                    {ex.id === value && ' · ✓'}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
