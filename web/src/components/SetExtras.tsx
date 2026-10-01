import type { Exercise } from '../types';
import { ExercisePicker } from './ExercisePicker';

/**
 * The sub-rows shown under a set in the log/edit forms: the drops of a drop
 * set, or the partner exercises of a superset. Values stay strings while
 * being typed, like the rest of the set inputs.
 */

export interface DropEntry {
  weight: string;
  reps: string;
}

export interface PartnerEntry {
  exerciseId: string;
  weight: string;
  reps: string;
}

export const emptyDrop = (): DropEntry => ({ weight: '', reps: '' });
export const emptyPartner = (): PartnerEntry => ({ exerciseId: '', weight: '', reps: '' });

/** Drops with reps filled in, ready to send to the API. */
export function dropsPayload(drops: DropEntry[]) {
  return drops
    .filter((d) => d.reps)
    .map((d) => ({ weight: d.weight ? Number(d.weight) : 0, reps: Number(d.reps) }));
}

/** Partners with an exercise and reps filled in, ready to send to the API. */
export function partnersPayload(partners: PartnerEntry[]) {
  return partners
    .filter((p) => p.exerciseId && p.reps)
    .map((p) => ({
      exerciseId: p.exerciseId,
      weight: p.weight ? Number(p.weight) : 0,
      reps: Number(p.reps),
    }));
}

// Inputs sit in a .row, whose children otherwise stretch to a 90px minimum.
const fixed = { flex: '0 0 auto', minWidth: 0 } as const;

function WeightRepsInputs({
  weight,
  reps,
  onChange,
}: {
  weight: string;
  reps: string;
  onChange: (patch: { weight?: string; reps?: string }) => void;
}) {
  return (
    <>
      <input
        type="number"
        min={0}
        step={0.5}
        value={weight}
        onChange={(e) => onChange({ weight: e.target.value })}
        placeholder="kg"
        style={{ ...fixed, width: 80 }}
      />
      <span className="muted" style={fixed}>
        kg ×
      </span>
      <input
        type="number"
        min={0}
        value={reps}
        onChange={(e) => onChange({ reps: e.target.value })}
        placeholder="reps"
        style={{ ...fixed, width: 64 }}
      />
    </>
  );
}

function SubRows({
  addLabel,
  onAdd,
  children,
}: {
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', paddingLeft: '1.5rem' }}>
      {children}
      <div>
        <button type="button" className="ghost small" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function RemoveButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button type="button" className="ghost small" title={title} onClick={onClick} style={fixed}>
      ✕
    </button>
  );
}

/** "↳ Drop 1  [80] kg × [6]" rows under a drop set. */
export function DropRows({
  drops,
  onChange,
}: {
  drops: DropEntry[];
  onChange: (drops: DropEntry[]) => void;
}) {
  return (
    <SubRows addLabel="+ Add drop" onAdd={() => onChange([...drops, emptyDrop()])}>
      {drops.map((d, i) => (
        <div key={i} className="row" style={{ alignItems: 'center', gap: '.4rem' }}>
          <span className="muted" style={{ ...fixed, whiteSpace: 'nowrap' }}>
            ↳ Drop {i + 1}
          </span>
          <WeightRepsInputs
            weight={d.weight}
            reps={d.reps}
            onChange={(patch) => onChange(drops.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
          />
          <RemoveButton
            title="Remove this drop"
            onClick={() => onChange(drops.filter((_, j) => j !== i))}
          />
        </div>
      ))}
    </SubRows>
  );
}

/** "↳ + [Barbell Row]  [60] kg × [10]" rows under a superset. */
export function SupersetRows({
  partners,
  exercises,
  onChange,
}: {
  partners: PartnerEntry[];
  exercises: Exercise[];
  onChange: (partners: PartnerEntry[]) => void;
}) {
  return (
    <SubRows addLabel="+ Add exercise to superset" onAdd={() => onChange([...partners, emptyPartner()])}>
      {partners.map((p, i) => (
        <div key={i} className="row" style={{ alignItems: 'center', gap: '.4rem' }}>
          <span className="muted" style={fixed}>
            ↳ +
          </span>
          <ExercisePicker
            exercises={exercises}
            value={p.exerciseId}
            onChange={(id) =>
              onChange(partners.map((x, j) => (j === i ? { ...x, exerciseId: id } : x)))
            }
            style={{ ...fixed, maxWidth: 200 }}
          />
          <WeightRepsInputs
            weight={p.weight}
            reps={p.reps}
            onChange={(patch) =>
              onChange(partners.map((x, j) => (j === i ? { ...x, ...patch } : x)))
            }
          />
          <RemoveButton
            title="Remove this exercise from the superset"
            onClick={() => onChange(partners.filter((_, j) => j !== i))}
          />
        </div>
      ))}
    </SubRows>
  );
}
