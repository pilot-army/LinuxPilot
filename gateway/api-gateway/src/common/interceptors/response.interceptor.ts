import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { successResponse, type ApiSuccess } from '@linuxpilot/common';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRequestId } from '../http/request-context';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const requestId = getRequestId(context.switchToHttp().getRequest());
    return next.handle().pipe(map((data) => successResponse(data, requestId)));
  }
}
