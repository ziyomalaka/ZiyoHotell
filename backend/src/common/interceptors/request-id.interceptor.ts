import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { requestId?: string; user?: { id?: string } }>();
    const res = context.switchToHttp().getResponse<Response>();
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            requestId: id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration: Date.now() - start,
            userId: req.user?.id,
          }),
        );
      }),
    );
  }
}
