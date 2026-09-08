import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dayEnd,
  dayStart,
  daysInMonth,
  formatTime,
  isoDay,
  monthStartISO,
  paymentStatusFromAmounts,
  stayDebt,
  todayISO,
} from '../common/datetime';
import { GENDERS, genderLabel, roomGender } from '../common/gender';
import { cashCardTotals } from '../common/billing';
import { ReportsService } from '../reports/reports.service';

const stayInclude = {
  customer: true,
  room: true,
  bed: true,
  createdBy: { select: { id: true, fullName: true } },
} as const;

const paymentInclude = {
  customer: true,
  stay: { include: { room: true, bed: true } },
  createdBy: { select: { fullName: true } },
} as const;

@Injectable()
export class ManagerService {
  constructor(
    private prisma: PrismaService,
    private reports: ReportsService,
  ) {}

  private contains(q: string): Prisma.StringFilter {
    return { contains: q, mode: 'insensitive' };
  }

  /** Qavat filtri: faqat 1 dan katta butun son qabul qilinadi. */
  private level(floor?: number | string | null) {
    const value = Number(floor);
    return Number.isInteger(value) && value >= 1 ? value : null;
  }

  async floorOptions() {
    const floors = await this.prisma.floor.findMany({
      orderBy: { number: 'asc' },
      include: { _count: { select: { rooms: true } } },
    });
    return floors.map((f) => ({ id: f.id, number: f.number, name: f.name, status: f.status, rooms: f._count.rooms }));
  }

