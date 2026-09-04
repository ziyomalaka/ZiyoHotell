import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AppError } from '../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ma’lumotni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof AppError) {
      status = exception.getStatus();
      message = exception.messageUz;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as { message?: string | string[] }).message
        ? Array.isArray((body as { message: string[] }).message)
          ? (body as { message: string[] }).message[0]
          : String((body as { message: string }).message)
        : exception.message;
      if (/property .+ should not exist/i.test(message)) {
        message = 'So‘rov parametrlari noto‘g‘ri. Sahifani yangilab qayta urinib ko‘ring.';
      }
      if (status === 401) {
        message = message || 'Tizimga kiring.';
        code = 'UNAUTHORIZED';
      }
      if (status === 403) {
        message = 'Ushbu amalni bajarish uchun ruxsatingiz yo‘q.';
        code = 'ACCESS_DENIED';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const target = String(exception.meta?.target ?? '');
      if (target.includes('login')) {
        message = 'Ushbu login band.';
        code = 'LOGIN_TAKEN';
      } else if (target.includes('floorId') && target.includes('number')) {
        message = 'Ushbu qavatda bunday xona raqami mavjud.';
        code = 'ROOM_NUMBER_TAKEN';
      } else if (target.includes('bedId') || target.includes('Occupancy')) {
        message = 'Ushbu o‘rin band. Boshqa o‘rin tanlang.';
        code = 'BED_ALREADY_OCCUPIED';
      } else if (target.includes('customerId')) {
        message = 'Ushbu mijoz hozir yotoqxonada faol.';
        code = 'CUSTOMER_ALREADY_ACTIVE';
      } else if (target.includes('passportId')) {
        message = 'Ushbu pasport / ID allaqachon mavjud.';
        code = 'PASSPORT_TAKEN';
      } else {
        message = 'Ma’lumotni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.';
        code = 'CONFLICT';
      }
    } else {
      this.logger.error(exception);
    }

    res.status(status).json({
      ok: false,
      success: false,
      statusCode: status,
      code,
      error: message,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
