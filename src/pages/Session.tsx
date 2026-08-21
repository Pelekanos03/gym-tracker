import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Workout } from '../types'

type SetEntry = {
  setNumber: number
  weight: string
  reps: string
  skipped: boolean
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

    setExerciseLogs(
      sortedExercises.map((ex) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          weight: '',
          reps: '',
          skipped: false,
        })),
      })),
    )

    const { data: lastSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('workout_id', id)
      .order('performed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSession) {
      const { data: lastSets } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', lastSession.id)

      if (lastSets) {
        const grouped: Record<string, LastTimeSet[]> = {}
        for (const s of lastSets) {
          if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []
          grouped[s.exercise_name].push(s)
        }
        setLastTime(grouped)
      }
    }
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
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: [
                ...ex.sets,
                { setNumber: ex.sets.length + 1, weight: '', reps: '', skipped: false },
              ],
            },
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

    const rows = exerciseLogs.flatMap((ex) =>
      ex.sets.map((s) => ({
        session_id: session.id,
        exercise_name: ex.name,
        set_number: s.setNumber,
        weight: s.skipped || s.weight === '' ? null : Number(s.weight),
        reps: s.skipped || s.reps === '' ? null : Number(s.reps),
        skipped: s.skipped,
      })),
    )

    await supabase.from('session_sets').insert(rows)

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
            <div key={setIndex} className="flex gap-2 items-center">
              <span className="text-neutral-500 text-sm w-4">{s.setNumber}</span>
              <input
                type="number"
                placeholder="Weight"
                value={s.weight}
                disabled={s.skipped}
                onChange={(e) => updateSet(exIndex, setIndex, { weight: e.target.value })}
                className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 disabled:opacity-40"
              />
              <input
                type="number"
                placeholder="Reps"
                value={s.reps}
                disabled={s.skipped}
                onChange={(e) => updateSet(exIndex, setIndex, { reps: e.target.value })}
                className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 disabled:opacity-40"
              />
              <button
                onClick={() => toggleSkip(exIndex, setIndex)}
                className={`text-xs px-2 py-2 rounded-lg transition-colors ${
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
                className="text-neutral-500 hover:text-neutral-300 text-lg leading-none px-1"
              >
                x
              </button>
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
