import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UZ_MONTHS, addDays, dayEnd, dayStart, todayISO } from '../common/datetime';
import { GENDERS, genderLabel, roomGender } from '../common/gender';
import { periodInfo } from '../common/billing';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const where: { gte?: Date; lte?: Date } = {};
    if (from) where.gte = dayStart(from);
    if (to) where.lte = dayEnd(to);
    return Object.keys(where).length ? where : undefined;
  }

  /** Qavat filtri: faqat 1 dan katta butun son qabul qilinadi. */
  private level(floor?: number | string | null) {
    const value = Number(floor);
    return Number.isInteger(value) && value >= 1 ? value : null;
  }

  async customersReport(from?: string, to?: string, roomId?: string, status?: string, floor?: number) {
    const createdAt = this.range(from, to);
    const level = this.level(floor);
    const stays = await this.prisma.stay.findMany({
      where: {
        ...(createdAt ? { startDate: createdAt } : {}),
        ...(roomId ? { roomId } : {}),
        ...(status ? { status } : {}),
        ...(level ? { room: { floor: level } } : {}),
      },
      include: { customer: true, room: true, bed: true },
      orderBy: { startDate: 'desc' },
    });
    const active = level
      ? await this.prisma.occupancy.count({ where: { bed: { room: { floor: level } } } })
      : await this.prisma.occupancy.count();
    return {
      floor: level,
      total: stays.length,
      arrived: stays.length,
      left: stays.filter((s) => s.status === 'COMPLETED').length,
      living: status === 'ACTIVE' ? stays.length : active,
      rows: stays.map((s) => ({ ...s, ...periodInfo(s) })),
    };
  }

  /**
   * To'lov muddati hisoboti: kimning muddati qachon tugaydi.
   * Muddati yaqin va o'tib ketganlar birinchi turadi.
   */
  async paymentDueReport(floor?: number) {
    const level = this.level(floor);
    const stays = await this.prisma.stay.findMany({
      where: { status: 'ACTIVE', occupancy: { isNot: null }, ...(level ? { room: { floor: level } } : {}) },
      include: { customer: true, room: true, bed: true },
    });
    const rows = stays
      .map((s) => {
        const info = periodInfo(s);
        return {
          stayId: s.id,
          customerId: s.customerId,
          fullName: s.customer.fullName,
          phone: s.customer.phone,
          gender: s.customer.gender,
          floor: s.room.floor,
          room: s.room.number,
          bed: s.bed.number,
          type: s.type,
          startDate: s.startDate,
          monthlyPrice: s.monthlyPrice,
          paidAmount: s.paidAmount,
          paidDays: s.paidDays,
          ...info,
        };
      })
      .sort((a, b) => {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      });
    return {
      floor: level,
      total: rows.length,
      overdue: rows.filter((r) => r.overdue).length,
      dueSoon: rows.filter((r) => r.dueSoon && !r.overdue).length,
      // `ok` emas: javob o‘ramidagi boolean `ok` bilan aralashib, frontend 0 ni xato deb o‘qiydi.
      current: rows.filter((r) => r.daysLeft !== null && !r.dueSoon).length,
      expected: rows.filter((r) => r.dueSoon).reduce((acc, r) => acc + r.monthlyPrice, 0),
      rows,
    };
  }

  async paymentsReport(from?: string, to?: string, floor?: number) {
    const paidAt = this.range(from, to);
    const level = this.level(floor);
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(paidAt ? { paidAt } : {}),
        ...(level ? { stay: { room: { floor: level } } } : {}),
        NOT: { status: 'CANCELLED' },
      },
      include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: true },
      orderBy: { paidAt: 'desc' },
    });
    const sum = (status?: string, type?: string) =>
      payments
        .filter((p) => (status ? p.status === status : true) && (type ? p.type === type : true))
        .reduce((acc, p) => acc + p.amount, 0);
    const unpaidDebt = await this.prisma.stay.findMany({
      where: level ? { room: { floor: level } } : {},
      select: { totalAmount: true, paidAmount: true, status: true },
    });
    const unpaidStays = unpaidDebt.filter((s) => s.paidAmount < s.totalAmount);
    return {
      floor: level,
      daily: sum('PAID', 'DAILY'),
      monthly: sum('PAID', 'MONTHLY'),
      total: sum('PAID'),
      paid: sum('PAID'),
      partial: 0,
      unpaid: unpaidStays.reduce((acc, s) => acc + Math.max(0, s.totalAmount - s.paidAmount), 0),
      unpaidCount: unpaidStays.length,
      rows: payments,
    };
  }

  async occupancyReport(floor?: number) {
    const level = this.level(floor);
    const rooms = await this.prisma.room.findMany({
      where: level ? { floor: level } : {},
      include: { level: true, beds: { include: { occupancy: true } } },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
    const allBeds = rooms.flatMap((r) => r.beds);
    const activeBeds = allBeds.filter((b) => b.status === 'ACTIVE' && rooms.find((r) => r.id === b.roomId)?.status === 'ACTIVE');
    const occupied = activeBeds.filter((b) => b.occupancy).length;
    const repair = allBeds.filter((b) => b.status === 'REPAIR' || rooms.find((r) => r.id === b.roomId)?.status === 'REPAIR').length;
    let full = 0;
    let partial = 0;
    let empty = 0;
    let repairRooms = 0;
    for (const room of rooms) {
      if (room.status === 'REPAIR' || room.status === 'INACTIVE') {
        repairRooms += 1;
        continue;
      }
      const occ = room.beds.filter((b) => b.occupancy).length;
      if (occ <= 0) empty += 1;
      else if (occ >= room.capacity) full += 1;
      else partial += 1;
    }
    return {
      floor: level,
      floors: this.floorBreakdown(rooms),
      genders: this.genderBreakdown(rooms),
      rooms: rooms.length,
      beds: allBeds.length,
      occupied,
      free: activeBeds.length - occupied,
      repair,
      full,
      partial,
      empty,
      repairRooms,
      percent: activeBeds.length ? Math.round((occupied / activeBeds.length) * 100) : 0,
    };
  }

  async checkHistoryReport(from?: string, to?: string, floor?: number) {
    const at = this.range(from, to);
    const level = this.level(floor);
    return this.prisma.checkLog.findMany({
      where: {
        ...(at ? { at } : {}),
        ...(level ? { stay: { room: { floor: level } } } : {}),
      },
      include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: true },
      orderBy: { at: 'desc' },
    });
  }

  /** Qavatlar kesimida bandlik: har bir qavat uchun xona/o‘rin va foiz. */
  private floorBreakdown(
    rooms: {
      status: string;
      capacity: number;
      floor: number;
      level?: { number: number; name: string } | null;
      beds: { status: string; occupancy: unknown }[];
    }[],
  ) {
    const map = new Map<number, { floor: number; name: string; rooms: number; beds: number; occupied: number; repair: number }>();
    for (const room of rooms) {
      const key = room.level?.number ?? room.floor;
      const entry = map.get(key) || {
        floor: key,
        name: room.level?.name || `${key}-qavat`,
        rooms: 0,
        beds: 0,
        occupied: 0,
        repair: 0,
      };
      const inactive = room.status !== 'ACTIVE';
      entry.rooms += 1;
      if (inactive) entry.repair += 1;
      for (const bed of room.beds) {
        if (bed.status === 'ACTIVE' && !inactive) entry.beds += 1;
        if (bed.occupancy) entry.occupied += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => a.floor - b.floor)
      .map((f) => ({ ...f, free: Math.max(0, f.beds - f.occupied), percent: f.beds ? Math.round((f.occupied / f.beds) * 100) : 0 }));
  }

  /** Jinslar kesimida bandlik: bollar va qizlar xonalari alohida. */
  private genderBreakdown(
    rooms: { status: string; gender: string; beds: { status: string; occupancy: unknown }[] }[],
  ) {
    return GENDERS.map((gender) => {
      const list = rooms.filter((r) => roomGender(r.gender) === gender);
      let beds = 0;
      let occupied = 0;
      for (const room of list) {
        const inactive = room.status !== 'ACTIVE';
        for (const bed of room.beds) {
          if (bed.status === 'ACTIVE' && !inactive) beds += 1;
          if (bed.occupancy) occupied += 1;
        }
      }
      return {
        gender,
        name: genderLabel(gender),
        rooms: list.length,
        beds,
        occupied,
        free: Math.max(0, beds - occupied),
        percent: beds ? Math.round((occupied / beds) * 100) : 0,
      };
    });
  }

  /**
   * Kirim-chiqim hisoboti: davr kesimida qancha mijoz kirdi, qancha chiqdi
   * va shu davrda qancha to'lov tushdi. Kunlik / haftalik / oylik / yillik.
   */
  async movementReport(range?: string, floor?: number) {
    const view = movementView(range);
    const level = this.level(floor);
    const buckets = buildBuckets(view);
    const since = buckets[0].start;

    const [logs, payments] = await Promise.all([
      this.prisma.checkLog.findMany({
        where: { at: { gte: since }, ...(level ? { stay: { room: { floor: level } } } : {}) },
        select: { type: true, at: true },
      }),
      this.prisma.payment.findMany({
        where: {
          paidAt: { gte: since },
          NOT: { status: 'CANCELLED' },
          ...(level ? { stay: { room: { floor: level } } } : {}),
        },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const index = new Map(buckets.map((b) => [b.key, { ...b, in: 0, out: 0, income: 0 }]));
    for (const log of logs) {
      const row = index.get(bucketKey(log.at, view));
      if (!row) continue;
      if (log.type === 'CHECK_OUT') row.out += 1;
      else row.in += 1;
    }
    for (const pay of payments) {
      const row = index.get(bucketKey(pay.paidAt, view));
      if (row) row.income += pay.amount;
    }

    const rows = [...index.values()]
      .map(({ start, ...row }) => ({ ...row, net: row.in - row.out }))
      .reverse();
    const living = await this.prisma.occupancy.count({
      where: level ? { bed: { room: { floor: level } } } : {},
    });

    return {
      range: view,
      floor: level,
      living,
      totalIn: rows.reduce((a, r) => a + r.in, 0),
      totalOut: rows.reduce((a, r) => a + r.out, 0),
      totalIncome: rows.reduce((a, r) => a + r.income, 0),
      rows,
    };
  }
}

export type MovementView = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Kelgan qiymatni to'g'ri kesimga keltiradi, noto'g'ri bo'lsa kunlik. */
export function movementView(range?: string): MovementView {
  if (range === 'weekly' || range === 'monthly' || range === 'yearly') return range;
  return 'daily';
}

/** Sanani kesim kalitiga aylantiradi (Toshkent vaqti bo'yicha). */
function bucketKey(date: Date, view: MovementView) {
  const iso = todayISO(date);
  if (view === 'yearly') return iso.slice(0, 4);
  if (view === 'monthly') return iso.slice(0, 7);
  if (view === 'weekly') return weekKey(iso);
  return iso;
}

/** Hafta kaliti: "2026-W36" (hafta dushanbadan boshlanadi). */
function weekKey(iso: string) {
  const monday = weekMonday(iso);
  const thursday = addDays(monday, 3);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstThursday = addDays(weekMonday(todayISO(jan4)), 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Shu sana tushgan haftaning dushanbasi. */
function weekMonday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const shift = (date.getUTCDay() + 6) % 7;
  return addDays(date, -shift);
}

/** Hisobot uchun davrlar ro'yxati: eng eskisidan bugungacha. */
function buildBuckets(view: MovementView) {
  const today = todayISO();
  const [year, month, day] = today.split('-').map(Number);
  const list: { key: string; label: string; start: Date }[] = [];

  if (view === 'daily') {
    for (let i = 29; i >= 0; i -= 1) {
      const date = addDays(new Date(Date.UTC(year, month - 1, day, 12)), -i);
      const iso = todayISO(date);
      list.push({ key: iso, label: dayLabel(iso), start: dayStart(iso) });
    }
    return list;
  }
  if (view === 'weekly') {
    for (let i = 11; i >= 0; i -= 1) {
      const monday = addDays(weekMonday(today), -7 * i);
      const iso = todayISO(monday);
      const endIso = todayISO(addDays(monday, 6));
      list.push({
        key: weekKey(iso),
        label: `${shortDay(iso)} — ${shortDay(endIso)}`,
        start: dayStart(iso),
      });
    }
    return list;
  }
  if (view === 'monthly') {
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(Date.UTC(year, month - 1 - i, 1, 12));
      const iso = todayISO(date).slice(0, 7);
      list.push({
        key: iso,
        label: `${UZ_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
        start: dayStart(`${iso}-01`),
      });
    }
    return list;
  }
  for (let i = 4; i >= 0; i -= 1) {
    const y = year - i;
    list.push({ key: String(y), label: `${y}-yil`, start: dayStart(`${y}-01-01`) });
  }
  return list;
}

function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}-${UZ_MONTHS[Number(m) - 1]} ${y}`;
}

function shortDay(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export type { Prisma };
