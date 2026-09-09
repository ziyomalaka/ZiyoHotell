import { addDays, parseDate, todayISO } from './datetime';

/** Sanani Toshkent kalendar kuniga keltiradi: hisob soatga emas, to‘lov kuniga bog‘lanadi. */
function asDay(value: Date) {
  return parseDate(todayISO(value));
}

/** Oylik yashash: kuniga 25 000, 30 kun = 1 oy. */
export const MONTHLY_DAY_PRICE = 25000;

/** Kunlik yashash: kuniga 50 000. */
export const DAILY_STAY_PRICE = 50000;

/** 30 kun = 1 oy. */
export const DAYS_PER_MONTH = 30;

/** Yangi xonalar oylik narxi = 25 000 × 30. */
export const DEFAULT_MONTHLY_PRICE = MONTHLY_DAY_PRICE * DAYS_PER_MONTH;

/** Xona kunlik narxi (kunlik yashash). */
export const DEFAULT_DAILY_PRICE = DAILY_STAY_PRICE;

/** To'lov muddati shu kun qolganda eslatma boshlanadi. */
export const REMIND_BEFORE_DAYS = 3;

/** Eslatmalar har kuni Toshkent vaqti bilan shu soatda yoziladi. */
export const REMIND_AT_HOUR = 11;

/** To‘langan summalarni naqd va karta bo‘yicha ajratadi. */
export function cashCardTotals(rows: { method?: string | null; amount: number }[]) {
  let cash = 0;
  let card = 0;
  for (const row of rows) {
    if (row.method === 'CASH') cash += row.amount;
    else if (row.method === 'CARD') card += row.amount;
  }
  return { cash, card };
}

/** Oylik narxdan kunlik tarif: 750 000 / 30 = 25 000. */
export function dailyPriceFromMonthly(monthlyPrice: number) {
  if (!monthlyPrice || monthlyPrice <= 0) return MONTHLY_DAY_PRICE;
  return Math.round(monthlyPrice / DAYS_PER_MONTH);
}

/** Kunlik yashash = 50 000/kun, oylik = 25 000/kun. */
export function dailyRate(type?: string | null, monthlyPrice?: number) {
  if (type === 'DAILY') return DAILY_STAY_PRICE;
  return dailyPriceFromMonthly(monthlyPrice || DEFAULT_MONTHLY_PRICE);
}

/**
 * To'langan summa qancha kun berganini hisoblaydi.
 * Oylik: 25 000 = 1 kun, 750 000 = 30 kun. Kunlik: 50 000 = 1 kun.
 */
export function daysForAmount(amount: number, monthlyPrice: number, type?: string | null) {
  const daily = dailyRate(type, monthlyPrice);
  if (!daily || !amount || amount <= 0) return 0;
  return Math.floor(amount / daily);
}

/** Kunlarni oy va kunga ajratadi: 45 kun -> { months: 1, days: 15 }. */
export function splitDays(totalDays: number) {
  const days = Math.max(0, Math.trunc(totalDays));
  return { months: Math.floor(days / DAYS_PER_MONTH), days: days % DAYS_PER_MONTH };
}

/** Odam o'qiy oladigan shakl: "3 oy", "1 oy 15 kun", "12 kun". Kunlikda faqat kun. */
export function describeDays(totalDays: number, type?: string | null) {
  const days = Math.max(0, Math.trunc(totalDays));
  if (!days) return '—';
  if (type === 'DAILY') return `${days} kun`;
  const parts: string[] = [];
  const months = Math.floor(days / DAYS_PER_MONTH);
  const rest = days % DAYS_PER_MONTH;
  if (months) parts.push(`${months} oy`);
  if (rest) parts.push(`${rest} kun`);
  return parts.join(' ');
}

/**
 * To'lov qaysi davrni yopganini hisoblaydi.
 * Hisob kirish kunidan boradi: to'langan jami kunlar shu sanadan qo'shiladi.
 * Keyingi to'lov qolgan kunlar ustiga yoziladi.
 */
export function paymentPeriod(opts: {
  amount: number;
  monthlyPrice: number;
  paidAt: Date;
  startDate?: Date | null;
  currentPaidDays?: number;
  currentPaidUntil?: Date | null;
  type?: string | null;
}) {
  const days = daysForAmount(opts.amount, opts.monthlyPrice, opts.type);
  const origin = asDay(opts.startDate || opts.paidAt);
  const already = Math.max(0, Math.trunc(opts.currentPaidDays || 0));
  const from = addDays(origin, already);
  return { days, from, to: addDays(from, days) };
}

/** To‘lov yopgan sana: paidUntil yo‘q bo‘lsa kirish + to‘langan kunlar. */
export function inferredPaidUntil(stay: {
  paidUntil?: Date | string | null;
  startDate?: Date | string | null;
  paidDays?: number | null;
  endDate?: Date | string | null;
}) {
  if (stay.paidUntil) return stay.paidUntil;
  const start = asDate(stay.startDate);
  const days = Math.max(0, Math.trunc(stay.paidDays || 0));
  if (start && days) return addDays(asDay(start), days);
  return stay.endDate ?? null;
}

/** Chiqish kuni: chiqib ketgan bo'lsa haqiqiy chiqish, aks holda to'lov yopgan sana. */
export function checkoutDate(stay: {
  status?: string | null;
  paidUntil?: Date | string | null;
  startDate?: Date | string | null;
  paidDays?: number | null;
  endDate?: Date | string | null;
}) {
  if (stay.status === 'COMPLETED' && stay.endDate) return stay.endDate;
  return inferredPaidUntil(stay);
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
export function daysLeftUntil(paidUntil: Date | string | null | undefined, from: Date | string = new Date()) {
  const due = asDate(paidUntil);
  const origin = asDate(from);
  if (!due || !origin) return null;
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil((dateOnly(due) - dateOnly(origin)) / day);
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
 * Oylik yashovchida muddat `paidUntil` (kirish + to'langan kunlar), kunlikda chiqish sanasi.
 */
export function periodInfo(
  stay: {
    status?: string | null;
    paidUntil?: Date | null;
    paidDays?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    type?: string | null;
  },
  now = new Date(),
) {
  const dueDate = inferredPaidUntil(stay);
  const daysLeft = daysLeftUntil(dueDate, now);
  return {
    dueDate,
    checkoutDate: checkoutDate(stay),
    daysLeft,
    paidDaysLabel: describeDays(stay.paidDays || 0, stay.type),
    overdue: daysLeft !== null && daysLeft < 0,
    dueSoon: needsReminder(daysLeft),
  };
}
