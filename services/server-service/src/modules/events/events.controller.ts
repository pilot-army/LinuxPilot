import { Controller, Get, Query } from '@nestjs/common';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { listEventsQuerySchema, type ListEventsQuery } from '@linuxpilot/server-contracts';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EventsService } from './events.service';

@Controller('server-events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  list(@Query(new ZodValidationPipe(listEventsQuerySchema)) query: ListEventsQuery) {
    return this.events.list(query);
  }
}
