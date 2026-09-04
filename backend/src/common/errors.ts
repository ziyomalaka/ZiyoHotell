import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    public readonly messageUz: string,
    status = HttpStatus.BAD_REQUEST,
    public readonly code = 'BAD_REQUEST',
  ) {
    super({ message: messageUz, code, statusCode: status }, status);
  }
}

export function required(fields: Record<string, unknown>) {
  for (const [, value] of Object.entries(fields)) {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new AppError('Majburiy maydonlarni to‘ldiring.', 400, 'VALIDATION_ERROR');
    }
  }
}

export function parsePage(query: { page?: string | number; pageSize?: string | number; limit?: string | number }) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || query.limit || 20)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}
