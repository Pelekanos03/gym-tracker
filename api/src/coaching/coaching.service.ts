import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachingRelationship } from '../domain/coaching-relationship.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums';

@Injectable()
export class CoachingService {
  constructor(
    @InjectRepository(CoachingRelationship)
    private readonly links: Repository<CoachingRelationship>,
    private readonly users: UsersService,
  ) {}

  /** Coach takes on a client. Idempotent: re-linking just re-activates. */
  async link(coachId: string, clientId: string): Promise<CoachingRelationship> {
    const coach = await this.users.requireRole(coachId, UserRole.COACH);
    const client = await this.users.requireRole(clientId, UserRole.CLIENT);

    let link = await this.links.findOne({
      where: { coach: { id: coach.id }, client: { id: client.id } },
    });
    if (link) {
      link.active = true;
    } else {
      link = this.links.create({ coach, client, active: true });
    }
    return this.links.save(link);
  }

  async unlink(coachId: string, clientId: string): Promise<void> {
    const link = await this.links.findOne({
      where: { coach: { id: coachId }, client: { id: clientId } },
    });
    if (!link) throw new NotFoundException('No such coaching relationship');
    link.active = false;
    await this.links.save(link);
  }

  /** The coach's roster. */
  clientsOf(coachId: string): Promise<CoachingRelationship[]> {
    return this.links.find({
      where: { coach: { id: coachId }, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  /** Guard used elsewhere: throws unless this coach actually coaches this client. */
  async assertCoaches(coachId: string, clientId: string): Promise<void> {
    const link = await this.links.findOne({
      where: { coach: { id: coachId }, client: { id: clientId }, active: true },
    });
    if (!link) {
      throw new NotFoundException(
        'That client is not on this coach\'s roster',
      );
    }
  }
}
