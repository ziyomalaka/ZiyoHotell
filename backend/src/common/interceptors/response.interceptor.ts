import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) return data;
        // Faqat boolean `ok` — allaqachon o‘ralgan javob. Hisobotdagi sonli `ok` o‘ralishi kerak.
        if (data && typeof data === 'object' && typeof (data as { ok?: unknown }).ok === 'boolean') return data;
        return { ok: true, success: true, data };
      }),
    );
  }
}
