import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dayEnd, dayStart } from '../common/datetime';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const where: { gte?: Date; lte?: Date } = {};
    if (from) where.gte = dayStart(from);
    if (to) where.lte = dayEnd(to);
    return Object.keys(where).length ? where : undefined;
  }

  async customersReport(from?: string, to?: string, roomId?: string, status?: string) {
    const createdAt = this.range(from, to);
    const stays = await this.prisma.stay.findMany({
      where: {
        ...(createdAt ? { startDate: createdAt } : {}),
        ...(roomId ? { roomId } : {}),
        ...(status ? { status } : {}),
      },
      include: { customer: true, room: true, bed: true },
      orderBy: { startDate: 'desc' },
    });
    const active = await this.prisma.occupancy.count();
    return {
      total: stays.length,
      arrived: stays.length,
      left: stays.filter((s) => s.status === 'COMPLETED').length,
      living: status === 'ACTIVE' ? stays.length : active,
      rows: stays,
    };
  }

  async paymentsReport(from?: string, to?: string) {
    const paidAt = this.range(from, to);
    const payments = await this.prisma.payment.findMany({
      where: { ...(paidAt ? { paidAt } : {}), NOT: { status: 'CANCELLED' } },
      include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: true },
      orderBy: { paidAt: 'desc' },
    });
    const sum = (status?: string, type?: string) =>
      payments
        .filter((p) => (status ? p.status === status : true) && (type ? p.type === type : true))
        .reduce((acc, p) => acc + p.amount, 0);
    const unpaidDebt = await this.prisma.stay.findMany({ select: { totalAmount: true, paidAmount: true, status: true } });
    const unpaidStays = unpaidDebt.filter((s) => s.paidAmount < s.totalAmount);
    return {
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

  async occupancyReport() {
    const rooms = await this.prisma.room.findMany({ include: { beds: { include: { occupancy: true } } } });
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

  async checkHistoryReport(from?: string, to?: string) {
    const at = this.range(from, to);
    return this.prisma.checkLog.findMany({
      where: at ? { at } : {},
      include: { customer: true, stay: { include: { room: true, bed: true } }, createdBy: true },
      orderBy: { at: 'desc' },
    });
  }
}

export type { Prisma };
