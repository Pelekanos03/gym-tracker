export type Exercise = {
  id: string
  name: string
  sets: number
  position: number
}

export type Workout = {
  id: string
  name: string
  workout_exercises: Exercise[]
}
