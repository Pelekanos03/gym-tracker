import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type DayActivity = {
  totalSets: number
  skippedSets: number
  workoutNames: string[]
}

const WEEKS = 53
const LEVEL_COLORS = ['bg-neutral-800', 'bg-blue-950', 'bg-blue-800', 'bg-blue-600', 'bg-blue-400']

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function levelFor(totalSets: number) {
  if (totalSets === 0) return 0
  if (totalSets <= 3) return 1
  if (totalSets <= 6) return 2
  if (totalSets <= 10) return 3
  return 4
}

function buildWeeks(): Date[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - (WEEKS * 7 - 1))
  start.setDate(start.getDate() - start.getDay())

  const weeks: Date[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < WEEKS + 1; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function ActivityCalendar() {
  const [activity, setActivity] = useState<Record<string, DayActivity>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [weeks] = useState(buildWeeks)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('sessions')
      .select('performed_at, workouts(name), session_sets(skipped)')

    if (!data) return

    const map: Record<string, DayActivity> = {}
    for (const row of data) {
      const key = toDateKey(new Date(row.performed_at))
      if (!map[key]) map[key] = { totalSets: 0, skippedSets: 0, workoutNames: [] }

      const workoutsField = row.workouts as unknown
      const workoutName = Array.isArray(workoutsField)
        ? workoutsField[0]?.name
        : (workoutsField as { name?: string } | null)?.name
      if (workoutName && !map[key].workoutNames.includes(workoutName)) {
        map[key].workoutNames.push(workoutName)
      }

      for (const s of row.session_sets as { skipped: boolean }[]) {
        map[key].totalSets += 1
        if (s.skipped) map[key].skippedSets += 1
      }
    }
    setActivity(map)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-sm font-semibold text-neutral-300 mb-2">Activity</h2>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          <div className="flex flex-col gap-[3px] text-[10px] text-neutral-500 w-7 pr-1 pt-[14px]">
            <div className="h-[11px]" />
            <div className="h-[11px]">Mon</div>
            <div className="h-[11px]" />
            <div className="h-[11px]">Wed</div>
            <div className="h-[11px]" />
            <div className="h-[11px]">Fri</div>
            <div className="h-[11px]" />
          </div>

          <div className="flex flex-col gap-[3px]">
            <div className="flex gap-[3px] text-[10px] text-neutral-500 h-[14px]">
              {weeks.map((week, i) => {
                const prevMonth = i > 0 ? weeks[i - 1][0].getMonth() : null
                const showLabel = week[0].getMonth() !== prevMonth
                return (
                  <div key={i} className="w-[11px] shrink-0">
                    {showLabel ? week[0].toLocaleDateString('en-US', { month: 'short' }) : ''}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const key = toDateKey(day)
                    const isFuture = day > today
                    const dayActivity = activity[key]
                    const lvl = dayActivity ? levelFor(dayActivity.totalSets) : 0
                    return (
                      <button
                        key={di}
                        disabled={isFuture}
                        onClick={() => setSelected(key)}
                        title={key}
                        className={`w-[11px] h-[11px] rounded-sm ${
                          isFuture ? 'invisible' : LEVEL_COLORS[lvl]
                        } ${selected === key ? 'ring-1 ring-blue-400' : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-500">
        <span>Less</span>
        {LEVEL_COLORS.map((c) => (
          <span key={c} className={`w-[10px] h-[10px] rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>

      {selected && (
        <div className="mt-3 text-sm">
          <div className="font-medium">
            {new Date(selected).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {activity[selected] ? (
            <div className="text-neutral-400">
              {activity[selected].workoutNames.join(', ')} —{' '}
              {activity[selected].totalSets - activity[selected].skippedSets} set
              {activity[selected].totalSets - activity[selected].skippedSets !== 1 && 's'} logged
              {activity[selected].skippedSets > 0 &&
                `, ${activity[selected].skippedSets} skipped`}
            </div>
          ) : (
            <div className="text-neutral-500">No workout logged</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityCalendar
