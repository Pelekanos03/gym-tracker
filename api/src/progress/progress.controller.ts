import { Controller, Get, Param } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  /** Client's own progress. */
  @Get('clients/:clientId/progress')
  mine(@Param('clientId') clientId: string) {
    return this.progress.forClient(clientId);
  }

  /** Coach viewing a client's progress. */
  @Get('coaches/:coachId/clients/:clientId/progress')
  clientProgress(
    @Param('coachId') coachId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.progress.forClientAsCoach(coachId, clientId);
  }
}
