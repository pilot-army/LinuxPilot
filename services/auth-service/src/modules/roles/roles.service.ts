import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async requireByName(name: string) {
    const role = await this.rolesRepository.findByName(name);
    if (!role) {
      throw new Error(`Role "${name}" is not seeded. Run prisma db seed first.`);
    }
    return role;
  }
}
