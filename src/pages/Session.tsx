import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Workout } from '../types'

type SetType = 'working' | 'warmup' | 'drop' | 'partial'

type Drop = {
  weight: string
  reps: string
}

type SetEntry = {
  setNumber: number
  weight: string
  reps: string
  skipped: boolean
  type: SetType
  partialReps: string
  drops: Drop[]
}

type ExerciseLog = {
  name: string
  sets: SetEntry[]
}

type LastTimeSet = {
  set_number: number
  weight: number | null
  reps: number | null
  skipped: boolean
}

function newSet(setNumber: number): SetEntry {
  return {
    setNumber,
    weight: '',
    reps: '',
    skipped: false,
    type: 'working',
    partialReps: '',
    drops: [],
  }
}

function Session() {
  const { id } = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [lastTime, setLastTime] = useState<Record<string, LastTimeSet[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    const { data: workoutData } = await supabase
      .from('workouts')
      .select('*, workout_exercises(*)')
      .eq('id', id)
      .single()

    if (!workoutData) return

    const sortedExercises = [...workoutData.workout_exercises].sort(
      (a, b) => a.position - b.position,
    )
    setWorkout({ ...workoutData, workout_exercises: sortedExercises })

    const { data: lastSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('workout_id', id)
      .order('performed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let grouped: Record<string, LastTimeSet[]> = {}

    if (lastSession) {
      const { data: lastSets } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', lastSession.id)

      if (lastSets) {
        for (const s of lastSets) {
          if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []
          grouped[s.exercise_name].push(s)
        }
        setLastTime(grouped)
      }
    }

    setExerciseLogs(
      sortedExercises.map((ex) => {
        const lastSets = grouped[ex.name] ?? []
        return {
          name: ex.name,
          sets: Array.from({ length: ex.sets }, (_, i) => {
            const setNumber = i + 1
            const lastSet = lastSets.find((s) => s.set_number === setNumber)
            const weight = lastSet && !lastSet.skipped && lastSet.weight != null
              ? String(lastSet.weight)
              : ''
            return { ...newSet(setNumber), weight }
          }),
        }
      }),
    )
  }

  function updateSet(exIndex: number, setIndex: number, changes: Partial<SetEntry>) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...changes } : s)) },
      ),
    )
  }

  function addSet(exIndex: number) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex ? ex : { ...ex, sets: [...ex.sets, newSet(ex.sets.length + 1)] },
      ),
    )
  }

  function removeSet(exIndex: number, setIndex: number) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) },
      ),
    )
  }

  function toggleSkip(exIndex: number, setIndex: number) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, skipped: !s.skipped } : s)),
            },
      ),
    )
  }

  function setType(exIndex: number, setIndex: number, type: SetType) {
    updateSet(exIndex, setIndex, { type })
  }

  function addDrop(exIndex: number, setIndex: number) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIndex ? s : { ...s, drops: [...s.drops, { weight: '', reps: '' }] },
              ),
            },
      ),
    )
  }

  function updateDrop(
    exIndex: number,
    setIndex: number,
    dropIndex: number,
    changes: Partial<Drop>,
  ) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIndex
                  ? s
                  : {
                      ...s,
                      drops: s.drops.map((d, k) => (k === dropIndex ? { ...d, ...changes } : d)),
                    },
              ),
            },
      ),
    )
  }

  function removeDrop(exIndex: number, setIndex: number, dropIndex: number) {
    setExerciseLogs((logs) =>
      logs.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIndex ? s : { ...s, drops: s.drops.filter((_, k) => k !== dropIndex) },
              ),
            },
      ),
    )
  }

  async function handleSaveSession() {
    if (!id) return
    setSaving(true)

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ workout_id: id })
      .select()
      .single()

    if (error || !session) {
      setSaving(false)
      return
    }

    const setsToSave = exerciseLogs.flatMap((ex) =>
      ex.sets
        .filter((s) => s.skipped || s.weight !== '' || s.reps !== '')
        .map((s) => ({ exerciseName: ex.name, entry: s })),
    )

    const { data: insertedSets, error: setsError } = await supabase
      .from('session_sets')
      .insert(
        setsToSave.map(({ exerciseName, entry: s }) => ({
          session_id: session.id,
          exercise_name: exerciseName,
          set_number: s.setNumber,
          weight: s.skipped || s.weight === '' ? null : Number(s.weight),
          reps: s.skipped || s.reps === '' ? null : Number(s.reps),
          skipped: s.skipped,
          type: s.type,
          partial_reps:
            s.type === 'partial' && s.partialReps !== '' ? Number(s.partialReps) : null,
        })),
      )
      .select()

    if (!setsError && insertedSets) {
      const dropRows = insertedSets.flatMap((row, i) =>
        setsToSave[i].entry.drops
          .filter((d) => d.weight !== '' || d.reps !== '')
          .map((d, position) => ({
            session_set_id: row.id,
            weight: d.weight === '' ? null : Number(d.weight),
            reps: d.reps === '' ? null : Number(d.reps),
            position,
          })),
      )

      if (dropRows.length > 0) {
        await supabase.from('drop_sets').insert(dropRows)
      }
    }

    setSaving(false)
    setSaved(true)
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
        <Link to="/" className="text-neutral-400 hover:text-neutral-200">
          &lt; Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 pb-16 flex flex-col gap-4 max-w-sm mx-auto">
      <Link to="/" className="text-neutral-400 hover:text-neutral-200 text-sm">
        &lt; Back
      </Link>
      <h1 className="text-3xl font-bold">{workout.name}</h1>

      {exerciseLogs.map((ex, exIndex) => (
        <div
          key={ex.name}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
        >
          <h2 className="font-semibold">{ex.name}</h2>

          {lastTime[ex.name] && (
            <p className="text-xs text-neutral-500">
              Last time:{' '}
              {[...lastTime[ex.name]]
                .sort((a, b) => a.set_number - b.set_number)
                .map((s) => (s.skipped ? 'skipped' : `${s.weight ?? '-'}x${s.reps ?? '-'}`))
                .join(', ')}
            </p>
          )}

          {ex.sets.map((s, setIndex) => (
            <div key={setIndex} className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <span className="text-neutral-500 text-sm w-4 shrink-0">{s.setNumber}</span>
                <input
                  type="number"
                  placeholder="Weight"
                  value={s.weight}
                  disabled={s.skipped}
                  onChange={(e) => updateSet(exIndex, setIndex, { weight: e.target.value })}
                  className="bg-neutral-800 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 disabled:opacity-40"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={s.reps}
                  disabled={s.skipped}
                  onChange={(e) => updateSet(exIndex, setIndex, { reps: e.target.value })}
                  className="bg-neutral-800 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 disabled:opacity-40"
                />
                <button
                  onClick={() => toggleSkip(exIndex, setIndex)}
                  className={`shrink-0 text-xs px-2 py-2 rounded-lg transition-colors ${
                    s.skipped
                      ? 'bg-neutral-700 text-neutral-200'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={() => removeSet(exIndex, setIndex)}
                  aria-label="Remove set"
                  className="shrink-0 text-neutral-500 hover:text-neutral-300 text-lg leading-none px-1"
                >
                  x
                </button>
              </div>

              <div className="flex gap-1.5 pl-[22px]">
                {(['warmup', 'drop', 'partial'] as SetType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(exIndex, setIndex, s.type === t ? 'working' : t)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors capitalize ${
                      s.type === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {s.type === 'partial' && (
                <div className="flex gap-1.5 items-center pl-[22px]">
                  <input
                    type="number"
                    placeholder="Partial reps"
                    value={s.partialReps}
                    onChange={(e) =>
                      updateSet(exIndex, setIndex, { partialReps: e.target.value })
                    }
                    className="bg-neutral-800 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-28 min-w-0"
                  />
                </div>
              )}

              {s.type === 'drop' && (
                <div className="flex flex-col gap-1.5 pl-[22px]">
                  {s.drops.map((d, dropIndex) => (
                    <div key={dropIndex} className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        placeholder="Drop weight"
                        value={d.weight}
                        onChange={(e) =>
                          updateDrop(exIndex, setIndex, dropIndex, { weight: e.target.value })
                        }
                        className="bg-neutral-800 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
                      />
                      <input
                        type="number"
                        placeholder="Reps"
                        value={d.reps}
                        onChange={(e) =>
                          updateDrop(exIndex, setIndex, dropIndex, { reps: e.target.value })
                        }
                        className="bg-neutral-800 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
                      />
                      <button
                        onClick={() => removeDrop(exIndex, setIndex, dropIndex)}
                        aria-label="Remove drop"
                        className="shrink-0 text-neutral-500 hover:text-neutral-300 text-base leading-none px-1"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addDrop(exIndex, setIndex)}
                    className="py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs text-neutral-400"
                  >
                    + Add drop
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => addSet(exIndex)}
            className="py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm"
          >
            + Add set
          </button>
        </div>
      ))}

      <button
        onClick={handleSaveSession}
        disabled={saving}
        className="py-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save session'}
      </button>

      {saved && <p className="text-center text-sm text-green-400">Session saved.</p>}
    </div>
  )
}

export default Session
