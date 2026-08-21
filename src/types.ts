export type Exercise = {
  id: string
  name: string
  sets: number
  position: number
}

export type Cardio = {
  id: string
  name: string
  minutes: number
  position: number
}

export type Workout = {
  id: string
  name: string
  workout_exercises: Exercise[]
  workout_cardio: Cardio[]
}
