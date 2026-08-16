import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionCleanupService } from './session-cleanup.service';

@Module({
  imports: [SessionsModule],
  providers: [SessionCleanupService],
  exports: [SessionCleanupService],
})
export class CleanupModule {}
