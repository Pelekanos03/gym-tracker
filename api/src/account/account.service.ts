import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../domain/user.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { Program } from '../domain/program.entity';
import { BodyWeightEntry } from '../domain/body-weight-entry.entity';
import { Exercise } from '../domain/exercise.entity';
import { Friendship } from '../domain/friendship.entity';
import { Coaching } from '../domain/coaching.entity';
import { TrainingBlock } from '../domain/training-block.entity';
import { CardioSession } from '../domain/cardio-session.entity';
import { UsersService } from '../users/users.service';
import { verifyPassword } from '../common/password';
import { removeAttachmentFile, removeAvatarFile, removeVideoFile } from '../common/uploads';
import { Message } from '../domain/message.entity';
import { ownExercisesUsedByOthers } from '../exercises/exercise-usage';

/** A person's own account: password, a copy of their data, and deleting it all. */
@Injectable()
export class AccountService {
  constructor(
    private readonly users: UsersService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async changePassword(userId: string, current: string, next: string): Promise<User> {
    const user = await this.checkPassword(userId, current);
    return this.users.setPassword(user, next);
  }

  /**
   * Everything stored about the user, as plain JSON (the "right of access"
   * / data portability part of GDPR). Video files themselves are too big
   * for a JSON file; the export lists which sets have one.
   */
  async export(userId: string) {
    const user = await this.users.findById(userId);
    const where = { user: { id: userId } };
    const [sessions, programs, bodyWeight, exercises, friendships, coachings, blocks, cardio] =
      await Promise.all([
        this.db.getRepository(WorkoutSession).find({ where, order: { date: 'ASC' } }),
        this.db.getRepository(Program).find({ where: { owner: { id: userId } } }),
        this.db.getRepository(BodyWeightEntry).find({ where, order: { date: 'ASC' } }),
        this.db.getRepository(Exercise).find({ where: { ownerId: userId } }),
        this.db.getRepository(Friendship).find({
          where: [{ requester: { id: userId } }, { addressee: { id: userId } }],
        }),
        this.db.getRepository(Coaching).find({
          where: [{ coach: { id: userId } }, { client: { id: userId } }],
        }),
        this.db.getRepository(TrainingBlock).find({ where }),
        this.db.getRepository(CardioSession).find({ where, order: { date: 'ASC' } }),
      ]);
    const other = (a: User, b: User) => (a.id === userId ? b : a).name;
    return {
      exportedAt: new Date().toISOString(),
      account: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        acceptedTermsAt: user.acceptedTermsAt,
        hasProfilePicture: !!user.avatarFile,
        ownCardioActivities: user.cardioActivities ?? [],
      },
      privacyChoices: {
        healthDataConsentAt: user.healthConsentAt,
        shareWithPartners: user.consentPartners,
        aiTraining: user.consentAi,
        history: (await this.users.consentHistory(userId)).map((e) => ({
          purpose: e.purpose,
          granted: e.granted,
          policyVersion: e.policyVersion,
          at: e.createdAt,
        })),
      },
      bodyWeight: bodyWeight.map(({ date, weight }) => ({ date, weightKg: weight })),
      cardio: cardio.map(({ date, activity, durationSeconds, distanceKm, avgHeartRate, calories, notes }) => ({
        date,
        activity,
        durationSeconds,
        distanceKm,
        avgHeartRate,
        calories,
        notes,
      })),
      workouts: sessions.map((s) => ({
        date: s.date,
        status: s.status,
        notes: s.notes,
        programDay: s.programDay?.name ?? null,
        sets: s.sets.map((set) => ({
          exercise: set.exercise.name,
          setNumber: set.setNumber,
          weightKg: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          setType: set.setType,
          drops: set.drops?.map(({ weight, reps }) => ({ weightKg: weight, reps })),
          supersetWith: set.supersetPartners?.map((p) => ({ exercise: p.exercise.name, weightKg: p.weight, reps: p.reps })),
          hasVideo: !!set.videoFile,
          videoComment: set.videoNote ?? undefined,
        })),
      })),
      programs: programs.map((p) => ({
        name: p.name,
        description: p.description,
        lengthWeeks: p.lengthWeeks,
        days: p.days.map((d) => ({
          week: d.weekNumber,
          day: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map((pe) => ({
            exercise: pe.exercise.name,
            sets: pe.targetSets,
            reps: pe.targetReps,
            rpe: pe.targetRpe,
            percent1rm: pe.targetPercent1rm,
            weightKg: pe.targetWeight,
            setType: pe.setType,
            notes: pe.notes,
          })),
        })),
      })),
      myExercises: exercises.map(({ name, category, primaryMuscle }) => ({ name, category, primaryMuscle })),
      friends: friendships.map((f) => ({ name: other(f.requester, f.addressee), status: f.status })),
      coaching: coachings.map((c) => ({
        role: c.coach.id === userId ? 'coach' : 'client',
        with: other(c.coach, c.client),
        status: c.status,
      })),
      trainingBlocks: blocks.map((b) => ({
        program: b.program.name,
        status: b.status,
        startedOn: b.startedOn,
        endedOn: b.endedOn,
      })),
    };
  }

  /**
   * Deletes the account and everything that's only theirs: sessions,
   * sets, videos, programs, body weight, friendships, coaching links.
   * Their own exercises go too — except ones a friend's programs or logs
   * still use, which are kept (retired) so the friend's data isn't damaged.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.checkPassword(userId, password);

    const videos = await this.db
      .getRepository(WorkoutSession)
      .find({ where: { user: { id: userId } } })
      .then((ss) => ss.flatMap((s) => s.sets.map((set) => set.videoFile)));
    // Files in their chats, sent or received — the messages go with the account.
    const chatFiles = await this.db
      .getRepository(Message)
      .createQueryBuilder('m')
      .select('m.attachmentFile', 'file')
      .where('m.attachmentFile IS NOT NULL')
      .andWhere('(m.senderId = :me OR m.recipientId = :me)', { me: userId })
      .getRawMany<{ file: string }>();

    await this.db.transaction(async (tx) => {
      const usedByOthers = await ownExercisesUsedByOthers(tx, userId);

      if (usedByOthers.length > 0) {
        await tx.getRepository(Exercise).update(usedByOthers, { retired: true });
      }
      const query = tx.getRepository(Exercise).createQueryBuilder().delete().where('"ownerId" = :me', { me: userId });
      if (usedByOthers.length > 0) query.andWhere('id NOT IN (:...keep)', { keep: usedByOthers });
      await query.execute();

      // Cascades take the rest: sessions → sets, programs, body weight,
      // friendships, coachings, shares, blocks, reset tokens.
      await tx.getRepository(User).remove(user);
    });

    await Promise.all(videos.map(removeVideoFile));
    await Promise.all(chatFiles.map((f) => removeAttachmentFile(f.file)));
    await removeAvatarFile(user.avatarFile);
  }

  private async checkPassword(userId: string, password: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('That password is not right');
    }
    return user;
  }
}
