import { Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType } from 'zod';
import { AppError } from '@linuxpilot/common';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      throw new AppError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 400, details);
    }
    return result.data;
  }
}
