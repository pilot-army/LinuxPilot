import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { type Request } from 'express';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
