import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Envuelve toda respuesta en un sobre uniforme { success, data, meta }.
 * Las respuestas SSE (text/event-stream) se dejan pasar sin envolver.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const res = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data: any) => {
        const isStream = res?.getHeader?.('Content-Type')
          ?.toString()
          .includes('text/event-stream');
        if (isStream || data?.__raw) return data;
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return { success: true, ...data };
        }
        return { success: true, data };
      }),
    );
  }
}
