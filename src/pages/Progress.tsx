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

type WeekPoint = { week: string; value: number }
type DatedPoint = { date: string; value: number }
type CombinedPoint = { date: string; volume?: number; weight?: number }
type ExerciseVolume = { exercise: string; volume: number }

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function displayDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function Progress() {
  const [weightByDate, setWeightByDate] = useState<Map<string, number>>(new Map())
  const [volumeData, setVolumeData] = useState<WeekPoint[]>([])
  const [frequencyData, setFrequencyData] = useState<WeekPoint[]>([])
  const [exerciseVolumeByDate, setExerciseVolumeByDate] = useState<
    Map<string, Map<string, number>>
  >(new Map())
  const [exerciseOverview, setExerciseOverview] = useState<ExerciseVolume[]>([])
  const [totalVolumeByDate, setTotalVolumeByDate] = useState<Map<string, number>>(new Map())
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: weightLogs } = await supabase
      .from('body_weight_logs')
      .select('*')
      .order('logged_at', { ascending: true })

    const weightMap = new Map<string, number>()
    for (const w of weightLogs ?? []) {
      weightMap.set(dateKey(new Date(w.logged_at)), Number(w.weight))
    }
    setWeightByDate(weightMap)

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, performed_at, session_sets(skipped)')
      .order('performed_at', { ascending: true })

    if (sessions) {
      const volumeByWeek = new Map<string, number>()
      const freqByWeek = new Map<string, number>()

      for (const s of sessions) {
        const weekKey = displayDate(dateKey(startOfWeek(new Date(s.performed_at))))
        const setsCount = (s.session_sets as { skipped: boolean }[]).filter(
          (set) => !set.skipped,
        ).length

        volumeByWeek.set(weekKey, (volumeByWeek.get(weekKey) ?? 0) + setsCount)
        freqByWeek.set(weekKey, (freqByWeek.get(weekKey) ?? 0) + 1)
      }

      setVolumeData(Array.from(volumeByWeek, ([week, value]) => ({ week, value })))
      setFrequencyData(Array.from(freqByWeek, ([week, value]) => ({ week, value })))
    }

    const { data: setRows } = await supabase
      .from('session_sets')
      .select('exercise_name, weight, reps, skipped, sessions(performed_at)')

    if (setRows) {
      const byExerciseByDate = new Map<string, Map<string, number>>()
      const totalByExercise = new Map<string, number>()
      const totalByDate = new Map<string, number>()

      for (const row of setRows) {
        if (row.skipped) continue
        const sessionField = row.sessions as unknown
        const performedAt = Array.isArray(sessionField)
          ? sessionField[0]?.performed_at
          : (sessionField as { performed_at?: string } | null)?.performed_at
        if (!performedAt) continue

        const volume = (row.weight ?? 0) * (row.reps ?? 0)
        if (volume === 0) continue

        const key = dateKey(new Date(performedAt))
        const exercise = row.exercise_name

        if (!byExerciseByDate.has(exercise)) byExerciseByDate.set(exercise, new Map())
        const perDate = byExerciseByDate.get(exercise)!
        perDate.set(key, (perDate.get(key) ?? 0) + volume)

        totalByExercise.set(exercise, (totalByExercise.get(exercise) ?? 0) + volume)
        totalByDate.set(key, (totalByDate.get(key) ?? 0) + volume)
      }

      setExerciseVolumeByDate(byExerciseByDate)
      setTotalVolumeByDate(totalByDate)
      setExerciseOverview(
        Array.from(totalByExercise, ([exercise, volume]) => ({ exercise, volume })).sort(
          (a, b) => b.volume - a.volume,
        ),
      )
    }
  }

  const selectedData: DatedPoint[] = selectedExercise
    ? Array.from(exerciseVolumeByDate.get(selectedExercise) ?? [])
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, value]) => ({ date: displayDate(key), value }))
    : []

  const combinedKeys = Array.from(new Set([...totalVolumeByDate.keys(), ...weightByDate.keys()])).sort()
  const combinedData: CombinedPoint[] = combinedKeys.map((key) => ({
    date: displayDate(key),
    volume: totalVolumeByDate.get(key),
    weight: weightByDate.get(key),
  }))

  const weightData: DatedPoint[] = Array.from(weightByDate)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, weight]) => ({ date: displayDate(key), value: weight }))

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
                <Line type="monotone" dataKey="value" name="weight" stroke="#60a5fa" strokeWidth={2} dot={false} />
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

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Volume by exercise</h2>
        {exerciseOverview.length > 0 ? (
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exerciseOverview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="exercise"
                  stroke="#737373"
                  fontSize={9}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
                <Bar dataKey="volume" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No sets logged yet.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Exercise progress</h2>
        {exerciseOverview.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {exerciseOverview.map(({ exercise }) => (
                <button
                  key={exercise}
                  onClick={() =>
                    setSelectedExercise(selectedExercise === exercise ? null : exercise)
                  }
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    selectedExercise === exercise
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {exercise}
                </button>
              ))}
            </div>

            {selectedExercise && selectedData.length > 1 && (
              <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={11} tickMargin={8} />
                    <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                      labelStyle={{ color: '#e5e5e5' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="volume"
                      stroke="#f472b6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {selectedExercise && selectedData.length <= 1 && (
              <p className="text-sm text-neutral-500">
                Only one data point so far for {selectedExercise} — do it again to see a trend.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">No sets logged yet.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Volume vs body weight</h2>
        {combinedData.length > 1 ? (
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#737373" fontSize={11} tickMargin={8} />
                <YAxis yAxisId="volume" stroke="#f472b6" fontSize={11} allowDecimals={false} />
                <YAxis
                  yAxisId="weight"
                  orientation="right"
                  stroke="#60a5fa"
                  fontSize={11}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #262626' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  name="volume"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  name="body weight"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Need both logged sets and body weight entries to compare.
          </p>
        )}
      </div>
    </div>
  )
}

export default Progress
