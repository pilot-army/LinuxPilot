import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('health')
  live() {
    return this.healthService.live();
  }

  @Public()
  @Get('ready')
  ready() {
    return this.healthService.ready();
  }
}
