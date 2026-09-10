import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Exercise } from '../domain/exercise.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exercises: Repository<Exercise>,
  ) {}

  findAll(): Promise<Exercise[]> {
    return this.exercises.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async findManyByIds(ids: string[]): Promise<Map<string, Exercise>> {
    const found = await this.exercises.find({ where: { id: In(ids) } });
    const byId = new Map(found.map((e) => [e.id, e]));
    for (const id of ids) {
      if (!byId.has(id)) throw new NotFoundException(`Exercise ${id} not found`);
    }
    return byId;
  }

  create(dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercises.save(this.exercises.create(dto));
  }
}
