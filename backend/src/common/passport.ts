import { AppError } from './errors';

export const PASSPORT_ID_RE = /^[A-Z]{2}\d{7}$/;

export function normalizePassportId(value?: string | null) {
  const id = (value || '').trim().toUpperCase();
  if (!PASSPORT_ID_RE.test(id)) {
    throw new AppError('ID raqami 2 ta harf va 7 ta raqam bo‘lishi kerak. Masalan: AA1234567.', 400, 'INVALID_PASSPORT');
  }
  return id;
}
