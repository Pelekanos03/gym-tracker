import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { UsersService } from '../users/users.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CoachingService } from '../coaching/coaching.service';

describe('ProgramsService', () => {
  let service: ProgramsService;
  let programsRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let programDaysRepo: { remove: jest.Mock };
  let coaching: { assertCoach: jest.Mock };
  let source: Program;

  const alex = { id: 'alex', name: 'Alex' } as any;
  const sam = { id: 'sam', name: 'Sam' } as any;
  const strangerId = 'jordan';

  const exercise = { id: 'ex1', name: 'Back Squat' } as any;

  function sourceProgram(): Program {
    const day = new ProgramDay();
    day.id = 'day1';
    day.weekNumber = 1;
    day.dayNumber = 1;
    day.name = 'Day 1';
    day.exercises = [
      Object.assign({ id: 'pe1', exercise, orderIndex: 1, targetSets: 5, targetReps: 5, targetRpe: 7, targetPercent1rm: null, notes: '' }),
    ] as any;

    const program = new Program();
    program.id = 'prog1';
    program.name = 'Starter Strength';
    program.description = '';
    program.lengthWeeks = 4;
    program.owner = alex;
    program.days = [day];
    return program;
  }

  beforeEach(async () => {
    source = sourceProgram();
    programsRepo = {
      findOne: jest.fn(async () => source),
      find: jest.fn(),
      save: jest.fn(async (p: Program) => p),
    };
    programDaysRepo = { remove: jest.fn(async () => undefined) };
    coaching = { assertCoach: jest.fn(async () => undefined) };

    const module = await Test.createTestingModule({
      providers: [
        ProgramsService,
        { provide: getRepositoryToken(Program), useValue: programsRepo },
        { provide: getRepositoryToken(ProgramDay), useValue: programDaysRepo },
        { provide: UsersService, useValue: { findById: jest.fn(async (id: string) => (id === 'alex' ? alex : id === 'sam' ? sam : { id: strangerId })) } },
        { provide: ExercisesService, useValue: { findManyByIds: jest.fn(async () => new Map([[exercise.id, exercise]])) } },
        { provide: CoachingService, useValue: coaching },
      ],
    }).compile();

    service = module.get(ProgramsService);
  });

  describe('copy', () => {
    it("lets the owner copy their own program without a coaching check", async () => {
      const copy = await service.copy('prog1', { toUserId: 'alex' }, 'alex');
      expect(coaching.assertCoach).not.toHaveBeenCalled();
      expect(copy.owner.id).toBe('alex');
      expect(copy.id).not.toBe('prog1'); // real clone, not the same row
      expect(copy.days).not.toBe(source.days); // deep-cloned, not shared
      expect(copy.days[0]).not.toBe(source.days[0]);
    });

    it("checks the owner is an accepted coach of the destination user before sending a copy", async () => {
      const copy = await service.copy('prog1', { toUserId: 'sam' }, 'alex');
      expect(coaching.assertCoach).toHaveBeenCalledWith('alex', 'sam');
      expect(copy.owner.id).toBe('sam');
      expect(copy.days[0].name).toBe('Day 1');
      expect(copy.days[0].exercises[0].targetSets).toBe(5);
    });

    it("refuses to copy someone else's program", async () => {
      await expect(service.copy('prog1', { toUserId: 'sam' }, 'sam')).rejects.toThrow(ForbiddenException);
      expect(coaching.assertCoach).not.toHaveBeenCalled();
    });

    it('refuses to copy to a client the owner does not coach', async () => {
      coaching.assertCoach.mockRejectedValueOnce(new NotFoundException('Not an accepted coach of that user'));
      await expect(service.copy('prog1', { toUserId: strangerId }, 'alex')).rejects.toThrow(NotFoundException);
      expect(programsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejects an edit from someone other than the owner', async () => {
      await expect(
        service.update('prog1', { ownerId: 'sam', name: 'Hijacked', days: [] }),
      ).rejects.toThrow(ForbiddenException);
      expect(programDaysRepo.remove).not.toHaveBeenCalled();
    });

    it('lets the owner replace the days', async () => {
      const updated = await service.update('prog1', {
        ownerId: 'alex',
        name: 'Starter Strength v2',
        days: [
          { weekNumber: 1, dayNumber: 1, name: 'Day 1', exercises: [{ exerciseId: 'ex1', orderIndex: 1, targetSets: 3, targetReps: 8 }] },
        ],
      });
      expect(programDaysRepo.remove).toHaveBeenCalled();
      expect(updated.name).toBe('Starter Strength v2');
      expect(updated.days[0].exercises[0].targetSets).toBe(3);
    });
  });

  describe('delete', () => {
    it('rejects deletion from a non-owner', async () => {
      await expect(service.delete('prog1', 'sam')).rejects.toThrow(ForbiddenException);
    });
  });
});
