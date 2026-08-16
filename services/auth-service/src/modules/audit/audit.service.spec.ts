import { AuditService } from './audit.service';
import { type PrismaService } from '../../infrastructure/database/prisma.service';
import { AUDIT_ACTIONS } from './audit.types';

describe('AuditService', () => {
  it('drops secrets from metadata', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({
      auditLog: { create },
    } as unknown as PrismaService);

    await service.record({
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      targetType: 'user',
      metadata: {
        reason: 'password',
        password: 'secret',
        refreshToken: 'sid.secret',
        token: 'abc',
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { reason: 'password' },
      }),
    });
  });
});
