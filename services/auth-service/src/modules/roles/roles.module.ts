import { Module } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  providers: [RolesRepository, RolesService],
  exports: [RolesRepository, RolesService],
})
export class RolesModule {}
