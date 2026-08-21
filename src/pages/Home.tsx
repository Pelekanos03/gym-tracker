import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Exercise, Workout } from '../types'
import ActivityCalendar from '../components/ActivityCalendar'
import BodyWeightTracker from '../components/BodyWeightTracker'

function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    loadWorkouts()
  }, [])

  async function loadWorkouts() {
    const { data } = await supabase
      .from('workouts')
      .select('*, workout_exercises(*)')
      .order('created_at', { ascending: true })

    if (data) setWorkouts(data as Workout[])
  }

  function openNew() {
    setEditingId(null)
    setName('')
    setExercises([])
    setConfirmDelete(false)
    setIsOpen(true)
  }

  function openEdit(workout: Workout) {
    setEditingId(workout.id)
    setName(workout.name)
    setExercises(workout.workout_exercises)
    setConfirmDelete(false)
    setIsOpen(true)
  }

  function addExerciseRow() {
    setExercises([...exercises, { id: crypto.randomUUID(), name: '', sets: 3, position: 0 }])
  }

  function updateExercise(id: string, changes: Partial<Exercise>) {
    setExercises(exercises.map((ex) => (ex.id === id ? { ...ex, ...changes } : ex)))
  }

  function removeExercise(id: string) {
    setExercises(exercises.filter((ex) => ex.id !== id))
  }

  async function handleSave() {
    if (!name.trim()) return

    let workoutId = editingId

    if (workoutId === null) {
      const { data, error } = await supabase
        .from('workouts')
        .insert({ name })
        .select()
        .single()
      if (error || !data) return
      workoutId = data.id
    } else {
      await supabase.from('workouts').update({ name }).eq('id', workoutId)
      await supabase.from('workout_exercises').delete().eq('workout_id', workoutId)
    }

    const validExercises = exercises.filter((ex) => ex.name.trim())
    if (validExercises.length > 0) {
      await supabase.from('workout_exercises').insert(
        validExercises.map((ex, index) => ({
          workout_id: workoutId,
          name: ex.name.trim().toUpperCase(),
          sets: ex.sets,
          position: index,
        })),
      )
    }

    setIsOpen(false)
    loadWorkouts()
  }

  async function handleDelete() {
    await supabase.from('workouts').delete().eq('id', editingId)
    setConfirmDelete(false)
    setIsOpen(false)
    loadWorkouts()
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Gym Tracker</h1>

      <ActivityCalendar />

      <BodyWeightTracker />

      <ul className="w-full max-w-sm flex flex-col gap-2">
        {workouts.map((w) => (
          <li key={w.id} className="flex gap-2">
            <Link
              to={`/workout/${w.id}`}
              className="flex-1 text-left bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 hover:bg-neutral-800 transition-colors"
            >
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-neutral-400">
                {w.workout_exercises.length} exercise
                {w.workout_exercises.length !== 1 && 's'}
              </div>
            </Link>
            <button
              onClick={() => openEdit(w)}
              aria-label="Edit workout"
              className="px-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors text-neutral-400 text-sm"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={openNew}
        className="px-6 py-4 rounded-lg bg-neutral-500 hover:bg-neutral-400 transition-colors font-medium text-2xl"
      >
        +
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId === null ? 'New workout' : 'Edit workout'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setConfirmDelete(false)
                }}
                aria-label="Close"
                className="text-neutral-400 hover:text-neutral-200 text-xl leading-none"
              >
                x
              </button>
            </div>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workout name"
              className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex flex-col gap-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex gap-2 items-center">
                  <input
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, { name: e.target.value.toUpperCase() })}
                    placeholder="Exercise name"
                    className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                  />
                  <input
                    type="number"
                    min={1}
                    value={ex.sets}
                    onChange={(e) => updateExercise(ex.id, { sets: Number(e.target.value) })}
                    className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-16"
                  />
                  <button
                    onClick={() => removeExercise(ex.id)}
                    aria-label="Remove exercise"
                    className="text-neutral-400 hover:text-neutral-200 text-xl leading-none px-1"
                  >
                    x
                  </button>
                </div>
              ))}

              <button
                onClick={addExerciseRow}
                className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm"
              >
                + Add exercise
              </button>
            </div>

            <button
              onClick={handleSave}
              className="py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
            >
              {editingId === null ? 'Create' : 'Save'}
            </button>
            {editingId !== null && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="py-2 rounded-lg bg-red-900 hover:bg-red-800 transition-colors font-medium"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Delete "{name}"?</h2>
              <p className="text-neutral-400 text-sm mt-1">This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
