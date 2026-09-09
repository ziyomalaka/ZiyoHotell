export const BUSINESS_TZ = "Asia/Tashkent";

export const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

type TashkentParts = { year: number; month: number; day: number; hour: number; minute: number };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Calendar/clock parts in Asia/Tashkent. Does not use locale month names. */
export function tashkentParts(value: Date | string): TashkentParts | null {
  if (typeof value === "string" && isDateOnly(value)) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day, hour: 0, minute: 0 };
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = num("year");
  const month = num("month");
  const day = num("day");
  if (!year || !month || !day) return null;
  return { year, month, day, hour: num("hour") || 0, minute: num("minute") || 0 };
}

export function formatMoney(value: number) {
  const n = Math.round(Number(value) || 0);
  const grouped = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "-" : ""}${grouped} so‘m`;
}

export function todayISO(date: Date | string = new Date()) {
  const p = tashkentParts(date);
  if (!p) return "";
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function dayStart(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export function dayEnd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const p = tashkentParts(value);
  if (!p) return "—";
  return `${pad2(p.day)}.${pad2(p.month)}.${p.year}`;
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const p = tashkentParts(value);
  if (!p) return "—";
  return `${pad2(p.day)}.${pad2(p.month)}.${p.year} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const p = tashkentParts(value);
  if (!p) return "—";
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatLongDate(value: Date | string | null | undefined, withYear = false) {
  if (value == null || value === "") return "—";
  const p = tashkentParts(value);
  if (!p) return "—";
  const month = UZ_MONTHS[p.month - 1];
  if (!month) return "—";
  return withYear ? `${p.day}-${month} ${p.year}` : `${p.day}-${month}`;
}

export function stayTypeLabel(type: string) {
  return type === "DAILY" ? "Kunlik" : type === "MONTHLY" ? "Oylik" : type;
}

export function payStatusLabel(status: string) {
  if (status === "PAID") return "To‘ladi";
  if (status === "PARTIAL" || status === "UNPAID") return "To‘lamadi";
  if (status === "CANCELLED") return "Bekor qilingan";
  return status;
}

