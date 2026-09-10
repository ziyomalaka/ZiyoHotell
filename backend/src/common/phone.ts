import { AppError } from './errors';

export function normalizePhone(value?: string | null) {
  const raw = (value || '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  if (!digits) return '';
  if (!/^\d{9}$/.test(digits)) {
    throw new AppError('Telefon raqami +998 dan keyin 9 ta raqam bo‘lishi kerak.', 400, 'INVALID_PHONE');
  }
  return `+998${digits}`;
}
