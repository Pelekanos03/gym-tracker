import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'

type WeightPoint = { date: string; weight: number }
type WeekPoint = { week: string; value: number }

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function weekLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Progress() {
  const [weightData, setWeightData] = useState<WeightPoint[]>([])
  const [volumeData, setVolumeData] = useState<WeekPoint[]>([])
  const [frequencyData, setFrequencyData] = useState<WeekPoint[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: weightLogs } = await supabase
      .from('body_weight_logs')
      .select('*')
      .order('logged_at', { ascending: true })

    if (weightLogs) {
      setWeightData(
        weightLogs.map((w) => ({
          date: new Date(w.logged_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          weight: Number(w.weight),
        })),
      )
    }

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, performed_at, session_sets(skipped)')
      .order('performed_at', { ascending: true })

    if (sessions) {
      const volumeByWeek = new Map<string, number>()
      const freqByWeek = new Map<string, number>()

      for (const s of sessions) {
        const weekKey = weekLabel(startOfWeek(new Date(s.performed_at)))
        const setsCount = (s.session_sets as { skipped: boolean }[]).filter(
          (set) => !set.skipped,
        ).length

        volumeByWeek.set(weekKey, (volumeByWeek.get(weekKey) ?? 0) + setsCount)
        freqByWeek.set(weekKey, (freqByWeek.get(weekKey) ?? 0) + 1)
      }

      setVolumeData(Array.from(volumeByWeek, ([week, value]) => ({ week, value })))
      setFrequencyData(Array.from(freqByWeek, ([week, value]) => ({ week, value })))
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col gap-6 max-w-sm mx-auto">
      <Link to="/" className="text-neutral-400 hover:text-neutral-200 text-sm">
        &lt; Back
      </Link>
      <h1 className="text-3xl font-bold">Progress</h1>

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Body weight</h2>
        {weightData.length > 1 ? (
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#737373" fontSize={11} tickMargin={8} />
                <YAxis stroke="#737373" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Log at least 2 body weight entries to see a trend.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Weekly training volume</h2>
        {volumeData.length > 0 ? (
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="week" stroke="#737373" fontSize={11} tickMargin={8} />
                <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
                <Bar dataKey="value" name="sets logged" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No sessions logged yet.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Weekly workout frequency</h2>
        {frequencyData.length > 0 ? (
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="week" stroke="#737373" fontSize={11} tickMargin={8} />
                <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
                <Bar dataKey="value" name="workouts" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No sessions logged yet.</p>
        )}
      </div>
    </div>
  )
}

export default Progress
