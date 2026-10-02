import { useEffect, useState } from 'react';
import { api } from '../api';
import type { BlockDay, Program, TrainingBlock } from '../types';

/**
 * Pick the block you're running and the day to train from it. Done days
 * are marked "done" so it's obvious where you left off, and the day picker starts
 * on the suggested next day — but any day can be picked, in any order.
 * Switching (or dropping) the block asks for confirmation first.
 */
export function BlockPicker({
  userId,
  block,
  programs,
  onChange,
  onLoadDay,
  dayLoaded,
  onClear,
}: {
  userId: string;
  /** undefined while loading, null when no block is running. */
  block: TrainingBlock | null | undefined;
  /** Programs that can be run: the user's own plus ones shared with them. */
  programs: Program[];
  onChange: () => void;
  onLoadDay: (block: TrainingBlock, day: BlockDay) => void;
  /** Whether a block day is currently loaded into the form, so it can be cleared. */
  dayLoaded: boolean;
  onClear: () => void;
}) {
  const [dayId, setDayId] = useState('');
  /** A block choice waiting for confirmation: a program id, or '' for "no block". */
  const [pendingProgramId, setPendingProgramId] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Whenever the block (or its progress) changes, jump to where the user left off.
  useEffect(() => {
    setDayId(block?.next?.programDayId ?? block?.days[0]?.programDayId ?? '');
  }, [block]);

  if (block === undefined || programs.length === 0) return null;

  function pickProgram(programId: string) {
    if (programId === (block?.program.id ?? '')) return;
    // Starting the first block needs no confirmation; changing or dropping one does.
    if (block) setPendingProgramId(programId);
    else if (programId) void apply(programId);
  }

  async function apply(programId: string) {
    setError(undefined);
    setBusy(true);
    try {
      if (programId) await api.startBlock(userId, programId);
      else if (block) await api.endBlock(block.id, userId);
      setPendingProgramId(undefined);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const done = block?.days.filter((d) => d.status === 'DONE').length ?? 0;
  const pendingName = programs.find((p) => p.id === pendingProgramId)?.name;
  const selectedDay = block?.days.find((d) => d.programDayId === dayId);

  return (
    <div style={{ marginBottom: '.75rem' }}>
      {error && <div className="err">{error}</div>}
      <div className="row block-row" style={{ alignItems: 'flex-end' }}>
        <div>
          <label>Block</label>
          <select
            value={pendingProgramId ?? block?.program.id ?? ''}
            disabled={busy}
            onChange={(e) => pickProgram(e.target.value)}
          >
            <option value="">— no block —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.owner.id !== userId ? ` (shared by ${p.owner.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        {block && pendingProgramId === undefined && (
          <>
            <div>
              <label>Day</label>
              <select value={dayId} onChange={(e) => setDayId(e.target.value)}>
                {block.days.map((d) => (
                  <option key={d.programDayId} value={d.programDayId}>
                    Wk{d.week} · {d.name}{d.status === 'DONE' ? ' (done)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button
                type="button"
                disabled={!selectedDay}
                onClick={() => selectedDay && onLoadDay(block, selectedDay)}
              >
                Load sets
              </button>
            </div>
            {dayLoaded && (
              <div style={{ flex: '0 0 auto' }}>
                <button type="button" className="ghost" onClick={onClear}>
                  Clear
                </button>
              </div>
            )}
            <div style={{ flex: '0 0 auto', alignSelf: 'center' }}>
              <span className="muted">
                {done}/{block.days.length} days done
              </span>
            </div>
          </>
        )}
      </div>

      {block && pendingProgramId !== undefined && (
        <div
          className="panel"
          style={{
            background: 'var(--accent-weak)',
            borderColor: 'var(--accent)',
            marginTop: '.5rem',
            marginBottom: 0,
          }}
        >
          {pendingProgramId ? (
            <>
              Switch from <strong>{block.program.name}</strong> to <strong>{pendingName}</strong>?
            </>
          ) : (
            <>
              Stop running <strong>{block.program.name}</strong>?
            </>
          )}{' '}
          <span className="muted">
            {block.program.name} will be marked finished ({done}/{block.days.length} days done).
          </span>
          <div className="row" style={{ marginTop: '.5rem' }}>
            <div style={{ flex: '0 0 auto' }}>
              <button type="button" disabled={busy} onClick={() => apply(pendingProgramId)}>
                {pendingProgramId ? 'Yes, switch block' : 'Yes, stop it'}
              </button>
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => setPendingProgramId(undefined)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
