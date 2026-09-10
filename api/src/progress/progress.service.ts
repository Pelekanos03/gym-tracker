import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetLog } from '../domain/set-log.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { CoachingService } from '../coaching/coaching.service';

export interface ProgressPoint {
  date: string;
  bestWeight: number;
  bestEstimatedOneRepMax: number;
  topSet: { weight: number; reps: number; rpe: number | null };
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  points: ProgressPoint[];
  allTimeBestE1rm: number;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(WorkoutSession)
    private readonly sessions: Repository<WorkoutSession>,
    private readonly coaching: CoachingService,
  ) {}

  /**
   * Builds an estimated-1RM timeline per exercise for a client.
   * One point per (exercise, date): the best working set that day.
   */
  async forClient(clientId: string): Promise<ExerciseProgress[]> {
    const sessions = await this.sessions.find({
      where: { client: { id: clientId } },
      order: { date: 'ASC' },
    });

    // exerciseId -> date -> best point so far
    const byExercise = new Map<string, ExerciseProgress>();

    for (const session of sessions) {
      for (const set of session.sets ?? []) {
        if (set.isWarmup) continue;

        const progress = this.ensureExercise(byExercise, set);
        const e1rm = set.estimatedOneRepMax();
        const existing = progress.points.find((p) => p.date === session.date);

        if (!existing) {
          progress.points.push({
            date: session.date,
            bestWeight: set.weight,
            bestEstimatedOneRepMax: e1rm,
            topSet: { weight: set.weight, reps: set.reps, rpe: set.rpe },
          });
        } else if (e1rm > existing.bestEstimatedOneRepMax) {
          existing.bestEstimatedOneRepMax = e1rm;
          existing.bestWeight = set.weight;
          existing.topSet = { weight: set.weight, reps: set.reps, rpe: set.rpe };
        }

        progress.allTimeBestE1rm = Math.max(progress.allTimeBestE1rm, e1rm);
      }
    }

    return [...byExercise.values()];
  }

  /** Same data, but only after checking the coach owns this client. */
  async forClientAsCoach(
    coachId: string,
    clientId: string,
  ): Promise<ExerciseProgress[]> {
    await this.coaching.assertCoaches(coachId, clientId);
    return this.forClient(clientId);
  }

  private ensureExercise(
    map: Map<string, ExerciseProgress>,
    set: SetLog,
  ): ExerciseProgress {
    let progress = map.get(set.exercise.id);
    if (!progress) {
      progress = {
        exerciseId: set.exercise.id,
        exerciseName: set.exercise.name,
        points: [],
        allTimeBestE1rm: 0,
      };
      map.set(set.exercise.id, progress);
    }
    return progress;
  }
}
