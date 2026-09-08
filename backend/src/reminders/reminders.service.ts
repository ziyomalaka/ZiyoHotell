import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REMIND_AT_HOUR, daysLeftUntil, needsReminder } from '../common/billing';
import { formatDate, formatMoney, msUntilHour, tashkentClock, todayISO } from '../common/datetime';

type StayForReminder = {
  id: string;
  customerId: string;
  monthlyPrice: number;
  paidUntil: Date | null;
  endDate: Date | null;
  customer: { fullName: string; phone: string };
  room: { number: string; floor: number };
  bed: { number: number };
};

/**
 * To'lov muddati eslatmalari.
 *
 * Har kuni Toshkent vaqti bilan 11:00 da muddati 3 kun (yoki kamroq) qolgan
 * yashovchilar uchun bittadan eslatma yoziladi. (stayId, forDate) unikal
 * bo'lgani uchun generator qayta ishga tushsa ham nusxa chiqmaydi.
 */
@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Reminders');
  private timer?: NodeJS.Timeout;
  private lastRunDate = '';
  private running?: Promise<{ forDate: string; count: number }>;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Keyingi 11:00 ni kutib turadi, ishlagandan keyin yana o'zini qayta rejalashtiradi. */
  private scheduleNext() {
    const wait = msUntilHour(REMIND_AT_HOUR);
    this.timer = setTimeout(() => {
      void this.generate()
        .then((res) => this.log.log(`${res.forDate}: ${res.count} eslatma`))
        .catch((err) => this.log.error(`Eslatma yozilmadi: ${String(err)}`))
        .finally(() => this.scheduleNext());
    }, wait);
    this.timer.unref?.();
  }

  /**
   * Server 11:00 da o'chiq bo'lsa eslatma yo'qolmasligi uchun:
   * ro'yxat so'ralganda soat 11 dan o'tgan va bugun yozilmagan bo'lsa yoziladi.
   */
  private async catchUp() {
    const today = todayISO();
    if (this.lastRunDate === today) return;
    if (tashkentClock().hour < REMIND_AT_HOUR) return;
    await this.generate().catch((err) => this.log.error(`Eslatma yozilmadi: ${String(err)}`));
  }

  /** Muddati yaqinlashgan yashovchilar uchun bugungi eslatmalarni yozadi. */
  async generate(now = new Date()) {
    // Bir vaqtda kelgan bir nechta so'rov bir xil ishni takrorlamasin.
    if (this.running) return this.running;
    this.running = this.build(now).finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async build(now: Date) {
    const forDate = todayISO(now);
    const stays = (await this.prisma.stay.findMany({
      where: { status: 'ACTIVE', occupancy: { isNot: null } },
      select: {
        id: true,
        customerId: true,
        monthlyPrice: true,
        paidUntil: true,
        endDate: true,
        customer: { select: { fullName: true, phone: true } },
        room: { select: { number: true, floor: true } },
        bed: { select: { number: true } },
      },
    })) as StayForReminder[];

    let count = 0;
    for (const stay of stays) {
      const dueDate = stay.paidUntil ?? stay.endDate;
      if (!dueDate) continue;
      const daysLeft = daysLeftUntil(dueDate, now);
      if (daysLeft === null || !needsReminder(daysLeft)) continue;

      const data = {
        dueDate,
        daysLeft,
        message: reminderMessage(stay, daysLeft, dueDate),
      };
      await this.prisma.reminder.upsert({
        where: { stayId_forDate: { stayId: stay.id, forDate } },
        update: data,
        create: { ...data, stayId: stay.id, customerId: stay.customerId, forDate, type: 'PAYMENT_DUE' },
      });
      count += 1;
    }

    this.lastRunDate = forDate;
    return { forDate, count };
  }

  /** Eslatmalar ro'yxati: qo'ng'iroq uchun o'qilmaganlar, tarix uchun hammasi. */
  async list(opts: { onlyUnread?: boolean; take?: number } = {}) {
    if (!this.prisma.reminder) {
      throw new Error('Prisma Reminder client yo‘q. backend papkasida npx prisma generate qiling.');
    }
    await this.catchUp();
    const take = Number.isFinite(opts.take) ? Math.min(200, Math.max(1, Number(opts.take))) : 50;
    const [rows, unread] = await Promise.all([
      this.prisma.reminder.findMany({
        where: opts.onlyUnread ? { readAt: null } : {},
        include: {
          customer: { select: { fullName: true, phone: true } },
          stay: {
            select: {
              id: true,
              monthlyPrice: true,
              room: { select: { number: true, floor: true, gender: true } },
              bed: { select: { number: true } },
            },
          },
        },
        orderBy: [{ forDate: 'desc' }, { daysLeft: 'asc' }],
        take,
      }),
      this.prisma.reminder.count({ where: { readAt: null } }),
    ]);

    return {
      unread,
      rows: rows
        .filter((r) => r.customer && r.stay?.room && r.stay?.bed)
        .map((r) => ({
          id: r.id,
          stayId: r.stayId,
          customerId: r.customerId,
          fullName: r.customer.fullName,
          phone: r.customer.phone,
          floor: r.stay.room.floor,
          room: r.stay.room.number,
          bed: r.stay.bed.number,
          gender: r.stay.room.gender,
          dueDate: r.dueDate,
          daysLeft: r.daysLeft,
          amount: r.stay.monthlyPrice,
          message: r.message,
          forDate: r.forDate,
          readAt: r.readAt,
        })),
    };
  }

  /** Eslatmani o'qilgan deb belgilaydi. */
  async markRead(id: string) {
    await this.prisma.reminder.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  /** Barcha eslatmalarni o'qilgan deb belgilaydi. */
  async markAllRead() {
    const res = await this.prisma.reminder.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
    return { ok: true, count: res.count };
  }
}

/** Eslatma matni: qavat, xona, o'rin, ism-familya va muddat. */
function reminderMessage(stay: StayForReminder, daysLeft: number, dueDate: Date) {
  const place = `${stay.room.floor}-qavat ${stay.room.number}-xona ${stay.bed.number}-o‘rin`;
  const when =
    daysLeft > 0
      ? `${daysLeft} kun qoldi`
      : daysLeft === 0
        ? 'bugun tugaydi'
        : `${Math.abs(daysLeft)} kun kechikdi`;
  return `${place} · ${stay.customer.fullName} — to‘lov muddati ${when} (${formatDate(dueDate)}). Keyingi to‘lov: ${formatMoney(stay.monthlyPrice)}.`;
}
