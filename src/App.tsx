import { useState } from 'react'

type Workout = {
  id: number
  name: string
  weight: string
  reps: string
}

function App() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setWorkouts([...workouts, { id: Date.now(), name, weight, reps }])
    setName('')
    setWeight('')
    setReps('')
    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 pb-28">
      <h1 className="text-3xl font-bold mb-6">Gym Tracker</h1>

      {workouts.length === 0 && (
        <p className="text-neutral-500">No workouts yet. Tap + to add one.</p>
      )}

      <ul className="flex flex-col gap-3">
        {workouts.map((w) => (
          <li
            key={w.id}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center"
          >
            <span className="font-medium">{w.name}</span>
            <span className="text-neutral-400 text-sm">
              {w.weight && `${w.weight} lbs`}
              {w.weight && w.reps && ' x '}
              {w.reps && `${w.reps} reps`}
            </span>
          </li>
        ))}
      </ul>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleAdd}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3"
          >
            <h2 className="text-lg font-semibold mb-1">Add workout</h2>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise (e.g. Bench Press)"
              className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight (lbs)"
                inputMode="numeric"
                className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
              />
              <input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Reps"
                inputMode="numeric"
                className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setShowForm(true)}
        aria-label="Add workout"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-950/50 flex items-center justify-center text-3xl leading-none"
      >
        +
      </button>
    </div>
  )
}

export default App