  paidAtFromRange(range: string, from?: string | null, to?: string | null) {
    const today = todayISO();
    const paidAt: { gte?: Date; lte?: Date } = {};
    if (range === 'today') {
      paidAt.gte = dayStart(today);
      paidAt.lte = dayEnd(today);
    } else if (range === 'yesterday') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 1);
      const y = d.toISOString().slice(0, 10);
      paidAt.gte = dayStart(y);
      paidAt.lte = dayEnd(y);
    } else if (range === 'week') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 6);
      paidAt.gte = d;
      paidAt.lte = dayEnd(today);
    } else if (range === 'month') {
      paidAt.gte = dayStart(monthStartISO(today));
      paidAt.lte = dayEnd(today);
    } else if (range === 'lastMonth') {
      const [y, m] = today.split('-').map(Number);
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const last = daysInMonth(prevY, prevM);
      paidAt.gte = dayStart(isoDay(prevY, prevM, 1));
      paidAt.lte = dayEnd(isoDay(prevY, prevM, last));
    }
    if (from) paidAt.gte = dayStart(from);
    if (to) paidAt.lte = dayEnd(to);
    return Object.keys(paidAt).length ? paidAt : undefined;
  }

  private incomeWhere(from?: Date, to?: Date) {
    return {
      status: 'PAID' as const,
      ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
  }

  private async incomeSum(from?: Date, to?: Date) {
    const rows = await this.prisma.payment.findMany({
      where: this.incomeWhere(from, to),
      select: { amount: true, method: true },
    });
    const split = cashCardTotals(rows);
    return {
      amount: rows.reduce((acc, p) => acc + p.amount, 0),
      count: rows.length,
      cash: split.cash,
      card: split.card,
    };
  }

  async dashboard() {
    const today = todayISO();
    const monthStart = monthStartISO(today);
    const [y, m] = today.split('-').map(Number);
    const lastDay = daysInMonth(y, m);
    const [
      customers,
      living,
      inToday,
      outToday,
      rooms,
      beds,
      occupied,
      todayInc,
      monthInc,
      stays,
      roomsList,
      recentPays,
      recentChecks,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.occupancy.count(),
      this.prisma.checkLog.count({ where: { type: 'CHECK_IN', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
      this.prisma.checkLog.count({ where: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
      this.prisma.room.count(),
      this.prisma.bed.count(),
      this.prisma.occupancy.count(),
      this.incomeSum(dayStart(today), dayEnd(today)),
      this.incomeSum(dayStart(monthStart), dayEnd(today)),
      this.prisma.stay.findMany({ select: { totalAmount: true, paidAmount: true, customerId: true } }),
      this.prisma.room.findMany({ include: { beds: { include: { occupancy: true } } } }),
      this.prisma.payment.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { customer: true },
        orderBy: { paidAt: 'desc' },
        take: 5,
      }),
      this.prisma.checkLog.findMany({
        include: { customer: true, stay: { include: { room: true, bed: true } } },
        orderBy: { at: 'desc' },
        take: 8,
      }),
    ]);
    const debt = stays.reduce((acc, s) => acc + stayDebt(s.totalAmount, s.paidAmount), 0);
    const debtors = new Set(stays.filter((s) => stayDebt(s.totalAmount, s.paidAmount) > 0).map((s) => s.customerId));
    const payStatus = { paid: 0, partial: 0, unpaid: 0 };
    for (const s of stays) {
      const st = paymentStatusFromAmounts(s.totalAmount, s.paidAmount);
      if (st === 'PAID') payStatus.paid += 1;
      else if (st === 'PARTIAL') payStatus.partial += 1;
      else payStatus.unpaid += 1;
    }
    const occupancy = { full: 0, partial: 0, empty: 0, repair: 0 };
    const byFloor = new Map<number, { floor: number; rooms: number; beds: number; occupied: number }>();
    for (const room of roomsList) {
      if (room.status === 'REPAIR' || room.status === 'INACTIVE') occupancy.repair += 1;
      else {
        const occ = room.beds.filter((b) => b.occupancy).length;
        if (occ <= 0) occupancy.empty += 1;
        else if (occ >= room.capacity) occupancy.full += 1;
        else occupancy.partial += 1;
      }
      const entry = byFloor.get(room.floor) || { floor: room.floor, rooms: 0, beds: 0, occupied: 0 };
      entry.rooms += 1;
      entry.beds += room.beds.filter((b) => b.status === 'ACTIVE').length;
      entry.occupied += room.beds.filter((b) => b.occupancy).length;
      byFloor.set(room.floor, entry);
    }
    const floors = [...byFloor.values()]
      .sort((a, b) => a.floor - b.floor)
      .map((f) => ({
        ...f,
        free: Math.max(0, f.beds - f.occupied),
        percent: f.beds ? Math.round((f.occupied / f.beds) * 100) : 0,
      }));
    const genders = GENDERS.map((gender) => {
      const list = roomsList.filter((r) => roomGender(r.gender) === gender);
      const beds = list.reduce((acc, r) => acc + r.beds.filter((b) => b.status === 'ACTIVE').length, 0);
      const occ = list.reduce((acc, r) => acc + r.beds.filter((b) => b.occupancy).length, 0);
      return {
        gender,
        name: genderLabel(gender),
        rooms: list.length,
        beds,
        occupied: occ,
        free: Math.max(0, beds - occ),
        percent: beds ? Math.round((occ / beds) * 100) : 0,
      };
    });
    const monthChart = [];
    for (let d = 1; d <= lastDay; d++) {
      const day = isoDay(y, m, d);
      if (day > today) break;
      const inc = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: this.incomeWhere(dayStart(day), dayEnd(day)),
      });
      monthChart.push({ day: String(d), value: inc._sum.amount || 0 });
    }
    const topDebtorsRaw = await this.prisma.stay.findMany({ include: { customer: true } });
    const byCustomer = new Map<string, { fullName: string; debt: number }>();
    for (const s of topDebtorsRaw) {
      const d = stayDebt(s.totalAmount, s.paidAmount);
      if (!d) continue;
      const cur = byCustomer.get(s.customerId) || { fullName: s.customer.fullName, debt: 0 };
      cur.debt += d;
      byCustomer.set(s.customerId, cur);
    }
    const topDebtors = [...byCustomer.values()].sort((a, b) => b.debt - a.debt).slice(0, 5);
    const recent = [
      ...recentPays.map((p) => ({
        at: p.paidAt,
        text: `${formatTime(p.paidAt)}  ${p.customer.fullName} — ${p.amount.toLocaleString('uz-UZ')} so‘m to‘lov qilindi`,
      })),
      ...recentChecks.map((c) => ({
        at: c.at,
        text:
          c.type === 'CHECK_IN'
            ? `${formatTime(c.at)}  ${c.customer.fullName} ro‘yxatga olindi`
            : `${formatTime(c.at)}  ${c.customer.fullName} chiqib ketdi`,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);
    return {
      customers,
      living,
      inToday,
      outToday,
      rooms,
      occupied,
      free: beds - occupied,
      todayIncome: todayInc.amount,
      todayCash: todayInc.cash,
      todayCard: todayInc.card,
      monthIncome: monthInc.amount,
      monthCash: monthInc.cash,
      monthCard: monthInc.card,
      debt,
      debtorCount: debtors.size,
      occupancyPercent: beds ? Math.round((occupied / beds) * 100) : 0,
      occupancy,
      floors,
      genders,
      payStatus,
      monthChart,
      topDebtors,
      recent,
    };
  }

  async customers(opts: {
    q?: string;
    tab?: string;
    type?: string;
    pay?: string;
    floor?: number;
    skip: number;
    pageSize: number;
    sort?: string;
    order?: string;
  }) {
    const today = todayISO();
    const where: Prisma.CustomerWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { fullName: this.contains(q) },
        { phone: this.contains(q) },
        { passportId: this.contains(q) },
        { occupancy: { stay: { room: { number: this.contains(q) } } } },
      ];
    }
    if (opts.tab === 'living') where.occupancy = { isNot: null };
    const floor = this.level(opts.floor);
    if (floor) {
      where.AND = [
        {
          OR: [
            { occupancy: { stay: { room: { floor } } } },
            { AND: [{ occupancy: null }, { stays: { some: { room: { floor } } } }] },
          ],
        },
      ];
    }
    const rows = await this.prisma.customer.findMany({
      where,
      include: {
        occupancy: { include: { stay: { include: { room: true, bed: true } } } },
        stays: { orderBy: { startDate: 'desc' }, include: { room: true, bed: true } },
      },
    });
    let mapped = rows.map((c) => {
      const stay = c.occupancy?.stay || c.stays[0] || null;
      const debt = c.stays.reduce((acc, s) => acc + stayDebt(s.totalAmount, s.paidAmount), 0);
      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        gender: c.gender,
        passportId: c.passportId,
        room: stay?.room.number || '—',
        floor: stay?.room.floor ?? null,
        bed: stay?.bed.number ?? '—',
        startDate: stay?.startDate || null,
        type: stay?.type || '',
        payStatus: stay ? paymentStatusFromAmounts(stay.totalAmount, stay.paidAmount) : '—',
        debt,
        status: c.occupancy ? 'ACTIVE' : 'COMPLETED',
      };
    });
    if (opts.tab === 'debt') mapped = mapped.filter((r) => r.debt > 0);
    if (opts.tab === 'arrived') {
      mapped = mapped.filter((r) => r.startDate && todayISO(r.startDate) === today);
    }
    if (opts.pay) mapped = mapped.filter((r) => r.payStatus === opts.pay);
    const total = mapped.length;
    return { total, rows: mapped.slice(opts.skip, opts.skip + opts.pageSize) };
  }

  async customerProfile(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        occupancy: { include: { stay: { include: { room: true, bed: true } } } },
        stays: { include: { room: true, bed: true, checkLogs: true }, orderBy: { createdAt: 'desc' } },
        payments: { include: { createdBy: { select: { fullName: true } } }, orderBy: { paidAt: 'desc' } },
      },
    });
    if (!customer) return null;
    const paid = customer.payments.filter((p) => p.status !== 'CANCELLED').reduce((a, p) => a + p.amount, 0);
    const debt = customer.stays.reduce((acc, s) => acc + stayDebt(s.totalAmount, s.paidAmount), 0);
    return { ...customer, paid, debt };
  }

  async payments(opts: {
    q?: string;
    range?: string;
    from?: string | null;
    to?: string | null;
    type?: string;
    status?: string;
    method?: string;
    floor?: number;
    skip: number;
    pageSize: number;
  }) {
    const where: Prisma.PaymentWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { customer: { fullName: this.contains(q) } },
        { customer: { phone: this.contains(q) } },
        { stay: { room: { number: this.contains(q) } } },
      ];
    }
    if (opts.type) where.type = opts.type;
    if (opts.status) where.status = opts.status;
    if (opts.method) where.method = opts.method;
    const floor = this.level(opts.floor);
    if (floor) where.stay = { room: { floor } };
    const paidAt = this.paidAtFromRange(opts.range || '', opts.from, opts.to);
    if (paidAt) where.paidAt = paidAt;
    const [total, rows, todayInc, monthInc, allInc, stays] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({ where, include: paymentInclude, orderBy: { paidAt: 'desc' }, skip: opts.skip, take: opts.pageSize }),
      this.incomeSum(dayStart(todayISO()), dayEnd(todayISO())),
      this.incomeSum(dayStart(monthStartISO()), dayEnd(todayISO())),
      this.incomeSum(),
      this.prisma.stay.findMany({
        where: floor ? { room: { floor } } : {},
        select: { totalAmount: true, paidAmount: true, customerId: true },
      }),
    ]);
    const paid = new Set<string>();
    const partial = new Set<string>();
    const unpaid = new Set<string>();
    for (const s of stays) {
      const st = paymentStatusFromAmounts(s.totalAmount, s.paidAmount);
      if (st === 'PAID') paid.add(s.customerId);
      else if (st === 'PARTIAL') partial.add(s.customerId);
      else unpaid.add(s.customerId);
    }
    return {
      total,
      rows,
      todayIncome: todayInc.amount,
      todayCash: todayInc.cash,
      todayCard: todayInc.card,
      monthIncome: monthInc.amount,
      monthCash: monthInc.cash,
      monthCard: monthInc.card,
      totalIncome: allInc.amount,
      cash: allInc.cash,
      card: allInc.card,
      debt: stays.reduce((a, s) => a + stayDebt(s.totalAmount, s.paidAmount), 0),
      paid: paid.size,
      partial: partial.size,
      unpaid: unpaid.size,
    };
  }

  async dailyPayments(date = todayISO(), floorNumber?: number) {
    const floor = this.level(floorNumber);
    const floorWhere = floor ? { stay: { room: { floor } } } : {};
    const where = { ...this.incomeWhere(dayStart(date), dayEnd(date)), ...floorWhere };
    const [rows, unpaid] = await Promise.all([
      this.prisma.payment.findMany({ where, include: paymentInclude, orderBy: { paidAt: 'asc' } }),
      this.prisma.payment.count({
        where: { status: 'UNPAID', paidAt: { gte: dayStart(date), lte: dayEnd(date) }, ...floorWhere },
      }),
    ]);
    const sum = (pred: (p: (typeof rows)[number]) => boolean) => rows.filter(pred).reduce((a, p) => a + p.amount, 0);
    return {
      date,
      floor,
      count: rows.length,
      paid: rows.length,
      unpaid,
      total: sum(() => true),
      daily: sum((p) => p.type === 'DAILY'),
      monthly: sum((p) => p.type === 'MONTHLY'),
      cash: sum((p) => p.method === 'CASH'),
      card: sum((p) => p.method === 'CARD'),
      bank: sum((p) => p.method === 'BANK'),
      other: sum((p) => p.method === 'OTHER'),
      rows,
    };
  }

  async monthlyPayments(year: number, month: number, floorNumber?: number) {
    const floor = this.level(floorNumber);
    const floorWhere = floor ? { stay: { room: { floor } } } : {};
    const last = daysInMonth(year, month);
    const from = isoDay(year, month, 1);
    const to = isoDay(year, month, last);
    const today = todayISO();
    const end = to > today ? today : to;
    const rows = await this.prisma.payment.findMany({
      where: { ...this.incomeWhere(dayStart(from), dayEnd(end)), ...floorWhere },
      include: paymentInclude,
      orderBy: { paidAt: 'desc' },
    });
    const chart = [];
    for (let d = 1; d <= last; d++) {
      const day = isoDay(year, month, d);
      if (day > today) break;
      const value = rows.filter((p) => todayISO(p.paidAt) === day).reduce((a, p) => a + p.amount, 0);
      chart.push({ day: String(d), value });
    }
    const stays = await this.prisma.stay.findMany({
      where: {
        ...(floor ? { room: { floor } } : {}),
        OR: [
          { startDate: { gte: dayStart(from), lte: dayEnd(to) } },
          { status: 'ACTIVE' },
          { payments: { some: { paidAt: { gte: dayStart(from), lte: dayEnd(end) }, status: { not: 'CANCELLED' } } } },
        ],
      },
      include: { customer: true, room: true, bed: true, payments: { where: { status: { not: 'CANCELLED' } }, orderBy: { paidAt: 'desc' } } },
    });
    const stayRows = stays.map((s) => ({
      customer: s.customer.fullName,
      room: s.room.number,
      floor: s.room.floor,
      bed: s.bed.number,
      type: s.type,
      month: `${String(month).padStart(2, '0')}.${year}`,
      totalAmount: s.totalAmount,
      paidAmount: s.paidAmount,
      debt: stayDebt(s.totalAmount, s.paidAmount),
      payStatus: paymentStatusFromAmounts(s.totalAmount, s.paidAmount),
      lastPaidAt: s.payments[0]?.paidAt || null,
    }));
    return {
      year,
      month,
      floor,
      total: rows.reduce((a, p) => a + p.amount, 0),
      ...cashCardTotals(rows),
      count: rows.length,
      paid: stayRows.filter((s) => s.payStatus === 'PAID').length,
      partial: stayRows.filter((s) => s.payStatus === 'PARTIAL').length,
      unpaid: stayRows.filter((s) => s.payStatus === 'UNPAID').length,
      debt: stayRows.reduce((a, s) => a + s.debt, 0),
      daily: rows.filter((p) => p.type === 'DAILY').reduce((a, p) => a + p.amount, 0),
      monthly: rows.filter((p) => p.type === 'MONTHLY').reduce((a, p) => a + p.amount, 0),
      chart,
      rows,
      stayRows,
    };
  }

  async debts(opts: { tab?: string; q?: string; type?: string; age?: string; floor?: number; skip: number; pageSize: number }) {
    const today = todayISO();
    const floor = this.level(opts.floor);
    const stays = await this.prisma.stay.findMany({
      where: floor ? { room: { floor } } : {},
      include: { customer: true, room: true, bed: true, payments: { where: { status: { not: 'CANCELLED' } }, orderBy: { paidAt: 'asc' } } },
    });
    let rows = stays
      .map((s) => {
        const debt = stayDebt(s.totalAmount, s.paidAmount);
        const started = todayISO(s.startDate);
        const days = Math.max(
          0,
          Math.round((dayStart(today).getTime() - dayStart(started).getTime()) / 86400000),
        );
        return {
          id: s.id,
          customerId: s.customerId,
          fullName: s.customer.fullName,
          phone: s.customer.phone,
          room: s.room.number,
          floor: s.room.floor,
          bed: s.bed.number,
          type: s.type,
          totalAmount: s.totalAmount,
          paidAmount: s.paidAmount,
          debt,
          started: s.startDate,
          days,
          status: paymentStatusFromAmounts(s.totalAmount, s.paidAmount),
        };
      })
      .filter((r) => r.debt > 0);
    if (opts.tab === 'partial') rows = rows.filter((r) => r.status === 'PARTIAL');
    if (opts.tab === 'unpaid') rows = rows.filter((r) => r.status === 'UNPAID');
    if (opts.tab === 'daily' || opts.type === 'DAILY') rows = rows.filter((r) => r.type === 'DAILY');
    if (opts.tab === 'monthly' || opts.type === 'MONTHLY') rows = rows.filter((r) => r.type === 'MONTHLY');
    if (opts.age === 'today') rows = rows.filter((r) => r.days === 0);
    if (opts.age === '1-7') rows = rows.filter((r) => r.days >= 1 && r.days <= 7);
    if (opts.age === '8-30') rows = rows.filter((r) => r.days >= 8 && r.days <= 30);
    if (opts.age === '30+') rows = rows.filter((r) => r.days > 30);
    const q = opts.q?.trim().toLowerCase() || '';
    if (q) rows = rows.filter((r) => r.fullName.toLowerCase().includes(q) || r.phone.includes(q) || r.room.includes(q));
    const totalDebt = rows.reduce((a, r) => a + r.debt, 0);
    return {
      total: rows.length,
      totalDebt,
      rows: rows.slice(opts.skip, opts.skip + opts.pageSize).map((r, i) => ({ ...r, n: opts.skip + i + 1 })),
    };
  }

  async occupancy(floor?: number) {
    return this.reports.occupancyReport(floor);
  }

  async customersReport(from?: string, to?: string, floor?: number) {
    return this.reports.customersReport(from, to, undefined, undefined, floor);
  }

  async checkHistory(opts: {
    tab?: string;
    q?: string;
    range?: string;
    from?: string | null;
    to?: string | null;
    room?: string;
    floor?: number;
    staffId?: string;
    skip: number;
    pageSize: number;
  }) {
    const today = todayISO();
    const where: Prisma.StayWhereInput = {};
    if (opts.tab === 'living') where.status = 'ACTIVE';
    if (opts.tab === 'in') {
      where.checkLogs = { some: { type: 'CHECK_IN', at: { gte: dayStart(today), lte: dayEnd(today) } } };
    }
    if (opts.tab === 'out') {
      where.checkLogs = { some: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } };
    }
    const paidAt = this.paidAtFromRange(opts.range || '', opts.from, opts.to);
    if (paidAt) where.startDate = paidAt;
    const q = opts.q?.trim() || '';
    if (q) {
      where.customer = {
        OR: [{ fullName: this.contains(q) }, { phone: this.contains(q) }, { passportId: this.contains(q) }],
      };
    }
    const floor = this.level(opts.floor);
    if (opts.room || floor) {
      where.room = {
        ...(opts.room ? { number: this.contains(opts.room) } : {}),
        ...(floor ? { floor } : {}),
      };
    }
    if (opts.staffId) where.createdById = opts.staffId;
    const [total, rows, inToday, outToday, living] = await Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        include: { ...stayInclude, checkLogs: { orderBy: { at: 'asc' } } },
        orderBy: { startDate: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
      this.prisma.checkLog.count({ where: { type: 'CHECK_IN', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
      this.prisma.checkLog.count({ where: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
      this.prisma.occupancy.count(),
    ]);
    return {
      total,
      stats: { inToday, outToday, living },
      rows: rows.map((s) => {
        const cin = s.checkLogs.find((l) => l.type === 'CHECK_IN');
        const cout = s.checkLogs.find((l) => l.type === 'CHECK_OUT');
        return {
          id: s.id,
          fullName: s.customer.fullName,
          room: s.room.number,
          floor: s.room.floor,
          bed: s.bed.number,
          inAt: cin?.at || s.startDate,
          outAt: cout?.at || s.endDate,
          status: s.status,
          reception: s.createdBy.fullName,
        };
      }),
    };
  }
}
