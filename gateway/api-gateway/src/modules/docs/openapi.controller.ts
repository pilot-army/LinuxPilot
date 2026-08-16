import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { gatewayOpenApi } from './openapi';

@Controller('api/v1')
@SkipThrottle({ login: true, refresh: true })
export class OpenApiController {
  @Get('openapi.json')
  spec() {
    return gatewayOpenApi;
  }
}
