import { addDays, parseDate, todayISO } from './datetime';

/** Sanani Toshkent kalendar kuniga keltiradi: hisob soatga emas, to‘lov kuniga bog‘lanadi. */
function asDay(value: Date) {
  return parseDate(todayISO(value));
}

/** Bir oylik to'lov shu qancha kunga to'g'ri keladi (750 000 so'm = 30 kun). */
export const DAYS_PER_MONTH = 30;

/** Bitta o'rinning oylik narxi. Yangi xonalar shu narx bilan yaratiladi. */
export const DEFAULT_MONTHLY_PRICE = 750000;

/** To'lov muddati shu kun qolganda eslatma boshlanadi. */
export const REMIND_BEFORE_DAYS = 3;

/** Eslatmalar har kuni Toshkent vaqti bilan shu soatda yoziladi. */
export const REMIND_AT_HOUR = 11;

/**
 * To'langan summa qancha kun berganini hisoblaydi.
 * Oylik narx 30 kunga to'g'ri keladi, ya'ni yarim summa yarim oy (15 kun) beradi.
 * Kasr kunlar mijoz zarariga yaxlitlanmasligi uchun pastga qarab olinadi.
 */
export function daysForAmount(amount: number, monthlyPrice: number) {
  if (!monthlyPrice || monthlyPrice <= 0 || !amount || amount <= 0) return 0;
  return Math.floor((amount / monthlyPrice) * DAYS_PER_MONTH);
}

/** Kunlarni oy va kunga ajratadi: 45 kun -> { months: 1, days: 15 }. */
export function splitDays(totalDays: number) {
  const days = Math.max(0, Math.trunc(totalDays));
  return { months: Math.floor(days / DAYS_PER_MONTH), days: days % DAYS_PER_MONTH };
}

/** Odam o'qiy oladigan shakl: "3 oy", "1 oy 15 kun", "12 kun". */
export function describeDays(totalDays: number) {
  const { months, days } = splitDays(totalDays);
  if (!months && !days) return '—';
  const parts: string[] = [];
  if (months) parts.push(`${months} oy`);
  if (days) parts.push(`${days} kun`);
  return parts.join(' ');
}

/**
 * To'lov qaysi davrni yopganini hisoblaydi.
 * Oldingi muddat hali tugamagan bo'lsa yangi kunlar uning ustiga qo'shiladi;
 * muddat o'tib ketgan (yoki birinchi to'lov) bo'lsa hisob to'lov qilingan kundan boshlanadi.
 */
export function paymentPeriod(opts: {
  amount: number;
  monthlyPrice: number;
  paidAt: Date;
  currentPaidUntil?: Date | null;
}) {
  const days = daysForAmount(opts.amount, opts.monthlyPrice);
  const paidAt = asDay(opts.paidAt);
  const current = opts.currentPaidUntil ? asDay(opts.currentPaidUntil) : null;
  const from = current && current.getTime() > paidAt.getTime() ? current : paidAt;
  return { days, from, to: addDays(from, days) };
}

/**
 * To'lov bekor qilinganda muddatni qaytarib oladi:
 * summa ham, shu to'lov bergan kunlar ham hisobdan chiqariladi.
 */
export function revertPeriod(
  stay: { paidAmount: number; paidUntil: Date | null; paidDays: number },
  payment: { amount: number; days: number },
) {
  const days = payment.days || 0;
  return {
    paidAmount: Math.max(0, stay.paidAmount - payment.amount),
    paidDays: Math.max(0, stay.paidDays - days),
    paidUntil: days && stay.paidUntil ? addDays(stay.paidUntil, -days) : stay.paidUntil,
  };
}

/** Muddatgacha qolgan kun: manfiy bo'lsa muddat o'tib ketgan. */
export function daysLeftUntil(paidUntil: Date | null | undefined, from: Date) {
  if (!paidUntil) return null;
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil((dateOnly(paidUntil) - dateOnly(from)) / day);
}

function dateOnly(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** Eslatma kerakmi: muddat 3 kun yoki kamroq qolganda, shuningdek o'tib ketganda. */
export function needsReminder(daysLeft: number | null) {
  return daysLeft !== null && daysLeft <= REMIND_BEFORE_DAYS;
}

/**
 * Ro'yxat va hisobotlarda ko'rsatiladigan to'lov muddati ma'lumoti.
 * Oylik yashovchida muddat `paidUntil`, kunlikda esa chiqish sanasi bo'yicha.
 */
export function periodInfo(
  stay: { paidUntil?: Date | null; paidDays?: number | null; endDate?: Date | null },
  now = new Date(),
) {
  const dueDate = stay.paidUntil ?? stay.endDate ?? null;
  const daysLeft = daysLeftUntil(dueDate, now);
  return {
    dueDate,
    daysLeft,
    paidDaysLabel: describeDays(stay.paidDays || 0),
    overdue: daysLeft !== null && daysLeft < 0,
    dueSoon: needsReminder(daysLeft),
  };
}
