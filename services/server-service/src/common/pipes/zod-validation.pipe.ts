import { Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType, type ZodTypeDef } from 'zod';
import { AppError } from '@linuxpilot/common';
import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      throw new AppError(SERVER_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 400, details);
    }
    return result.data;
  }
}
