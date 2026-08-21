import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type LogEntry = {
  id: string
  logged_at: string
  weight: number
}

function BodyWeightTracker() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [weight, setWeight] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('body_weight_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(10)

    if (data) setLogs(data)
  }

  async function handleLog() {
    if (weight === '') return

    await supabase.from('body_weight_logs').insert({ weight: Number(weight) })
    setWeight('')
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('body_weight_logs').delete().eq('id', id)
    load()
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-sm font-semibold text-neutral-300 mb-2">Body weight</h2>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
        />
        <button
          onClick={handleLog}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium shrink-0"
        >
          Log
        </button>
      </div>

      {logs.length > 0 && (
        <ul className="flex flex-col gap-1 mt-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex justify-between items-center bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm"
            >
              <span className="text-neutral-400">
                {new Date(log.logged_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="font-medium">{log.weight}</span>
              <button
                onClick={() => handleDelete(log.id)}
                aria-label="Delete entry"
                className="text-neutral-500 hover:text-neutral-300 text-base leading-none px-1"
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default BodyWeightTracker
