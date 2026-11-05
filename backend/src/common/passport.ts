import { AppError } from './errors';

export const PASSPORT_ID_RE = /^[A-Z]{2}\d{7}$/;

/** Migrant pasporti: davlatga qarab har xil — faqat harf va raqam, 3–20 belgi. */
export const MIGRANT_PASSPORT_RE = /^[\p{L}\p{N}]{3,20}$/u;

export function normalizePassportId(value?: string | null) {
  const id = (value || '').trim().toUpperCase();
  if (!PASSPORT_ID_RE.test(id)) {
    throw new AppError('ID raqami 2 ta harf va 7 ta raqam bo‘lishi kerak. Masalan: AA1234567.', 400, 'INVALID_PASSPORT');
  }
  return id;
}

/** Migrant pasporti: bo‘sh joy va chiziqchalar olib tashlanadi, format tekshirilmaydi. */
export function normalizeMigrantPassportId(value?: string | null) {
  const id = String(value ?? '').replace(/[\s-]+/g, '').toUpperCase();
  if (!MIGRANT_PASSPORT_RE.test(id)) {
    throw new AppError('Pasport raqami 3–20 ta harf yoki raqamdan iborat bo‘lishi kerak.', 400, 'INVALID_PASSPORT');
  }
  return id;
}