export function greetingLabel(date = new Date()) {
  const hour = tashkentParts(date)?.hour ?? 12;
  if (hour < 12) return "Xayrli tong";
  if (hour < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export function longDateLabel(iso?: string, withYear = false) {
  return formatLongDate(iso || null, withYear);
}

export function methodLabel(method: string) {
  if (method === "CASH") return "Naqd";
  if (method === "CARD") return "Karta";
  if (method === "BANK") return "Bank";
  if (method === "OTHER") return "Boshqa";
  return method;
}

export function stayDebt(totalAmount: number, paidAmount: number) {
  return Math.max(0, totalAmount - paidAmount);
}

export function roomLabel(room: unknown) {
  if (room == null || room === "") return "—";
  if (typeof room === "object" && "number" in (room as object)) {
    return String((room as { number: string | number }).number);
  }
  return String(room);
}

export function bedLabel(bed: unknown) {
  if (bed == null || bed === "") return "—";
  if (typeof bed === "object" && "number" in (bed as object)) {
    return String((bed as { number: string | number }).number);
  }
  return String(bed);
}

export function roomBedLabel(room: unknown, bed?: unknown) {
  if (bed === undefined || bed === null || bed === "") return roomLabel(room);
  return `${roomLabel(room)}/${bedLabel(bed)}`;
}

/** Xona yoki guruh jinsi: "Qizlar" / "Bollar". */
export function genderLabel(value: unknown) {
  return value === "FEMALE" ? "Qizlar" : value === "MALE" ? "Bollar" : "—";
}

/** Bitta mijozning jinsi: "Qiz" / "Bola". */
export function customerGenderLabel(value: unknown) {
  return value === "FEMALE" ? "Qiz" : value === "MALE" ? "Bola" : "—";
}

/**
 * Xona raqamlarini tabiiy tartibda solishtiradi: 2 < 10 (matn tartibida 10 < 2 bo‘lib ketardi).
 * Locale'ga bog‘lanmagan, shuning uchun server va clientda natija bir xil.
 */
export function compareRoomNumbers(a: string, b: string) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  if (Number.isNaN(na) !== Number.isNaN(nb)) return Number.isNaN(na) ? 1 : -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Qavat raqamini oladi: son, `{ floor }` yoki `{ level: { number } }` shakllarini tushunadi. */
export function floorOf(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    const row = value as { floor?: unknown; level?: { number?: unknown }; number?: unknown };
    if (row.floor != null) return floorOf(row.floor);
    if (row.level && typeof row.level === "object") return floorOf(row.level.number);
  }
  return null;
}

/** "2-qavat" ko‘rinishidagi yorliq. Qavat topilmasa "—". */
export function floorLabel(value: unknown) {
  const floor = floorOf(value);
  return floor == null ? "—" : `${floor}-qavat`;
}

export function daysInMonth(year: number, month1to12: number) {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function isoDay(year: number, month1to12: number, day: number) {
  return `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthStartISO(iso = todayISO()) {
  return iso.slice(0, 8) + "01";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function paymentStatusFromAmounts(total: number, paid: number) {
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

export function occupancyColor(occupied: number, capacity: number, status: string) {
  if (status !== "ACTIVE") return "inactive";
  if (occupied <= 0) return "empty";
  if (occupied >= capacity) return "full";
  return "partial";
}

export function occupancyLabel(kind: string) {
  if (kind === "empty") return "BO‘SH";
  if (kind === "partial") return "QISMAN BAND";
  if (kind === "full") return "TO‘LIQ BAND";
  return "TA’MIRDA";
}

/** Oylik: kuniga 25 000, 30 kun = 1 oy = 750 000. Kunlik: kuniga 50 000. */
export const MONTHLY_DAY_PRICE = 25000;
export const DAILY_STAY_PRICE = 50000;
export const DAYS_PER_MONTH = 30;
export const DEFAULT_MONTHLY_PRICE = MONTHLY_DAY_PRICE * DAYS_PER_MONTH;
export const DEFAULT_DAILY_PRICE = DAILY_STAY_PRICE;
export const DEFAULT_REGISTER_MONTHS = 3;
export const DEFAULT_REGISTER_AMOUNT = DEFAULT_MONTHLY_PRICE * DEFAULT_REGISTER_MONTHS;

/** Oylik: 25 000 = 1 kun. Kunlik: 50 000 = 1 kun. */
export function daysForAmount(amount: number, monthlyPrice = DEFAULT_MONTHLY_PRICE, type?: string | null) {
  const daily = type === "DAILY" ? DAILY_STAY_PRICE : monthlyPrice > 0 ? monthlyPrice / DAYS_PER_MONTH : MONTHLY_DAY_PRICE;
  if (!daily || !amount || amount <= 0) return 0;
  return Math.floor(amount / daily);
}

export function splitDays(totalDays: number) {
  const days = Math.max(0, Math.trunc(totalDays));
  return { months: Math.floor(days / DAYS_PER_MONTH), days: days % DAYS_PER_MONTH };
}

/** "3 oy", "1 oy 15 kun", "12 kun". Kunlikda faqat kun. */
export function describeDays(totalDays: number, type?: string | null) {
  const days = Math.max(0, Math.trunc(totalDays));
  if (!days) return "—";
  if (type === "DAILY") return `${days} kun`;
  const { months, days: rest } = splitDays(days);
  const parts: string[] = [];
  if (months) parts.push(`${months} oy`);
  if (rest) parts.push(`${rest} kun`);
  return parts.join(" ");
}

/** Qolgan kun matni: "3 kun qoldi", "bugun tugaydi", "2 kun kechikdi". */
export function daysLeftLabel(daysLeft: number | null | undefined) {
  if (daysLeft == null) return "—";
  if (daysLeft > 0) return `${daysLeft} kun qoldi`;
  if (daysLeft === 0) return "bugun tugaydi";
  return `${Math.abs(daysLeft)} kun kechikdi`;
}

/** Chiqish kuni: chiqib ketgan bo‘lsa haqiqiy sana, aks holda to‘lov yopgan sana. */
export function checkoutDate(stay: {
  status?: string | null;
  paidUntil?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  checkoutDate?: string | null;
  startDate?: string | null;
  paidDays?: number | null;
}) {
  if (stay.checkoutDate) return stay.checkoutDate;
  if (stay.status === "COMPLETED" && stay.endDate) return stay.endDate;
  if (stay.paidUntil || stay.dueDate) return stay.paidUntil || stay.dueDate || null;
  if (stay.startDate && stay.paidDays) {
    const start = isDateOnly(stay.startDate) ? stay.startDate : todayISO(stay.startDate);
    if (start) return addDays(parseDate(start), stay.paidDays).toISOString();
  }
  return stay.endDate || null;
}
