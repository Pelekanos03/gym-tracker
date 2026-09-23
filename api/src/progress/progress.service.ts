import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetLog } from '../domain/set-log.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { FriendshipService } from '../friendship/friendship.service';
import { SetType } from '../common/enums';

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
    private readonly friendship: FriendshipService,
  ) {}

  /**
   * Builds an estimated-1RM timeline per exercise for a user.
   * One point per (exercise, date): the best working set that day.
   */
  async forUser(userId: string): Promise<ExerciseProgress[]> {
    const sessions = await this.sessions.find({
      where: { user: { id: userId } },
      order: { date: 'ASC' },
    });

    // exerciseId -> date -> best point so far
    const byExercise = new Map<string, ExerciseProgress>();

    for (const session of sessions) {
      for (const set of session.sets ?? []) {
        // PRs and the progress line only reflect genuine working sets —
        // warm-ups, drop sets, supersets etc. add volume but would otherwise
        // muddy "what's my real top set" with lighter/fatigued numbers.
        if (set.setType !== SetType.WORKING) continue;

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

  /** Same data, but only after checking the viewer is friends with this user. */
  async forUserAsFriend(
    viewerId: string,
    userId: string,
  ): Promise<ExerciseProgress[]> {
    await this.friendship.assertFriends(viewerId, userId);
    return this.forUser(userId);
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
