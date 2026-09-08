import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, required } from '../common/errors';
import { AuthService } from '../auth/auth.service';
import { dayEnd, dayStart, todayISO } from '../common/datetime';
import { genderWord, roomGender } from '../common/gender';
import { checkoutDate, DEFAULT_DAILY_PRICE, DEFAULT_MONTHLY_PRICE } from '../common/billing';
import { DEFAULT_ROLE_PERMISSIONS, normalizeRole } from '../common/roles';

const execFileAsync = promisify(execFile);

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  /** Qavat filtri: faqat 1 dan katta butun son qabul qilinadi. */
  private level(floor?: number | string | null) {
    const value = Number(floor);
    return Number.isInteger(value) && value >= 1 ? value : null;
  }

  private async audit(opts: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    section?: string;
    ip?: string;
    oldValue?: unknown;
    newValue?: unknown;
    meta?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        section: opts.section,
        ip: opts.ip,
        oldValue: opts.oldValue !== undefined ? JSON.stringify(opts.oldValue) : null,
        newValue: opts.newValue !== undefined ? JSON.stringify(opts.newValue) : null,
        meta: opts.meta ? JSON.stringify(opts.meta) : null,
      },
    });
  }

  async dashboard() {
    const today = todayISO();
    const monthStart = today.slice(0, 8) + '01';
    const [rooms, beds, occupied, activeStays, completedStays, staff, inToday, outToday, payToday, payMonth, stays] =
      await Promise.all([
        this.prisma.room.count(),
        this.prisma.bed.count(),
        this.prisma.occupancy.count(),
        this.prisma.stay.count({ where: { status: 'ACTIVE' } }),
        this.prisma.stay.count({ where: { status: 'COMPLETED' } }),
        this.prisma.user.count(),
        this.prisma.checkLog.count({ where: { type: 'CHECK_IN', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
        this.prisma.checkLog.count({ where: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: { not: 'CANCELLED' }, paidAt: { gte: dayStart(today), lte: dayEnd(today) } },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: { not: 'CANCELLED' }, paidAt: { gte: dayStart(monthStart) } },
        }),
        this.prisma.stay.findMany({ select: { totalAmount: true, paidAmount: true } }),
      ]);
    const debt = stays.reduce((acc, s) => acc + Math.max(0, s.totalAmount - s.paidAmount), 0);
    const recent = await this.prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const dailyIncome = [];
    const checkFlow = [];
    for (const day of last7) {
      const [inc, cin, cout] = await Promise.all([
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: { not: 'CANCELLED' }, paidAt: { gte: dayStart(day), lte: dayEnd(day) } },
        }),
        this.prisma.checkLog.count({ where: { type: 'CHECK_IN', at: { gte: dayStart(day), lte: dayEnd(day) } } }),
        this.prisma.checkLog.count({ where: { type: 'CHECK_OUT', at: { gte: dayStart(day), lte: dayEnd(day) } } }),
      ]);
      dailyIncome.push({ day: day.slice(8), value: inc._sum.amount || 0 });
      checkFlow.push({ day: day.slice(8), in: cin, out: cout });
    }
    const payGroups = await this.prisma.payment.groupBy({
      by: ['status'],
      _sum: { amount: true },
      where: { status: { not: 'CANCELLED' } },
    });
    return {
      rooms,
      beds,
      occupied,
      free: beds - occupied,
      activeStays,
      completedStays,
      staff,
      inToday,
      outToday,
      todayIncome: payToday._sum.amount || 0,
      monthIncome: payMonth._sum.amount || 0,
      debt,
      occupancyPercent: beds ? Math.round((occupied / beds) * 100) : 0,
      dailyIncome,
      checkFlow,
      payStatus: payGroups.map((g) => ({ status: g.status, value: g._sum.amount || 0 })),
      recent,
    };
  }

  async saveFloor(input: { id?: string; number: number; name: string; notes?: string; status?: string }, userId: string, ip?: string) {
    required({ number: input.number, name: input.name });
    if (input.id) {
      const old = await this.prisma.floor.findUnique({ where: { id: input.id } });
      const row = await this.prisma.floor.update({
        where: { id: input.id },
        data: { number: Number(input.number), name: input.name, notes: input.notes || null, status: input.status || 'ACTIVE' },
      });
      await this.audit({ userId, action: 'ROOM_UPDATE', entity: 'Floor', entityId: row.id, section: 'Xonalar', ip, oldValue: old, newValue: row });
      return row;
    }
    const row = await this.prisma.floor.create({
      data: { number: Number(input.number), name: input.name, notes: input.notes || null, status: input.status || 'ACTIVE' },
    });
    await this.audit({ userId, action: 'ROOM_CREATE', entity: 'Floor', entityId: row.id, section: 'Xonalar', ip, newValue: row });
    return row;
  }

  async saveRoom(
    input: {
      id?: string;
      floorId?: string;
      floorNumber?: number;
      number: string;
      roomType?: string;
      gender?: string;
      capacity: number;
      dailyPrice?: number;
      monthlyPrice?: number;
      status?: string;
      notes?: string;
    },
    userId: string,
    ip?: string,
  ) {
    required({ number: input.number, capacity: input.capacity });
    let floor = input.floorId ? await this.prisma.floor.findUnique({ where: { id: input.floorId } }) : null;
    if (!floor && input.floorNumber != null) {
      const level = Number(input.floorNumber);
      if (!Number.isInteger(level) || level < 1) throw new AppError('Qavat raqami 1 dan kichik bo‘lmasin.');
      floor = await this.prisma.floor.upsert({
        where: { number: level },
        update: {},
        create: { number: level, name: `${level}-qavat`, status: 'ACTIVE' },
      });
    }
    if (!floor) {
      floor = await this.prisma.floor.findFirst({ orderBy: { number: 'asc' } });
    }
    if (!floor) {
      floor = await this.prisma.floor.create({ data: { number: 1, name: '1-qavat' } });
    }
    const old = input.id ? await this.prisma.room.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !old) throw new AppError('Xona topilmadi.', 404);
    const gender = roomGender(input.gender, old?.gender);
    // Qizlar va bollar bloklari alohida raqamlanadi: yakkalik qavat + jins ichida tekshiriladi.
    const dup = await this.prisma.room.findFirst({
      where: {
        floorId: floor.id,
        gender,
        number: String(input.number).trim(),
        NOT: input.id ? { id: input.id } : undefined,
      },
    });
    if (dup) {
      throw new AppError(
        `${floor.number}-qavatda ${genderWord(gender)} uchun ${dup.number} xonasi allaqachon mavjud.`,
      );
    }
    if (old) {
      if (input.status && input.status !== 'ACTIVE' && (await this.prisma.occupancy.count({ where: { bed: { roomId: old.id } } })) > 0) {
        throw new AppError('Ushbu xonada faol mijozlar mavjud.', 409, 'ROOM_HAS_ACTIVE_STAYS');
      }
      // Xonada boshqa jinsdagi mijoz yashab turgan bo‘lsa, jinsni almashtirishga yo‘l qo‘yilmaydi.
      if (gender !== old.gender) {
        const conflicting = await this.prisma.occupancy.count({
          where: { bed: { roomId: old.id }, customer: { gender: { not: gender } } },
        });
        if (conflicting > 0) {
          throw new AppError(
            `Xonada ${genderWord(old.gender)} yashamoqda, shuning uchun jinsni o‘zgartirib bo‘lmaydi.`,
            409,
            'ROOM_GENDER_CONFLICT',
          );
        }
      }
      const row = await this.prisma.room.update({
        where: { id: old.id },
        data: {
          floorId: floor.id,
          floor: floor.number,
          number: String(input.number).trim(),
          roomType: input.roomType || 'ODDIY',
          gender,
          capacity: Number(input.capacity),
          dailyPrice: input.dailyPrice != null ? Number(input.dailyPrice) : old.dailyPrice,
          monthlyPrice: input.monthlyPrice != null ? Number(input.monthlyPrice) : old.monthlyPrice,
          status: input.status || old.status,
          notes: input.notes ?? old.notes,
        },
      });
      await this.audit({
        userId,
        action: 'ROOM_UPDATE',
        entity: 'Room',
        entityId: row.id,
        ip,
        oldValue: { dailyPrice: old.dailyPrice, monthlyPrice: old.monthlyPrice, gender: old.gender },
        newValue: { dailyPrice: row.dailyPrice, monthlyPrice: row.monthlyPrice, gender: row.gender },
      });
      return row;
    }
    const capacity = Number(input.capacity);
    const row = await this.prisma.room.create({
      data: {
        floorId: floor.id,
        floor: floor.number,
        number: String(input.number).trim(),
        roomType: input.roomType || 'ODDIY',
        gender,
        capacity,
        dailyPrice: input.dailyPrice != null ? Number(input.dailyPrice) : DEFAULT_DAILY_PRICE,
        monthlyPrice: input.monthlyPrice != null ? Number(input.monthlyPrice) : DEFAULT_MONTHLY_PRICE,
        status: input.status || 'ACTIVE',
        notes: input.notes || null,
        beds: { create: Array.from({ length: capacity }, (_, i) => ({ number: i + 1, status: 'ACTIVE' })) },
      },
      include: { beds: true, level: true },
    });
    await this.audit({
      userId,
      action: 'ROOM_CREATE',
      entity: 'Room',
      entityId: row.id,
      ip,
      newValue: { number: row.number, floor: row.floor, gender: row.gender },
    });
    return row;
  }

  async saveBed(input: { id?: string; roomId: string; number: number; status?: string }, userId: string, ip?: string) {
    required({ roomId: input.roomId, number: input.number });
    if (input.id) {
      const old = await this.prisma.bed.findUnique({ where: { id: input.id }, include: { occupancy: true } });
      if (!old) throw new AppError('O‘rin topilmadi.', 404);
      if (old.occupancy && input.status && input.status !== 'ACTIVE') {
        throw new AppError('Band o‘rinni o‘chirib bo‘lmaydi.');
      }
      const row = await this.prisma.bed.update({
        where: { id: input.id },
        data: { number: Number(input.number), status: input.status || old.status },
      });
      await this.audit({ userId, action: 'BED_CREATE', entity: 'Bed', entityId: row.id, ip });
      return row;
    }
    const row = await this.prisma.bed.create({
      data: { roomId: input.roomId, number: Number(input.number), status: input.status || 'ACTIVE' },
    });
    await this.prisma.room.update({ where: { id: input.roomId }, data: { capacity: { increment: 1 } } });
    await this.audit({ userId, action: 'BED_CREATE', entity: 'Bed', entityId: row.id, ip });
    return row;
  }

  async deactivateBed(id: string, userId: string, ip?: string) {
    const bed = await this.prisma.bed.findUnique({ where: { id }, include: { occupancy: true, stays: { take: 1 } } });
    if (!bed) throw new AppError('O‘rin topilmadi.', 404);
    if (bed.occupancy) throw new AppError('Band o‘rinni o‘chirib bo‘lmaydi.');
    if (bed.stays.length === 0) {
      await this.prisma.bed.delete({ where: { id } });
      await this.prisma.room.update({
        where: { id: bed.roomId },
        data: { capacity: { decrement: 1 } },
      });
      await this.audit({ userId, action: 'BED_DELETE', entity: 'Bed', entityId: id, ip });
      return { id, deleted: true };
    }
    const row = await this.prisma.bed.update({ where: { id }, data: { status: 'INACTIVE' } });
    await this.audit({ userId, action: 'BED_DELETE', entity: 'Bed', entityId: id, ip });
    return row;
  }

  async deleteRoom(id: string, userId: string, ip?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { beds: { include: { occupancy: true } } },
    });
    if (!room) throw new AppError('Xona topilmadi.', 404);
    if (room.beds.some((bed) => bed.occupancy)) {
      throw new AppError('Xonada mijoz yashayapti. Avval chiqaring.', 409, 'ROOM_HAS_ACTIVE_STAYS');
    }
    const stayIds = (await this.prisma.stay.findMany({ where: { roomId: id }, select: { id: true } })).map((s) => s.id);
    await this.prisma.$transaction(async (tx) => {
      if (stayIds.length) {
        await tx.payment.deleteMany({ where: { stayId: { in: stayIds } } });
        await tx.checkLog.deleteMany({ where: { stayId: { in: stayIds } } });
        await tx.stay.deleteMany({ where: { roomId: id } });
      }
      await tx.bed.deleteMany({ where: { roomId: id } });
      await tx.room.delete({ where: { id } });
      await tx.auditLog.create({
        data: { userId, action: 'ROOM_DELETE', entity: 'Room', entityId: id, ip: ip || null },
      });
    });
    return { id, deleted: true };
  }

  async saveStaff(
    input: {
      id?: string;
      fullName: string;
      login: string;
      phone?: string;
      password?: string;
      role: string;
      workStatus?: string;
      notes?: string;
    },
    userId: string,
    ip?: string,
  ) {
    required({ fullName: input.fullName, login: input.login, role: input.role });
    const login = input.login.trim();
    const role = normalizeRole(input.role);
    const workStatus = input.workStatus || 'ACTIVE';
    const isActive = workStatus === 'ACTIVE';
    const password = input.password?.trim() || '';
    if (input.id) {
      const existing = await this.prisma.user.findUnique({ where: { id: input.id } });
      if (!existing) throw new AppError('Xodim topilmadi.', 404, 'STAFF_NOT_FOUND');
      if (normalizeRole(existing.role) === 'SYSTEM_ADMIN' && role !== 'SYSTEM_ADMIN') {
        const otherAdmins = await this.prisma.user.count({
          where: { role: 'SYSTEM_ADMIN', isActive: true, id: { not: input.id } },
        });
        if (otherAdmins < 1) {
          throw new AppError('Oxirgi dasturiy adminning rolini o‘zgartirib bo‘lmaydi.', 400, 'LAST_ADMIN');
        }
      }
      try {
        const row = await this.prisma.user.update({
          where: { id: input.id },
          data: {
            fullName: input.fullName.trim(),
            login,
            phone: input.phone || null,
            role,
            workStatus,
            isActive,
            notes: input.notes || null,
            ...(password
              ? { passwordHash: await this.auth.hashPassword(password), mustChangePassword: false }
              : {}),
          },
        });
        if (password) {
          await this.prisma.refreshToken.deleteMany({ where: { userId: row.id } });
        }
        await this.audit({
          userId,
          action: 'STAFF_UPDATE',
          entity: 'User',
          entityId: row.id,
          ip,
          oldValue: { login: existing.login, role: existing.role },
          newValue: { login, role },
        });
        const { passwordHash: _, ...safe } = row;
        return safe;
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          throw new AppError('Ushbu login band.');
        }
        throw error;
      }
    }
    required({ password });
    try {
      const row = await this.prisma.user.create({
        data: {
          fullName: input.fullName.trim(),
          login,
          phone: input.phone || null,
          passwordHash: await this.auth.hashPassword(password),
          role,
          workStatus,
          isActive,
          notes: input.notes || null,
          mustChangePassword: false,
        },
      });
      await this.audit({ userId, action: 'STAFF_CREATE', entity: 'User', entityId: row.id, ip, newValue: { login, role } });
      const { passwordHash: _, ...safe } = row;
      return safe;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        throw new AppError('Ushbu login band.');
      }
      throw error;
    }
  }

  async blockStaff(id: string, userId: string, ip?: string, unblock = false) {
    const row = await this.prisma.user.update({
      where: { id },
      data: unblock ? { workStatus: 'ACTIVE', isActive: true } : { workStatus: 'BLOCKED', isActive: false },
    });
    await this.audit({ userId, action: 'STAFF_BLOCK', entity: 'User', entityId: id, ip });
    return row;
  }

  async deleteStaff(id: string, actorId: string, ip?: string) {
    if (id === actorId) throw new AppError('O‘zingizni o‘chirib bo‘lmaydi.', 400, 'STAFF_SELF_DELETE');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Xodim topilmadi.', 404, 'STAFF_NOT_FOUND');
    if (normalizeRole(user.role) === 'SYSTEM_ADMIN') {
      const otherAdmins = await this.prisma.user.count({
        where: { role: 'SYSTEM_ADMIN', isActive: true, id: { not: id } },
      });
      if (otherAdmins < 1) {
        throw new AppError('Oxirgi dasturiy adminni o‘chirib bo‘lmaydi.', 400, 'LAST_ADMIN');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.updateMany({ where: { createdById: id }, data: { createdById: actorId } });
      await tx.stay.updateMany({ where: { createdById: id }, data: { createdById: actorId } });
      await tx.stay.updateMany({ where: { checkedOutById: id }, data: { checkedOutById: actorId } });
      await tx.payment.updateMany({ where: { createdById: id }, data: { createdById: actorId } });
      await tx.payment.updateMany({ where: { cancelledById: id }, data: { cancelledById: actorId } });
      await tx.checkLog.updateMany({ where: { createdById: id }, data: { createdById: actorId } });
      await tx.backup.updateMany({ where: { createdById: id }, data: { createdById: actorId } });
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: actorId } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    await this.audit({
      userId: actorId,
      action: 'STAFF_DELETE',
      entity: 'User',
      entityId: id,
      ip,
      oldValue: { login: user.login, fullName: user.fullName, role: user.role },
    });
    return { deleted: true, id };
  }

  async resetStaffPassword(id: string, userId: string, ip?: string) {
    const temp = `Tmp${Math.random().toString(36).slice(2, 8)}!`;
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await this.auth.hashPassword(temp), mustChangePassword: true },
    });
    await this.audit({ userId, action: 'STAFF_BLOCK', entity: 'User', entityId: id, ip, meta: { reset: true } });
    return { tempPassword: temp };
  }

  async getSettingsMap() {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async saveSettings(values: Record<string, string>, userId: string, ip?: string) {
    const old = await this.getSettingsMap();
    for (const [key, value] of Object.entries(values)) {
      await this.prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
    await this.audit({ userId, action: 'SETTING_CHANGE', entity: 'Setting', ip, oldValue: old, newValue: values });
    return this.getSettingsMap();
  }

  async saveRolePermissions(idOrCode: string, permissions: string[], userId: string, ip?: string) {
    const old = await this.prisma.role.findFirst({ where: { OR: [{ id: idOrCode }, { code: idOrCode }] } });
    if (!old) throw new AppError('Rol topilmadi.', 404);
    const row = await this.prisma.role.update({
      where: { id: old.id },
      data: { permissions: JSON.stringify(permissions) },
    });
    await this.audit({ userId, action: 'ROLE_CHANGE', entity: 'Role', entityId: row.id, ip, newValue: permissions });
    return row;
  }

  async health() {
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    const lastBackup = await this.prisma.backup.findFirst({ orderBy: { createdAt: 'desc' } });
    const ramUsed = 1 - os.freemem() / os.totalmem();
    return {
      backend: { status: 'ok', label: 'Normal' },
      database: { status: db ? 'ok' : 'error', label: db ? 'Normal' : 'Muammo' },
      ram: { status: ramUsed > 0.9 ? 'error' : ramUsed > 0.75 ? 'warn' : 'ok', usedPercent: Math.round(ramUsed * 100) },
      uptime: process.uptime(),
      lastBackup: lastBackup ? { at: lastBackup.createdAt, status: lastBackup.status } : null,
    };
  }

  async createBackup(userId: string) {
    const dir = path.resolve(process.env.BACKUP_DIR || './storage/backups');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const dest = path.join(dir, fileName);
    const url = process.env.DATABASE_URL || '';
    try {
      await execFileAsync('pg_dump', [url, '-f', dest], { timeout: 120000 });
      const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
      const row = await this.prisma.backup.create({
        data: { path: dest, fileName, size, status: 'SUCCESS', type: 'MANUAL', createdById: userId },
      });
      await this.audit({ userId, action: 'BACKUP_CREATE', entity: 'Backup', entityId: row.id, newValue: { fileName } });
      return row;
    } catch {
      const row = await this.prisma.backup.create({
        data: { path: dest, fileName, size: 0, status: 'FAILED', type: 'MANUAL', createdById: userId },
      });
      throw new AppError(
        'Backup yaratilmadi. Productionda pg_dump CLI orqali backup oling. Yozuv: ' + row.id,
      );
    }
  }

  restoreRunbook() {
    return {
      warning: 'Restore xavfli amal. HTTP orqali avtomatik pg_restore ishga tushirilmaydi.',
      steps: [
        '1. Maintenance window belgilang va tizimga yozuvlarni to‘xtating.',
        '2. Joriy bazadan yangi backup oling.',
        '3. pg_restore -d $DATABASE_URL storage/backups/<file>.sql ni serverda ishga tushiring.',
        '4. prisma migrate deploy ni tekshiring.',
        '5. Audit logda RESTORE yozuvini qo‘lda qayd qiling.',
      ],
    };
  }

  async confirmRestore(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.auth.verifyPassword(password, user.passwordHash))) {
      throw new AppError('Login yoki parol noto‘g‘ri.', 400, 'INVALID_CREDENTIALS');
    }
    await this.audit({ userId, action: 'RESTORE', entity: 'Backup', meta: { requested: true } });
    return this.restoreRunbook();
  }

  async listFloors() {
    return this.prisma.floor.findMany({ orderBy: { number: 'asc' }, include: { _count: { select: { rooms: true } } } });
  }

  async listRooms(floorNumber?: number) {
    const floor = this.level(floorNumber);
    const rooms = await this.prisma.room.findMany({
      where: floor ? { floor } : {},
      include: { level: true, beds: { include: { occupancy: { include: { customer: true } } }, orderBy: { number: 'asc' } } },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
    return rooms.map((room) => ({
      ...room,
      // Barcha javoblarda `floor` — qavat raqami (son), qavat nomi `level.name` ichida.
      floor: room.level?.number ?? room.floor,
      occupied: room.beds.filter((b) => b.occupancy).length,
    }));
  }

  async listBeds() {
    return this.prisma.bed.findMany({
      include: { room: { include: { level: true } }, occupancy: true },
      orderBy: [{ room: { floor: 'asc' } }, { room: { number: 'asc' } }, { number: 'asc' }],
    });
  }

  async listStaff(opts: { q?: string; skip: number; page: number; pageSize: number }) {
    const q = opts.q?.trim() || '';
    const where: Prisma.UserWhereInput = q
      ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { login: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }] }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: opts.skip,
        take: opts.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          login: true,
          phone: true,
          role: true,
          workStatus: true,
          isActive: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);
    return { total, page: opts.page, pageSize: opts.pageSize, rows };
  }

  async listCustomers(opts: {
    q?: string;
    tab?: string;
    type?: string;
    pay?: string;
    floor?: number;
    skip: number;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.CustomerWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { passportId: { contains: q, mode: 'insensitive' } },
        { occupancy: { stay: { room: { number: { contains: q, mode: 'insensitive' } } } } },
      ];
    }
    if (opts.tab === 'living') where.occupancy = { isNot: null };
    if (opts.tab === 'left') where.occupancy = null;
    if (opts.tab === 'blocked') where.blocked = true;
    if (opts.type) where.stays = { some: { type: opts.type, status: 'ACTIVE' } };
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
    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: opts.skip,
        take: opts.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { fullName: true } },
          occupancy: { include: { stay: { include: { room: true, bed: true } } } },
          stays: { include: { room: true, bed: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);
    const mapped = rows
      .map((c) => {
        const live = c.occupancy?.stay;
        const stay = live || c.stays[0];
        const occupancy = stay
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
          : null;
        const payStatus = !stay ? 'UNPAID' : stay.paidAmount > 0 ? 'PAID' : 'UNPAID';
        return { ...c, living: Boolean(live), occupancy, payStatus };
      })
      .filter((c) => {
        if (!opts.pay) return true;
        if (opts.pay === 'UNPAID') return c.payStatus !== 'PAID';
        return c.payStatus === opts.pay;
      });
    return { total, page: opts.page, pageSize: opts.pageSize, rows: mapped };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        occupancy: { include: { stay: { include: { room: true, bed: true } } } },
        stays: { include: { room: true, bed: true, payments: true }, orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!customer) throw new AppError('Mijoz topilmadi.', 404, 'NOT_FOUND');
    return customer;
  }

  async listStays(opts: {
    q?: string;
    tab?: string;
    staffId?: string;
    floor?: number;
    skip: number;
    page: number;
    pageSize: number;
  }) {
    const today = todayISO();
    const where: Prisma.StayWhereInput = {};
    const q = opts.q?.trim() || '';
    if (q) {
      where.OR = [
        { customer: { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }] } },
        { room: { number: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (opts.tab === 'living') where.status = 'ACTIVE';
    if (opts.tab === 'left') where.status = 'COMPLETED';
    if (opts.tab === 'in-today') {
      where.checkLogs = { some: { type: 'CHECK_IN', at: { gte: dayStart(today), lte: dayEnd(today) } } };
    }
    if (opts.tab === 'out-today') {
      where.checkLogs = { some: { type: 'CHECK_OUT', at: { gte: dayStart(today), lte: dayEnd(today) } } };
    }
    if (opts.staffId) where.createdById = opts.staffId;
    const stayFloor = this.level(opts.floor);
    if (stayFloor) where.room = { floor: stayFloor };
    const [total, rows] = await Promise.all([
      this.prisma.stay.count({ where }),
      this.prisma.stay.findMany({
        where,
        include: { customer: true, room: true, bed: true, createdBy: { select: { fullName: true } }, checkLogs: true },
        orderBy: { startDate: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
    ]);
    return { total, page: opts.page, pageSize: opts.pageSize, rows };
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
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { stay: { room: { number: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    if (opts.type) where.type = opts.type;
    if (opts.status) where.status = opts.status;
    const payFloor = this.level(opts.floor);
    if (payFloor) where.stay = { room: { floor: payFloor } };
    const paidAt: { gte?: Date; lte?: Date } = {};
    if (opts.range === 'today') {
      paidAt.gte = dayStart(today);
      paidAt.lte = dayEnd(today);
    } else if (opts.range === 'month') {
      paidAt.gte = dayStart(today.slice(0, 8) + '01');
    } else if (opts.range === 'week') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 7);
      paidAt.gte = d;
    } else if (opts.range === 'yesterday') {
      const d = new Date(dayStart(today));
      d.setUTCDate(d.getUTCDate() - 1);
      const y = d.toISOString().slice(0, 10);
      paidAt.gte = dayStart(y);
      paidAt.lte = dayEnd(y);
    }
    if (opts.from) paidAt.gte = dayStart(opts.from);
    if (opts.to) paidAt.lte = dayEnd(opts.to);
    if (Object.keys(paidAt).length) where.paidAt = paidAt;
    const [total, rows, stays] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: { select: { fullName: true } } },
        orderBy: { paidAt: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
      this.prisma.stay.findMany({ select: { totalAmount: true, paidAmount: true } }),
    ]);
    return {
      total,
      page: opts.page,
      pageSize: opts.pageSize,
      rows,
      debt: stays.reduce((a, s) => a + Math.max(0, s.totalAmount - s.paidAmount), 0),
    };
  }

  async listAudit(opts: { q?: string; skip: number; page: number; pageSize: number }) {
    const q = opts.q?.trim() || '';
    const where: Prisma.AuditLogWhereInput = q
      ? {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { entity: { contains: q, mode: 'insensitive' } },
            { user: { fullName: { contains: q, mode: 'insensitive' } } },
            { user: { login: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, login: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
    ]);
    return { total, page: opts.page, pageSize: opts.pageSize, rows };
  }

  async listBackups() {
    return this.prisma.backup.findMany({
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { code: 'asc' } });
  }

  async listStaffSimple() {
    return this.prisma.user.findMany({
      select: { fullName: true, login: true, role: true, workStatus: true, phone: true },
    });
  }

  async debtReport(floorNumber?: number) {
    const floor = this.level(floorNumber);
    const stays = await this.prisma.stay.findMany({
      where: floor ? { room: { floor } } : {},
      include: { customer: true, room: true, bed: true },
      orderBy: [{ room: { floor: 'asc' } }, { room: { number: 'asc' } }],
    });
    const rows = stays
      .map((s) => ({
        id: s.id,
        fullName: s.customer?.fullName || '—',
        phone: s.customer?.phone || '',
        room: s.room?.number || '—',
        floor: s.room?.floor ?? null,
        bed: s.bed?.number ?? 0,
        debt: Math.max(0, s.totalAmount - s.paidAmount),
      }))
      .filter((s) => s.debt > 0);
    return { total: rows.reduce((a, s) => a + s.debt, 0), rows };
  }
}

export { DEFAULT_ROLE_PERMISSIONS };
