import { forwardRef, Inject, Injectable, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { formatDate, formatDateTime, formatMoney, todayISO } from '../common/datetime';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { ManagerService } from '../manager/manager.service';

function stayTypeLabel(type: string) {
  return type === 'DAILY' ? 'Kunlik' : type === 'MONTHLY' ? 'Oylik' : type;
}

function payStatusLabel(status: string) {
  if (status === 'PAID') return 'To‘langan';
  if (status === 'PARTIAL') return 'Qisman to‘lagan';
  if (status === 'UNPAID') return 'To‘lamagan';
  if (status === 'CANCELLED') return 'Bekor qilingan';
  return status;
}

function methodLabel(method: string) {
  if (method === 'CASH') return 'Naqd';
  if (method === 'CARD') return 'Karta';
  if (method === 'BANK') return 'Bank';
  if (method === 'OTHER') return 'Boshqa';
  return method;
}

@Injectable()
export class ExcelService {
  constructor(
    private reports: ReportsService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => ManagerService)) private managerSvc: ManagerService,
  ) {}

  private async file(wb: ExcelJS.Workbook, filename: string) {
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      file: new StreamableFile(buf, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${filename}"`,
      }),
      filename,
    };
  }

  async reception(type: string, from?: string, to?: string) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const day = todayISO();
    if (type === 'customers') {
      const data = await this.reports.customersReport(from, to);
      const pays = await this.reports.paymentsReport(from, to);
      sheet.addRow(['№', 'F.I.Sh.', 'Telefon', 'Xona', 'O‘rin', 'To‘lov turi', 'Summa', 'To‘lov holati', 'Kirish sanasi', 'Chiqish sanasi']);
      data.rows.forEach((row, i) => {
        sheet.addRow([
          i + 1,
          row.customer.fullName,
          row.customer.phone,
          row.room.number,
          row.bed.number,
          stayTypeLabel(row.type),
          row.totalAmount,
          row.paidAmount > 0 ? 'To‘ladi' : 'To‘lamadi',
          formatDate(row.startDate),
          row.status === 'COMPLETED' ? formatDate(row.endDate) : '',
        ]);
      });
      sheet.addRow([]);
      sheet.addRow(['JAMI MIJOZ', data.total]);
      sheet.addRow(['JAMI TO‘LOV', pays.total]);
      return this.file(wb, `Yotoqxona_Mijozlar_${(from || day).slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.reports.occupancyReport();
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      sheet.addRow(['Jami xonalar', data.rooms]);
      sheet.addRow(['Jami o‘rinlar', data.beds]);
      sheet.addRow(['Band o‘rinlar', data.occupied]);
      sheet.addRow(['Bo‘sh o‘rinlar', data.free]);
      sheet.addRow(['Ta’mirdagi o‘rinlar', data.repair]);
      sheet.addRow(['Bandlik foizi', `${data.percent}%`]);
      return this.file(wb, `Yotoqxona_Xonalar_${day}.xlsx`);
    }
    if (type === 'check-history') {
      const rows = await this.reports.checkHistoryReport(from, to);
      sheet.addRow(['F.I.Sh.', 'Xona', 'Tur', 'Sana', 'Xodim']);
      for (const row of rows) {
        sheet.addRow([
          row.customer.fullName,
          `${row.stay.room.number}/${row.stay.bed.number}`,
          row.type === 'CHECK_IN' ? 'Kirish' : 'Chiqish',
          formatDate(row.at),
          row.createdBy.fullName,
        ]);
      }
      return this.file(wb, `Yotoqxona_KirishChiqish_${day}.xlsx`);
    }
    const data = await this.reports.paymentsReport(from, to);
    sheet.addRow(['№', 'Mijoz', 'Xona/O‘rin', 'Turi', 'Davr', 'Summa', 'Sana', 'Usul', 'Holat', 'Kim kiritgan']);
    data.rows.forEach((row, i) => {
      sheet.addRow([
        i + 1,
        row.customer.fullName,
        `${row.stay.room.number}/${row.stay.bed.number}`,
        stayTypeLabel(row.type),
        row.period,
        formatMoney(row.amount),
        formatDate(row.paidAt),
        row.method,
        row.status,
        row.createdBy.fullName,
      ]);
    });
    sheet.addRow([]);
    sheet.addRow([`JAMI TO‘LOVLAR: ${data.rows.length}`]);
    sheet.addRow([`JAMI TUSHUM: ${formatMoney(data.total)}`]);
    sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.unpaid)}`]);
    return this.file(wb, `Yotoqxona_Tolovlar_${day}.xlsx`);
  }

  async admin(type: string, from?: string, to?: string) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const day = todayISO();
    if (type === 'customers') {
      const data = await this.reports.customersReport(from, to);
      sheet.addRow(['F.I.Sh.', 'Telefon', 'Xona', 'Kirish', 'Holat']);
      data.rows.forEach((row) =>
        sheet.addRow([row.customer.fullName, row.customer.phone, row.room.number, formatDate(row.startDate), row.status]),
      );
      return this.file(wb, `Yotoqxona_Mijozlar_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.reports.occupancyReport();
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      Object.entries(data).forEach(([k, v]) => sheet.addRow([k, v]));
      return this.file(wb, `Yotoqxona_Xonalar_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'staff') {
      const rows = await this.prisma.user.findMany();
      sheet.addRow(['F.I.Sh.', 'Login', 'Rol', 'Holat']);
      rows.forEach((u) => sheet.addRow([u.fullName, u.login, u.role, u.workStatus]));
      return this.file(wb, `Yotoqxona_Xodimlar_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'debt') {
      const data = await this.prisma.stay.findMany({ include: { customer: true, room: true, bed: true } });
      const rows = data
        .map((s) => ({
          fullName: s.customer.fullName,
          room: `${s.room.number}/${s.bed.number}`,
          debt: Math.max(0, s.totalAmount - s.paidAmount),
        }))
        .filter((s) => s.debt > 0);
      sheet.addRow(['Mijoz', 'Xona', 'Qarz']);
      rows.forEach((r) => sheet.addRow([r.fullName, r.room, formatMoney(r.debt)]));
      sheet.addRow([]);
      sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(rows.reduce((a, r) => a + r.debt, 0))}`]);
      return this.file(wb, `Yotoqxona_Qarzdorlik_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'check-history') {
      const rows = await this.reports.checkHistoryReport(from, to);
      sheet.addRow(['F.I.Sh.', 'Xona', 'Tur', 'Sana']);
      rows.forEach((r) =>
        sheet.addRow([r.customer.fullName, `${r.stay.room.number}/${r.stay.bed.number}`, r.type, formatDate(r.at)]),
      );
      return this.file(wb, `Yotoqxona_KirishChiqish_${day.slice(0, 7)}.xlsx`);
    }
    const data = await this.reports.paymentsReport(from, to);
    sheet.addRow(['Mijoz', 'Summa', 'Sana', 'Holat']);
    data.rows.forEach((r) => sheet.addRow([r.customer.fullName, formatMoney(r.amount), formatDate(r.paidAt), r.status]));
    return this.file(wb, `Yotoqxona_Tolovlar_${day.slice(0, 7)}.xlsx`);
  }

  async manager(opts: { type: string; from?: string; to?: string; date?: string; year?: number; month?: number }) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const date = opts.date || todayISO();
    const year = opts.year || Number(date.slice(0, 4));
    const month = opts.month || Number(date.slice(5, 7));
    const type = opts.type || 'payments';
    if (type === 'customers') {
      const data = await this.managerSvc.customersReport(opts.from, opts.to);
      sheet.addRow(['№', 'F.I.Sh.', 'Telefon', 'Xona', 'O‘rin', 'Kirish', 'Tur', 'Holat']);
      data.rows.forEach((row, i) =>
        sheet.addRow([
          i + 1,
          row.customer.fullName,
          row.customer.phone,
          row.room.number,
          row.bed.number,
          formatDate(row.startDate),
          stayTypeLabel(row.type),
          row.status === 'ACTIVE' ? 'Yashamoqda' : 'Chiqib ketgan',
        ]),
      );
      sheet.addRow([]);
      sheet.addRow([`JAMI MIJOZ: ${data.total}`]);
      sheet.addRow([`HOZIR YASHAYDI: ${data.living}`]);
      sheet.addRow([`CHIQIB KETGAN: ${data.left}`]);
      return this.file(wb, `Yotoqxona_Mijozlar_${date}.xlsx`);
    }
    if (type === 'daily') {
      const data = await this.managerSvc.dailyPayments(date);
      sheet.addRow(['№', 'Vaqt', 'Mijoz', 'Xona', 'O‘rin', 'Tur', 'Davr', 'Summa', 'Usul', 'Reception', 'Holat']);
      data.rows.forEach((row, i) =>
        sheet.addRow([
          i + 1,
          formatDateTime(row.paidAt),
          row.customer.fullName,
          row.stay.room.number,
          row.stay.bed.number,
          stayTypeLabel(row.type),
          row.period,
          row.amount,
          methodLabel(row.method),
          row.createdBy.fullName,
          payStatusLabel(row.status),
        ]),
      );
      sheet.addRow([]);
      sheet.addRow([`JAMI TO‘LOVLAR: ${data.count}`]);
      sheet.addRow([`JAMI TUSHUM: ${formatMoney(data.total)}`]);
      return this.file(wb, `Yotoqxona_Kunlik_Tolovlar_${date}.xlsx`);
    }
    if (type === 'monthly') {
      const data = await this.managerSvc.monthlyPayments(year, month);
      sheet.addRow(['Mijoz', 'Xona', 'O‘rin', 'Oy', 'To‘lanishi kerak', 'To‘langan', 'Qolgan', 'Holat', 'Oxirgi to‘lov']);
      data.stayRows.forEach((row) =>
        sheet.addRow([
          row.customer,
          row.room,
          row.bed,
          row.month,
          row.totalAmount,
          row.paidAmount,
          row.debt,
          payStatusLabel(row.payStatus),
          formatDate(row.lastPaidAt),
        ]),
      );
      sheet.addRow([]);
      sheet.addRow([`JAMI TUSHUM: ${formatMoney(data.total)}`]);
      sheet.addRow([`JAMI TO‘LOVLAR: ${data.count}`]);
      sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.debt)}`]);
      return this.file(wb, `Yotoqxona_Oylik_Tolovlar_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'debts') {
      const data = await this.managerSvc.debts({ skip: 0, pageSize: 10000 });
      sheet.addRow(['Mijoz', 'Telefon', 'Xona', 'O‘rin', 'Tur', 'To‘lanishi kerak', 'To‘langan', 'Qarz', 'Holat']);
      data.rows.forEach((row) =>
        sheet.addRow([
          row.fullName,
          row.phone,
          row.room,
          row.bed,
          stayTypeLabel(row.type),
          row.totalAmount,
          row.paidAmount,
          row.debt,
          payStatusLabel(row.status),
        ]),
      );
      sheet.addRow([]);
      sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.totalDebt)}`]);
      return this.file(wb, `Yotoqxona_Qarzdorlik_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.managerSvc.occupancy();
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      sheet.addRow(['Jami xonalar', data.rooms]);
      sheet.addRow(['Jami o‘rinlar', data.beds]);
      sheet.addRow(['Band', data.occupied]);
      sheet.addRow(['Bo‘sh', data.free]);
      sheet.addRow(['Qisman band xonalar', data.partial]);
      sheet.addRow(['To‘liq band xonalar', data.full]);
      sheet.addRow(['Bandlik foizi', `${data.percent}%`]);
      return this.file(wb, `Yotoqxona_Xonalar_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'check-history') {
      const data = await this.managerSvc.checkHistory({ skip: 0, pageSize: 10000, from: opts.from, to: opts.to, tab: 'all' });
      sheet.addRow(['F.I.Sh.', 'Xona', 'O‘rin', 'Kirish', 'Chiqish', 'Holat', 'Reception']);
      data.rows.forEach((row) =>
        sheet.addRow([
          row.fullName,
          row.room,
          row.bed,
          formatDateTime(row.inAt),
          row.outAt ? formatDateTime(row.outAt) : '—',
          row.status === 'ACTIVE' ? 'Yashamoqda' : 'Chiqib ketgan',
          row.reception,
        ]),
      );
      return this.file(wb, `Yotoqxona_Kirish_Chiqish_${date.slice(0, 7)}.xlsx`);
    }
    const data = await this.reports.paymentsReport(opts.from, opts.to);
    sheet.addRow([
      '№',
      'Mijoz',
      'Telefon',
      'Xona',
      'O‘rin',
      'To‘lov turi',
      'Davr',
      'Kutilgan summa',
      'To‘langan summa',
      'Qarzdorlik',
      'To‘lov usuli',
      'Sana',
      'Reception',
      'Holat',
    ]);
    data.rows.forEach((row, i) =>
      sheet.addRow([
        i + 1,
        row.customer.fullName,
        row.customer.phone,
        row.stay.room.number,
        row.stay.bed.number,
        stayTypeLabel(row.type),
        row.period,
        row.stay.totalAmount,
        row.amount,
        Math.max(0, row.stay.totalAmount - row.stay.paidAmount),
        methodLabel(row.method),
        formatDate(row.paidAt),
        row.createdBy.fullName,
        payStatusLabel(row.status),
      ]),
    );
    sheet.addRow([]);
    sheet.addRow([`JAMI TO‘LOVLAR: ${data.rows.length}`]);
    sheet.addRow([`JAMI TUSHUM: ${formatMoney(data.total)}`]);
    sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.unpaid)}`]);
    return this.file(wb, `Yotoqxona_Tolovlar_${date.slice(0, 7)}.xlsx`);
  }
}
