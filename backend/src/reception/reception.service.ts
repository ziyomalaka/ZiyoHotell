import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, required } from '../common/errors';
import { addDays, dayEnd, dayStart, parseDate, todayISO } from '../common/datetime';
import { genderWord, roomGender } from '../common/gender';
import { cashCardTotals, checkoutDate, DAILY_STAY_PRICE, daysForAmount, paymentPeriod, PaymentMethod, periodInfo, revertPeriod } from '../common/billing';
import { normalizePassportId } from '../common/passport';
import { normalizePhone } from '../common/phone';

export type RegisterInput = {
  fullName: string;
  phone?: string;
  gender?: string;
  birthDate?: string | null;
  passportId: string;
  address?: string | null;
  extraPhone?: string | null;
  notes?: string | null;
  bedId?: string;
  /** bedId berilmasa shu xonadagi bo‘sh o‘rin olinadi. */
  roomId?: string;
  stayType: 'DAILY' | 'MONTHLY';
  startDate: string;
  daysCount?: number;
  paymentMonth?: string;
  amount?: number;
  paidAmount?: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod?: PaymentMethod;
};

const stayInclude = {
  customer: true,
  room: true,
  bed: true,
  createdBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class ReceptionService implements OnModuleInit {
  private readonly logger = new Logger(ReceptionService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.realignRegisterPaidAt();
  }

  /**
   * To‘lov sanalari, yopilgan davr va chiqish kuni kirish sanasidan qayta hisoblanadi.
   * Birinchi to‘lov = kirish kuni. Keyingi to‘lovlar shu davr ustiga yoziladi.
   */
  private async realignRegisterPaidAt() {
    const stays = await this.prisma.stay.findMany({
      select: {
        id: true,
        startDate: true,
        paidDays: true,
        paidUntil: true,
        payments: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, paidAt: true, days: true, coversFrom: true, coversTo: true },
        },
      },
    });
    let paymentsFixed = 0;
    let staysFixed = 0;
    const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && todayISO(a) === todayISO(b);
    for (const stay of stays) {
      const origin = stay.startDate;
      let already = 0;
      for (let i = 0; i < stay.payments.length; i++) {
        const payment = stay.payments[i];
        const from = addDays(origin, already);
        const days = Math.max(0, payment.days || 0);
        const to = days ? addDays(from, days) : from;
        const data: { paidAt?: Date; coversFrom?: Date; coversTo?: Date } = {};
        if (i === 0 && todayISO(payment.paidAt) !== todayISO(origin)) data.paidAt = origin;
        if (days && (!sameDay(payment.coversFrom, from) || !sameDay(payment.coversTo, to))) {
          data.coversFrom = from;
          data.coversTo = to;
        }
        if (Object.keys(data).length) {
          await this.prisma.payment.update({ where: { id: payment.id }, data });
          paymentsFixed += 1;
        }
        already += days;
      }
      const paidUntil = already ? addDays(origin, already) : origin;
      if (stay.paidDays !== already || !sameDay(stay.paidUntil, paidUntil)) {
        await this.prisma.stay.update({
          where: { id: stay.id },
          data: { paidDays: already, paidUntil },
        });
        staysFixed += 1;
      }
    }
    if (paymentsFixed || staysFixed) {
      this.logger.log(`Hisobot kirish kunidan qayta hisoblandi: ${staysFixed} ta yozuv, ${paymentsFixed} ta to‘lov.`);
    }
  }

  private contains(q: string): Prisma.StringFilter {
    return { contains: q, mode: 'insensitive' };
  }

  /** Sektor filtri: `floor` so‘rov parametri endi sektor raqamini bildiradi; noto‘g‘ri bo‘lsa filtr qo‘llanmaydi. */
  private floorFilter(floor?: number | string | null) {
    const level = Number(floor);
    return Number.isInteger(level) && level >= 1 ? level : null;
  }

  /** Sektorlar ro‘yxati (filtrlar uchun): raqam, nom, qavat, jins va xonalar soni. */
  async sectorOptions() {
    const sectors = await this.prisma.sector.findMany({
      orderBy: { number: 'asc' },
      include: { _count: { select: { rooms: true } } },
    });
    return sectors.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      gender: s.gender,
      floor: s.floor,
      status: s.status,
      rooms: s._count.rooms,
    }));
  }

  async floorOptions() {
    const floors = await this.prisma.floor.findMany({
      orderBy: { number: 'asc' },
      include: { _count: { select: { rooms: true } } },
    });
    return floors.map((f) => ({ id: f.id, number: f.number, name: f.name, status: f.status, rooms: f._count.rooms }));
  }

  async findCustomerByPassportOrPhone(passportId?: string, phone?: string) {
    if (passportId) {
      const id = passportId.trim().toUpperCase();
      if (/^[A-Z]{2}\d{7}$/.test(id)) {
        const byPassport = await this.prisma.customer.findUnique({
          where: { passportId: id },
          include: { occupancy: { include: { stay: { include: stayInclude } } } },
        });
        if (byPassport && !byPassport.deletedAt) return byPassport;
      }
    }
    if (phone) {
      return this.prisma.customer.findFirst({
        where: { phone: this.contains(phone.trim()), deletedAt: null },
        include: { occupancy: { include: { stay: { include: stayInclude } } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return null;
  }

  async searchCustomers(q: string) {
    const query = q.trim();
    if (!query) return [];
    return this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [{ fullName: this.contains(query) }, { phone: this.contains(query) }, { passportId: this.contains(query) }],
      },
      include: { occupancy: { include: { stay: { include: { room: true, bed: true } } } } },
      take: 20,
      orderBy: { fullName: 'asc' },
    });
  }

  async registerCustomer(input: RegisterInput, userId: string) {
    required({
      fullName: input.fullName,
      passportId: input.passportId,
      birthDate: input.birthDate,
      bedOrRoom: input.bedId || input.roomId,
      startDate: input.startDate,
      stayType: input.stayType,
    });
    if (!['DAILY', 'MONTHLY'].includes(input.stayType)) throw new AppError('Majburiy maydonlarni to‘ldiring.');
    const amount = Number(input.amount ?? input.paidAmount ?? 0);
    if (Number.isNaN(amount) || amount < 0) {
      throw new AppError('To‘lov summasi noto‘g‘ri.', 400, 'PAYMENT_INVALID');
    }
    const paymentStatus = input.paymentStatus === 'PAID' && amount > 0 ? 'PAID' : 'UNPAID';
    const paidAmount = paymentStatus === 'PAID' ? amount : 0;
    const gender = roomGender(input.gender);
    const phone = normalizePhone(input.phone);
    const passportId = normalizePassportId(input.passportId);

    return this.retrySerializable(() => this.prisma.$transaction(
      async (tx) => {
        const bedId = input.bedId || (await this.pickFreeBed(tx, input.roomId!));
        await tx.$queryRaw`SELECT id FROM "Bed" WHERE id = ${bedId} FOR UPDATE`;
        const bed = await tx.bed.findUnique({
          where: { id: bedId },
          include: { room: true, occupancy: true },
        });
        if (!bed || bed.status !== 'ACTIVE' || bed.room.status !== 'ACTIVE' || bed.occupancy) {
          throw new AppError('Ushbu o‘rin band. Boshqa o‘rin tanlang.', 409, 'BED_ALREADY_OCCUPIED');
        }
        // Aralash xona bo‘lmasligi uchun: mijoz jinsi xona jinsiga mos kelishi shart.
        if (bed.room.gender !== gender) {
          throw new AppError(
            `${bed.room.floor}-qavat ${bed.room.number}-xona ${genderWord(bed.room.gender)} uchun ajratilgan. ${genderWord(gender)} uchun boshqa xona tanlang.`,
            409,
            'ROOM_GENDER_MISMATCH',
          );
        }

        const existing = await tx.customer.findUnique({ where: { passportId } });
        if (existing && !existing.deletedAt) {
          throw new AppError('Bu mijoz kiritilgan.', 409, 'CUSTOMER_ALREADY_EXISTS');
        }
        const details = {
          fullName: input.fullName.trim(),
          phone,
          gender,
          birthDate: input.birthDate ? parseDate(input.birthDate) : null,
          passportId,
          address: input.address?.trim() || null,
          extraPhone: normalizePhone(input.extraPhone) || null,
          notes: input.notes?.trim() || null,
        };
        // O'chirilgan mijoz qaytib kelsa, eski yozuvi tiklanadi: tarixi va to'lovlari bir joyda qoladi.
        const customer = existing
          ? await tx.customer.update({ where: { id: existing.id }, data: { ...details, deletedAt: null } })
          : await tx.customer.create({ data: { ...details, createdById: userId } });

        const startDate = parseDate(input.startDate);
        const paymentMonth = input.stayType === 'MONTHLY' ? input.paymentMonth || input.startDate.slice(0, 7) : null;
        const method = input.paymentMethod === 'BANK_TRANSFER' ? 'BANK' : input.paymentMethod || 'CASH';

        const paidAt = startDate;
        const period =
          paidAmount > 0
            ? paymentPeriod({
                amount: paidAmount,
                monthlyPrice: bed.room.monthlyPrice,
                paidAt,
                startDate,
                type: input.stayType,
              })
            : null;
        const daysCount =
          input.stayType === 'DAILY'
            ? period?.days || Math.max(1, Number(input.daysCount || 1))
            : null;
        const endDate = daysCount ? addDays(startDate, daysCount) : null;

        const stay = await tx.stay.create({
          data: {
            customerId: customer.id,
            roomId: bed.roomId,
            bedId: bed.id,
            type: input.stayType,
            startDate,
            endDate,
            daysCount,
            paymentMonth,
            dailyPrice: input.stayType === 'DAILY' ? DAILY_STAY_PRICE : bed.room.dailyPrice,
            monthlyPrice: bed.room.monthlyPrice,
            totalAmount: amount,
            paidAmount,
            paidUntil: period?.to ?? endDate,
            paidDays: period?.days ?? daysCount ?? 0,
            status: 'ACTIVE',
            createdById: userId,
          },
        });

        await tx.occupancy.create({
          data: { bedId: bed.id, stayId: stay.id, customerId: customer.id },
        });
        await tx.checkLog.create({
          data: {
            stayId: stay.id,
            customerId: customer.id,
            type: 'CHECK_IN',
            at: startDate,
            createdById: userId,
          },
        });
        if (amount > 0) {
          await tx.payment.create({
            data: {
              customerId: customer.id,
              stayId: stay.id,
              type: input.stayType,
              period: input.stayType === 'DAILY' ? input.startDate : paymentMonth || '',
              amount,
              days: period?.days ?? 0,
              coversFrom: period?.from ?? null,
              coversTo: period?.to ?? null,
              method,
              status: paymentStatus,
              paidAt,
              createdById: userId,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            userId,
            action: 'CHECK_IN',
            entity: 'Stay',
            entityId: stay.id,
            meta: JSON.stringify({ customerId: customer.id, bedId: bed.id }),
          },
        });
        const row = await tx.stay.findUniqueOrThrow({ where: { id: stay.id }, include: stayInclude });
        return { ...row, ...periodInfo(row) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ));
  }

  /** Xonadagi eng kichik raqamli bo‘sh o‘rinni qulflab oladi: parallel ro‘yxatlar bir o‘rinni olmaydi. */
  private async pickFreeBed(tx: Prisma.TransactionClient, roomId: string) {
    const [free] = await tx.$queryRaw<{ id: string }[]>`
      SELECT b.id FROM "Bed" b
      LEFT JOIN "Occupancy" o ON o."bedId" = b.id
      WHERE b."roomId" = ${roomId} AND b.status = 'ACTIVE' AND o."bedId" IS NULL
      ORDER BY b.number
      LIMIT 1
      FOR UPDATE OF b SKIP LOCKED`;
    if (!free) throw new AppError('Bu xonada bo‘sh o‘rin qolmadi. Boshqa xona tanlang.', 409, 'ROOM_FULL');
    return free.id;
  }

  /** Serializable tranzaksiya parallel yozuvda P2034 bilan qaytsa, qayta uriniladi. */
  private async retrySerializable<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await run();
      } catch (error) {
        const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!conflict || attempt >= attempts) throw error;
      }
    }
  }

  async checkoutStay(input: { stayId: string; at?: string; note?: string }, userId: string) {
    required({ stayId: input.stayId });
    return this.prisma.$transaction(async (tx) => {
      const stay = await tx.stay.findUnique({
        where: { id: input.stayId },
        include: { occupancy: true, customer: true, room: true, bed: true },
      });
      if (!stay || stay.status !== 'ACTIVE' || !stay.occupancy) {
        throw new AppError('Mijoz hozir yotoqxonada faol emas.');
      }
      const at = input.at ? new Date(input.at) : new Date();
      await tx.checkLog.create({
        data: {
          stayId: stay.id,
          customerId: stay.customerId,
          type: 'CHECK_OUT',
          at,
          note: input.note?.trim() || null,
          createdById: userId,
        },
      });
      await tx.occupancy.delete({ where: { bedId: stay.bedId } });
      const updated = await tx.stay.update({
        where: { id: stay.id },
        data: { status: 'COMPLETED', endDate: at, checkedOutById: userId },
        include: stayInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CHECK_OUT',
          entity: 'Stay',
          entityId: stay.id,
          meta: JSON.stringify({ debt: stay.totalAmount - stay.paidAmount }),
        },
      });
      return updated;
    });
  }

  async addPayment(
    input: {
      stayId: string;
      amount: number;
      method?: PaymentMethod;
      type?: 'DAILY' | 'MONTHLY';
      period?: string;
      note?: string;
      paymentDate?: string;
      idempotencyKey?: string;
    },
    userId: string,
  ) {
    required({ stayId: input.stayId });
    const amount = Number(input.amount);
    if (!amount || amount <= 0) throw new AppError('To‘lov summasi noto‘g‘ri.', 400, 'PAYMENT_INVALID');
    const method = input.method === 'BANK_TRANSFER' ? 'BANK' : input.method || 'CASH';

    if (input.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
      });
      if (existing) return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      // Bir stay'ga parallel to'lovlar navbat bilan yozilsin: aks holda paidAmount/paidDays yo'qoladi.
      await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${input.stayId} FOR UPDATE`;
      if (input.idempotencyKey) {
        const dup = await tx.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (dup) {
          return tx.payment.findUniqueOrThrow({
            where: { id: dup.id },
            include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
          });
        }
      }
      const stay = await tx.stay.findUnique({
        where: { id: input.stayId },
        include: { customer: true, room: true, bed: true },
      });
      if (!stay) throw new AppError('Mijoz topilmadi.');
      const paidAmount = stay.paidAmount + amount;
      const paidAt = parseDate(input.paymentDate || todayISO());

      // Oylik: 25 000/kun. Kunlik: 50 000/kun. Hisob kirish kunidan.
      const type = input.type || stay.type;
      const period = paymentPeriod({
        amount,
        monthlyPrice: stay.monthlyPrice,
        paidAt,
        startDate: stay.startDate,
        currentPaidDays: stay.paidDays || daysForAmount(stay.paidAmount, stay.monthlyPrice, stay.type),
        type,
      });

      const payment = await tx.payment.create({
        data: {
          customerId: stay.customerId,
          stayId: stay.id,
          type,
          period: input.note?.trim() || input.period || stay.paymentMonth || input.paymentDate || '',
          amount,
          days: period.days,
          coversFrom: period.from,
          coversTo: period.to,
          method,
          status: 'PAID',
          paidAt,
          createdById: userId,
          idempotencyKey: input.idempotencyKey,
        },
        include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
      });
      await tx.stay.update({
        where: { id: stay.id },
        data: { paidAmount, paidUntil: period.to, paidDays: stay.paidDays + period.days },
      });
      await tx.auditLog.create({
        data: { userId, action: 'PAYMENT_CREATE', entity: 'Payment', entityId: payment.id, meta: JSON.stringify({ amount }) },
      });
      return payment;
    });
  }

  async cancelPayment(paymentId: string, reason: string, userId: string) {
    required({ paymentId, reason });
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.payment.findUnique({ where: { id: paymentId }, select: { stayId: true } });
      if (!target) throw new AppError('To‘lov topilmadi.');
      // addPayment bilan bir xil qulf: parallel bekor qilish summani ikki marta ayirmasin.
      await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${target.stayId} FOR UPDATE`;
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status === 'CANCELLED') {
        throw new AppError('To‘lov allaqachon bekor qilingan.', 409, 'PAYMENT_ALREADY_CANCELLED');
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason.trim(), cancelledById: userId },
      });
      // UNPAID qator stay hisobiga hech narsa qo'shmagan, shuning uchun faqat PAID qaytariladi.
      if (payment.status === 'PAID') {
        const stay = await tx.stay.findUniqueOrThrow({ where: { id: payment.stayId } });
        // Bekor qilingan to'lov bergan kunlar ham muddatdan qaytarib olinadi.
        await tx.stay.update({ where: { id: stay.id }, data: revertPeriod(stay, payment) });
      }
      await tx.auditLog.create({
        data: { userId, action: 'PAYMENT_CANCEL', entity: 'Payment', entityId: paymentId, meta: JSON.stringify({ reason }) },
      });
      return tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
      });
    });
  }

  async listCustomers(opts: { q?: string; tab?: string; floor?: number; skip: number; page: number; pageSize: number }) {
    const where: Prisma.CustomerWhereInput = { deletedAt: null };
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
    if (opts.tab === 'left') where.occupancy = null;
    const floor = this.floorFilter(opts.floor);
    if (floor) {
      // Yashayotgan mijoz hozirgi xonasi bo‘yicha, chiqib ketgan mijoz oxirgi xonasi bo‘yicha topiladi.
      where.AND = [
        {
          OR: [
            { occupancy: { stay: { room: { sector: { number: floor } } } } },
            { AND: [{ occupancy: null }, { stays: { some: { room: { sector: { number: floor } } } } }] },
          ],
        },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: opts.skip,
        take: opts.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          occupancy: { include: { stay: { include: { room: { include: { sector: true } }, bed: true } } } },
          stays: { include: { room: { include: { sector: true } }, bed: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);
    return {
      total,
      page: opts.page,
      pageSize: opts.pageSize,
      rows: rows.map((c) => {
        const live = c.occupancy?.stay;
        const stay = live || c.stays[0];
        return {
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          passportId: c.passportId,
          birthDate: c.birthDate,
          gender: c.gender,
          living: Boolean(live),
          // Ro'yxatda muddati yaqin (sariq) va o'tgan (qizil) mijozlarni ajratish uchun.
          daysLeft: live ? periodInfo(live).daysLeft : null,
          payStatus: !stay ? 'UNPAID' : stay.paidAmount > 0 ? 'PAID' : 'UNPAID',
          occupancy: stay
            ? {
                stay: {
                  id: stay.id,
                  startDate: stay.startDate,
                  endDate: stay.endDate,
                  paidUntil: stay.paidUntil,
                  paidDays: stay.paidDays,
                  monthlyPrice: stay.monthlyPrice,
                  checkoutDate: checkoutDate(stay),
                  type: stay.type,
                  room: stay.room,
                  bed: stay.bed,
                },
              }
            : null,
        };
      }),
      meta: { page: opts.page, limit: opts.pageSize, total, totalPages: Math.ceil(total / opts.pageSize) || 1 },
    };
  }

  async updateCustomer(
    id: string,
    input: {
      fullName: string;
      phone?: string;
      gender?: string;
      birthDate?: string | null;
      passportId: string;
      address?: string | null;
      extraPhone?: string | null;
      notes?: string | null;
      bedId?: string;
    },
    userId: string,
  ) {
    required({ fullName: input.fullName, passportId: input.passportId });
    const passportId = normalizePassportId(input.passportId);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id },
        include: { occupancy: { include: { stay: { include: { room: true } } } } },
      });
      if (!customer) throw new AppError('Mijoz topilmadi.', 404, 'NOT_FOUND');
      const gender = input.gender === 'FEMALE' ? 'FEMALE' : input.gender === 'MALE' ? 'MALE' : customer.gender;
      if (passportId !== customer.passportId) {
        const taken = await tx.customer.findUnique({ where: { passportId } });
        if (taken) throw new AppError('Bu mijoz kiritilgan.', 409, 'CUSTOMER_ALREADY_EXISTS');
      }

      let stayId = customer.occupancy?.stay.id;
      let newBedId = customer.occupancy?.stay.bedId;
      let newRoomId = customer.occupancy?.stay.roomId;
      if (input.bedId) {
        await tx.$queryRaw`SELECT id FROM "Bed" WHERE id = ${input.bedId} FOR UPDATE`;
        const bed = await tx.bed.findUnique({
          where: { id: input.bedId },
          include: { room: true, occupancy: true },
        });
        if (!bed || bed.status !== 'ACTIVE' || bed.room.status !== 'ACTIVE') {
          throw new AppError('Ushbu o‘rin band. Boshqa o‘rin tanlang.', 409, 'BED_ALREADY_OCCUPIED');
        }
        if (bed.occupancy && bed.occupancy.customerId !== id) {
          throw new AppError('Ushbu o‘rin band. Boshqa o‘rin tanlang.', 409, 'BED_ALREADY_OCCUPIED');
        }
        if (bed.room.gender !== gender) {
          throw new AppError(
            `${bed.room.floor}-qavat ${bed.room.number}-xona ${genderWord(bed.room.gender)} uchun ajratilgan. ${genderWord(gender)} uchun boshqa xona tanlang.`,
            409,
            'ROOM_GENDER_MISMATCH',
          );
        }
        const stay =
          customer.occupancy?.stay ||
          (await tx.stay.findFirst({
            where: { customerId: id },
            orderBy: { createdAt: 'desc' },
          }));
        if (!stay) {
          throw new AppError('Mijozda yashash yozuvi yo‘q. Avval ro‘yxatga oling.', 409, 'NO_STAY');
        }
        if (input.bedId !== stay.bedId) {
          if (customer.occupancy) {
            await tx.occupancy.delete({ where: { customerId: id } });
          }
          await tx.stay.update({
            where: { id: stay.id },
            data: { roomId: bed.roomId, bedId: bed.id },
          });
          if (customer.occupancy || stay.status === 'ACTIVE') {
            await tx.occupancy.create({
              data: { bedId: bed.id, stayId: stay.id, customerId: id },
            });
          }
        }
        stayId = stay.id;
        newBedId = bed.id;
        newRoomId = bed.roomId;
      } else if (customer.occupancy) {
        const room = customer.occupancy.stay.room;
        if (roomGender(room.gender) !== gender) {
          throw new AppError(
            `Yashayotgan xona ${genderWord(room.gender)} uchun. Jinsni o‘zgartirish uchun avval boshqa xonaga o‘tkazing.`,
            409,
            'GENDER_MISMATCH',
          );
        }
      }

      const row = await tx.customer.update({
        where: { id },
        data: {
          fullName: input.fullName.trim(),
          phone: normalizePhone(input.phone),
          gender,
          notes: input.notes?.trim() || null,
          extraPhone: normalizePhone(input.extraPhone) || null,
          address: input.address?.trim() || null,
          passportId,
          birthDate: input.birthDate ? parseDate(input.birthDate) : input.birthDate === null || input.birthDate === '' ? null : customer.birthDate,
        },
        include: { occupancy: { include: { stay: { include: { room: true, bed: true } } } } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CUSTOMER_UPDATE',
          entity: 'Customer',
          entityId: id,
          meta: JSON.stringify({
            fullName: row.fullName,
            phone: row.phone,
            stayId,
            bedId: newBedId,
            roomId: newRoomId,
          }),
        },
      });
      return row;
    });
  }

  async deleteCustomer(id: string, userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include: { occupancy: true } });
    if (!customer || customer.deletedAt) throw new AppError('Mijoz topilmadi.', 404, 'NOT_FOUND');
    if (customer.occupancy) {
      throw new AppError('Mijoz hozir yashayapti. Avval chiqaring.', 409, 'CUSTOMER_ALREADY_ACTIVE');
    }
    // Mijoz ro'yxatdan olib tashlanadi, lekin yashash va to'lov tarixi saqlanadi:
    // to'langan pul qaytarilmaydi, shuning uchun hisobot va tushumdan ayrilmasligi kerak.
    await this.prisma.$transaction(async (tx) => {
      await tx.reminder.deleteMany({ where: { customerId: id } });
      await tx.customer.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({
        data: { userId, action: 'CUSTOMER_DELETE', entity: 'Customer', entityId: id },
      });
    });
    return { id, deleted: true };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { fullName: true } },
        occupancy: { include: { stay: { include: { room: { include: { sector: true } }, bed: true } } } },
        stays: {
          include: { room: { include: { sector: true } }, bed: true, checkLogs: { orderBy: { at: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          include: { createdBy: { select: { fullName: true } }, stay: { include: { room: true, bed: true } } },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!customer) throw new AppError('Mijoz topilmadi.', 404, 'NOT_FOUND');
    const current = customer.occupancy?.stay;
    return {
      ...customer,
      paid: customer.payments.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0),
      // Profil sahifasi uchun: joriy yashashning to'lov muddati va qolgan kunlari.
      current: current ? { ...current, ...periodInfo(current) } : null,
    };
  }

  async roomBeds(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        beds: {
          orderBy: { number: 'asc' },
          include: { occupancy: { include: { customer: true, stay: true } } },
        },
      },
    });
    if (!room) throw new AppError('Xona topilmadi.', 404, 'NOT_FOUND');
    return room;
  }

  async listStays(opts: {
    q?: string;
    tab?: string;
    floor?: number;
    from?: string;
    to?: string;
    skip: number;
    page: number;
    pageSize: number;
  }) {
    const today = todayISO();
    const where: Prisma.StayWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { customer: { fullName: this.contains(q) } },
        { customer: { phone: this.contains(q) } },
        { customer: { passportId: this.contains(q) } },
        { room: { number: this.contains(q) } },
      ];
    }
    const floor = this.floorFilter(opts.floor);
    if (floor) where.room = { sector: { number: floor } };
    if (opts.tab === 'living') where.status = 'ACTIVE';
    if (opts.tab === 'left') where.status = 'COMPLETED';
    if (opts.tab === 'in-today') {
      where.startDate = { gte: dayStart(today), lte: dayEnd(today) };
    }
    if (opts.tab === 'out-today') {
      where.checkLogs = { some: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } };
    }
    if (opts.from || opts.to) {
      where.startDate = {
        ...(opts.from ? { gte: dayStart(opts.from) } : {}),
        ...(opts.to ? { lte: dayEnd(opts.to) } : {}),
      };
    }
    const [total, rows] = await Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        include: { customer: true, room: true, bed: true, checkLogs: { orderBy: { at: 'desc' } } },
        orderBy: { startDate: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
    ]);
    return {
      total,
      page: opts.page,
      pageSize: opts.pageSize,
      rows: rows.map((s) => ({ ...s, ...periodInfo(s) })),
      meta: { page: opts.page, limit: opts.pageSize, total, totalPages: Math.ceil(total / opts.pageSize) || 1 },
    };
  }

  async listPayments(opts: {
    q?: string;
    range?: string;
    type?: string;
    status?: string;
    floor?: number;
    from?: string;
    to?: string;
    skip: number;
    page: number;
    pageSize: number;
  }) {
    const today = todayISO();
    const where: Prisma.PaymentWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { customer: { fullName: this.contains(q) } },
        { customer: { phone: this.contains(q) } },
        { customer: { passportId: this.contains(q) } },
        { stay: { room: { number: this.contains(q) } } },
      ];
    }
    if (opts.type) where.type = opts.type;
    if (opts.status) where.status = opts.status;
    const floor = this.floorFilter(opts.floor);
    if (floor) where.stay = { room: { sector: { number: floor } } };
    const paidAt: { gte?: Date; lte?: Date } = {};
    if (opts.range === 'today') {
      paidAt.gte = dayStart(today);
      paidAt.lte = dayEnd(today);
    } else if (opts.range === 'yesterday') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 1);
      const y = d.toISOString().slice(0, 10);
      paidAt.gte = dayStart(y);
      paidAt.lte = dayEnd(y);
    } else if (opts.range === 'week') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 7);
      paidAt.gte = d;
    } else if (opts.range === 'month') {
      paidAt.gte = dayStart(today.slice(0, 8) + '01');
    }
    if (opts.from) paidAt.gte = dayStart(opts.from);
    if (opts.to) paidAt.lte = dayEnd(opts.to);
    if (Object.keys(paidAt).length) where.paidAt = paidAt;
    const [total, rows, summary] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
        orderBy: { paidAt: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
      this.incomeSummary(),
    ]);
    return {
      total,
      page: opts.page,
      pageSize: opts.pageSize,
      rows,
      todayIncome: summary.todayIncome,
      monthIncome: summary.monthIncome,
      todayCash: summary.todayCash,
      todayCard: summary.todayCard,
      todayTerminal: summary.todayTerminal,
      monthCash: summary.monthCash,
      monthCard: summary.monthCard,
      monthTerminal: summary.monthTerminal,
      meta: { page: opts.page, limit: opts.pageSize, total, totalPages: Math.ceil(total / opts.pageSize) || 1 },
    };
  }

  async incomeSummary() {
    const today = todayISO();
    const monthStart = today.slice(0, 8) + '01';
    const [todayRows, monthRows] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PAID', paidAt: { gte: dayStart(today), lte: dayEnd(today) } },
        select: { amount: true, method: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'PAID', paidAt: { gte: dayStart(monthStart), lte: dayEnd(today) } },
        select: { amount: true, method: true },
      }),
    ]);
    const todaySplit = cashCardTotals(todayRows);
    const monthSplit = cashCardTotals(monthRows);
    return {
      todayIncome: todayRows.reduce((acc, p) => acc + p.amount, 0),
      monthIncome: monthRows.reduce((acc, p) => acc + p.amount, 0),
      todayCash: todaySplit.cash,
      todayCard: todaySplit.card,
      todayTerminal: todaySplit.terminal,
      monthCash: monthSplit.cash,
      monthCard: monthSplit.card,
      monthTerminal: monthSplit.terminal,
    };
  }

  async home() {
    const today = todayISO();
    const rooms = await this.roomsOverview();
    const freeBeds = rooms.reduce((acc, r) => acc + r.free, 0);
    const [inToday, recent, income] = await Promise.all([
      this.prisma.stay.count({ where: { startDate: { gte: dayStart(today), lte: dayEnd(today) } } }),
      this.prisma.stay.findMany({
        where: { status: 'ACTIVE' },
        include: { customer: true, room: true, bed: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.incomeSummary(),
    ]);
    return {
      greeting: this.greeting(),
      date: today,
      freeBeds,
      inToday,
      todayIncome: income.todayIncome,
      todayCash: income.todayCash,
      todayCard: income.todayCard,
      todayTerminal: income.todayTerminal,
      recent: recent.map((s) => ({ ...s, ...periodInfo(s) })),
    };
  }

  private greeting() {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: 'numeric', hour12: false }).format(new Date()),
    );
    if (hour < 12) return 'Xayrli tong';
    if (hour < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  }

  async roomsOverview(floorNumber?: number) {
    const floor = this.floorFilter(floorNumber);
    const rooms = await this.prisma.room.findMany({
      where: { status: 'ACTIVE', ...(floor ? { sector: { number: floor } } : {}) },
      include: {
        level: true,
        sector: true,
        beds: {
          include: {
            occupancy: {
              include: {
                customer: true,
                stay: { include: { payments: { where: { status: 'PAID' }, orderBy: { paidAt: 'desc' }, take: 1, select: { paidAt: true } } } },
              },
            },
          },
          orderBy: { number: 'asc' },
        },
      },
      orderBy: [{ sector: { number: 'asc' } }, { floor: 'asc' }, { number: 'asc' }],
    });
    return rooms.map((room) => {
      const occupied = room.beds.filter((bed) => bed.occupancy).length;
      const repair = room.status !== 'ACTIVE' || room.beds.every((bed) => bed.status !== 'ACTIVE');
      return {
        ...room,
        floor: room.level?.number ?? room.floor,
        // Har bir yashovchi uchun: to'lov muddati, qolgan kun va oxirgi to'lov sanasi (nazoratchi va xonalar sahifasi uchun).
        beds: room.beds.map((bed) => {
          if (!bed.occupancy) return bed;
          const { payments, ...stay } = bed.occupancy.stay;
          return {
            ...bed,
            occupancy: { ...bed.occupancy, stay: { ...stay, ...periodInfo(stay), lastPaidAt: payments[0]?.paidAt ?? null } },
          };
        }),
        occupied,
        free: Math.max(0, room.capacity - occupied),
        kind: repair ? 'inactive' : occupied <= 0 ? 'empty' : occupied >= room.capacity ? 'full' : 'partial',
      };
    });
  }
}
