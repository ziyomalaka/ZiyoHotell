import { forwardRef, Inject, Injectable, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { formatDate, formatDateTime, formatMoney, todayISO } from '../common/datetime';
import { genderLabel } from '../common/gender';
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

  /** Fayl nomiga qavat qo‘shimchasi: qavat tanlangan bo‘lsa "_2-qavat". */
  private floorSuffix(floor?: number) {
    return floor ? `_${floor}-qavat` : '';
  }

  /** Bandlik varag‘iga jinslar kesimini qo‘shadi: bollar va qizlar xonalari alohida. */
  private genderRows(
    sheet: ExcelJS.Worksheet,
    genders: { name: string; rooms: number; beds: number; occupied: number; free: number; percent: number }[],
  ) {
    sheet.addRow([]);
    sheet.addRow(['Jins', 'Xonalar', 'O‘rinlar', 'Band', 'Bo‘sh', 'Bandlik %']);
    genders.forEach((g) => sheet.addRow([g.name, g.rooms, g.beds, g.occupied, g.free, `${g.percent}%`]));
  }

  /** To‘lov muddati varag‘i: kimning muddati qachon tugaydi va qancha to‘lashi kerak. */
  private async paymentDueSheet(sheet: ExcelJS.Worksheet, floor?: number) {
    const data = await this.reports.paymentDueReport(floor);
    sheet.addRow([
      '№',
      'F.I.Sh.',
      'Telefon',
      'Qavat',
      'Xona',
      'O‘rin',
      'Tur',
      'To‘langan davr',
      'Muddat tugashi',
      'Qolgan kun',
      'Holat',
      'Keyingi to‘lov',
    ]);
    data.rows.forEach((r, i) =>
      sheet.addRow([
        i + 1,
        r.fullName,
        r.phone,
        r.floor,
        r.room,
        r.bed,
        stayTypeLabel(r.type),
        r.paidDaysLabel,
        formatDate(r.dueDate),
        r.daysLeft ?? '—',
        r.overdue ? 'Muddat o‘tgan' : r.dueSoon ? 'Muddat yaqin' : 'Muddat bor',
        formatMoney(r.monthlyPrice),
      ]),
    );
    sheet.addRow([]);
    sheet.addRow(['Jami yashovchi', data.total]);
    sheet.addRow(['Muddati o‘tgan', data.overdue]);
    sheet.addRow(['Muddati yaqin (3 kun)', data.dueSoon]);
    sheet.addRow(['Kutilayotgan to‘lov', formatMoney(data.expected)]);
    return data;
  }

  /** Kirim-chiqim varag‘i: davr kesimida kelgan, ketgan va to‘lov summasi. */
  private async movementSheet(sheet: ExcelJS.Worksheet, range?: string, floor?: number) {
    const data = await this.reports.movementReport(range, floor);
    sheet.addRow(['Davr', 'Kirdi', 'Chiqdi', 'Farq', 'To‘lov', 'Naqd', 'Karta']);
    data.rows.forEach((r) =>
      sheet.addRow([r.label, r.in, r.out, r.net, formatMoney(r.income), formatMoney(r.cash), formatMoney(r.card)]),
    );
    sheet.addRow([]);
    sheet.addRow(['Jami kirdi', data.totalIn]);
    sheet.addRow(['Jami chiqdi', data.totalOut]);
    sheet.addRow(['Hozir yashayapti', data.living]);
    sheet.addRow(['Jami to‘lov', formatMoney(data.totalIncome)]);
    sheet.addRow(['Naqd', formatMoney(data.cash)]);
    sheet.addRow(['Karta', formatMoney(data.card)]);
    return data;
  }

  async reception(type: string, from?: string, to?: string, floor?: number, range?: string) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const day = todayISO();
    const fx = this.floorSuffix(floor);
    if (type === 'customers') {
      const data = await this.reports.customersReport(from, to, undefined, undefined, floor);
      const pays = await this.reports.paymentsReport(from, to, floor);
      sheet.addRow([
        '№',
        'F.I.Sh.',
        'Telefon',
        'Jins',
        'Qavat',
        'Xona',
        'O‘rin',
        'To‘lov turi',
        'Summa',
        'To‘lov holati',
        'Kirish sanasi',
        'Chiqish sanasi',
      ]);
      data.rows.forEach((row, i) => {
        sheet.addRow([
          i + 1,
          row.customer.fullName,
          row.customer.phone,
          genderLabel(row.customer.gender),
          row.room.floor,
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
      return this.file(wb, `Yotoqxona_Mijozlar${fx}_${(from || day).slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.reports.occupancyReport(floor);
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      sheet.addRow(['Jami xonalar', data.rooms]);
      sheet.addRow(['Jami o‘rinlar', data.beds]);
      sheet.addRow(['Band o‘rinlar', data.occupied]);
      sheet.addRow(['Bo‘sh o‘rinlar', data.free]);
      sheet.addRow(['Ta’mirdagi o‘rinlar', data.repair]);
      sheet.addRow(['Bandlik foizi', `${data.percent}%`]);
      sheet.addRow([]);
      sheet.addRow(['Qavat', 'Xonalar', 'O‘rinlar', 'Band', 'Bo‘sh', 'Bandlik %']);
      data.floors.forEach((f) =>
        sheet.addRow([`${f.floor}-qavat`, f.rooms, f.beds, f.occupied, f.free, `${f.percent}%`]),
      );
      this.genderRows(sheet, data.genders);
      return this.file(wb, `Yotoqxona_Xonalar${fx}_${day}.xlsx`);
    }
    if (type === 'check-history') {
      const rows = await this.reports.checkHistoryReport(from, to, floor);
      sheet.addRow(['F.I.Sh.', 'Qavat', 'Xona', 'Tur', 'Sana', 'Xodim']);
      for (const row of rows) {
        sheet.addRow([
          row.customer.fullName,
          row.stay.room.floor,
          `${row.stay.room.number}/${row.stay.bed.number}`,
          row.type === 'CHECK_IN' ? 'Kirish' : 'Chiqish',
          formatDate(row.at),
          row.createdBy.fullName,
        ]);
      }
      return this.file(wb, `Yotoqxona_KirishChiqish${fx}_${day}.xlsx`);
    }
    if (type === 'payment-due') {
      await this.paymentDueSheet(sheet, floor);
      return this.file(wb, `Yotoqxona_TolovMuddati${fx}_${day}.xlsx`);
    }
    if (type === 'movement') {
      await this.movementSheet(sheet, range, floor);
      return this.file(wb, `Yotoqxona_KirimChiqim${fx}_${day}.xlsx`);
    }
    const data = await this.reports.paymentsReport(from, to, floor);
    sheet.addRow(['№', 'Mijoz', 'Qavat', 'Xona/O‘rin', 'Turi', 'Davr', 'Summa', 'Sana', 'Usul', 'Holat', 'Kim kiritgan']);
    data.rows.forEach((row, i) => {
      sheet.addRow([
        i + 1,
        row.customer.fullName,
        row.stay.room.floor,
        `${row.stay.room.number}/${row.stay.bed.number}`,
        stayTypeLabel(row.type),
        row.period,
        formatMoney(row.amount),
        formatDate(row.paidAt),
        methodLabel(row.method),
        row.status,
        row.createdBy.fullName,
      ]);
    });
    sheet.addRow([]);
    sheet.addRow([`JAMI TO‘LOVLAR: ${data.rows.length}`]);
    sheet.addRow([`JAMI TUSHUM: ${formatMoney(data.total)}`]);
    sheet.addRow([`NAQD: ${formatMoney(data.cash)}`]);
    sheet.addRow([`KARTA: ${formatMoney(data.card)}`]);
    sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.unpaid)}`]);
    return this.file(wb, `Yotoqxona_Tolovlar${fx}_${day}.xlsx`);
  }

  async admin(type: string, from?: string, to?: string, floor?: number, range?: string) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const day = todayISO();
    const fx = this.floorSuffix(floor);
    if (type === 'customers') {
      const data = await this.reports.customersReport(from, to, undefined, undefined, floor);
      sheet.addRow(['F.I.Sh.', 'Telefon', 'Jins', 'Qavat', 'Xona', 'Kirish', 'Holat']);
      data.rows.forEach((row) =>
        sheet.addRow([
          row.customer.fullName,
          row.customer.phone,
          genderLabel(row.customer.gender),
          row.room.floor,
          row.room.number,
          formatDate(row.startDate),
          row.status,
        ]),
      );
      return this.file(wb, `Yotoqxona_Mijozlar${fx}_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.reports.occupancyReport(floor);
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      sheet.addRow(['Jami xonalar', data.rooms]);
      sheet.addRow(['Jami o‘rinlar', data.beds]);
      sheet.addRow(['Band o‘rinlar', data.occupied]);
      sheet.addRow(['Bo‘sh o‘rinlar', data.free]);
      sheet.addRow(['To‘liq band xonalar', data.full]);
      sheet.addRow(['Qisman band xonalar', data.partial]);
      sheet.addRow(['Bo‘sh xonalar', data.empty]);
      sheet.addRow(['Bandlik foizi', `${data.percent}%`]);
      sheet.addRow([]);
      sheet.addRow(['Qavat', 'Xonalar', 'O‘rinlar', 'Band', 'Bo‘sh', 'Bandlik %']);
      data.floors.forEach((f) =>
        sheet.addRow([`${f.floor}-qavat`, f.rooms, f.beds, f.occupied, f.free, `${f.percent}%`]),
      );
      this.genderRows(sheet, data.genders);
      return this.file(wb, `Yotoqxona_Xonalar${fx}_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'staff') {
      const rows = await this.prisma.user.findMany();
      sheet.addRow(['F.I.Sh.', 'Login', 'Rol', 'Holat']);
      rows.forEach((u) => sheet.addRow([u.fullName, u.login, u.role, u.workStatus]));
      return this.file(wb, `Yotoqxona_Xodimlar_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'debt') {
      const data = await this.prisma.stay.findMany({
        where: floor ? { room: { floor } } : {},
        include: { customer: true, room: true, bed: true },
        orderBy: [{ room: { floor: 'asc' } }, { room: { number: 'asc' } }],
      });
      const rows = data
        .map((s) => ({
          fullName: s.customer.fullName,
          floor: s.room.floor,
          room: `${s.room.number}/${s.bed.number}`,
          debt: Math.max(0, s.totalAmount - s.paidAmount),
        }))
        .filter((s) => s.debt > 0);
      sheet.addRow(['Mijoz', 'Qavat', 'Xona', 'Qarz']);
      rows.forEach((r) => sheet.addRow([r.fullName, r.floor, r.room, formatMoney(r.debt)]));
      sheet.addRow([]);
      sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(rows.reduce((a, r) => a + r.debt, 0))}`]);
      return this.file(wb, `Yotoqxona_Qarzdorlik${fx}_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'check-history') {
      const rows = await this.reports.checkHistoryReport(from, to, floor);
      sheet.addRow(['F.I.Sh.', 'Qavat', 'Xona', 'Tur', 'Sana']);
      rows.forEach((r) =>
        sheet.addRow([
          r.customer.fullName,
          r.stay.room.floor,
          `${r.stay.room.number}/${r.stay.bed.number}`,
          r.type,
          formatDate(r.at),
        ]),
      );
      return this.file(wb, `Yotoqxona_KirishChiqish${fx}_${day.slice(0, 7)}.xlsx`);
    }
    if (type === 'payment-due') {
      await this.paymentDueSheet(sheet, floor);
      return this.file(wb, `Yotoqxona_TolovMuddati${fx}_${day}.xlsx`);
    }
    if (type === 'movement') {
      await this.movementSheet(sheet, range, floor);
      return this.file(wb, `Yotoqxona_KirimChiqim${fx}_${day}.xlsx`);
    }
    const data = await this.reports.paymentsReport(from, to, floor);
    sheet.addRow(['Mijoz', 'Qavat', 'Xona', 'Summa', 'Sana', 'Holat']);
    data.rows.forEach((r) =>
      sheet.addRow([
        r.customer.fullName,
        r.stay.room.floor,
        r.stay.room.number,
        formatMoney(r.amount),
        formatDate(r.paidAt),
        r.status,
      ]),
    );
    return this.file(wb, `Yotoqxona_Tolovlar${fx}_${day.slice(0, 7)}.xlsx`);
  }

  async manager(opts: {
    type: string;
    from?: string;
    to?: string;
    date?: string;
    year?: number;
    month?: number;
    floor?: number;
    range?: string;
  }) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hisobot');
    const date = opts.date || todayISO();
    const year = opts.year || Number(date.slice(0, 4));
    const month = opts.month || Number(date.slice(5, 7));
    const type = opts.type || 'payments';
    const floor = opts.floor;
    const fx = this.floorSuffix(floor);
    if (type === 'customers') {
      const data = await this.managerSvc.customersReport(opts.from, opts.to, floor);
      sheet.addRow(['№', 'F.I.Sh.', 'Telefon', 'Jins', 'Qavat', 'Xona', 'O‘rin', 'Kirish', 'Tur', 'Holat']);
      data.rows.forEach((row, i) =>
        sheet.addRow([
          i + 1,
          row.customer.fullName,
          row.customer.phone,
          genderLabel(row.customer.gender),
          row.room.floor,
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
      return this.file(wb, `Yotoqxona_Mijozlar${fx}_${date}.xlsx`);
    }
    if (type === 'daily') {
      const data = await this.managerSvc.dailyPayments(date, floor);
      sheet.addRow(['№', 'Vaqt', 'Mijoz', 'Qavat', 'Xona', 'O‘rin', 'Tur', 'Davr', 'Summa', 'Usul', 'Reception', 'Holat']);
      data.rows.forEach((row, i) =>
        sheet.addRow([
          i + 1,
          formatDateTime(row.paidAt),
          row.customer.fullName,
          row.stay.room.floor,
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
      sheet.addRow([`NAQD: ${formatMoney(data.cash)}`]);
      sheet.addRow([`KARTA: ${formatMoney(data.card)}`]);
      return this.file(wb, `Yotoqxona_Kunlik_Tolovlar${fx}_${date}.xlsx`);
    }
    if (type === 'monthly') {
      const data = await this.managerSvc.monthlyPayments(year, month, floor);
      sheet.addRow(['Mijoz', 'Qavat', 'Xona', 'O‘rin', 'Oy', 'To‘lanishi kerak', 'To‘langan', 'Qolgan', 'Holat', 'Oxirgi to‘lov']);
      data.stayRows.forEach((row) =>
        sheet.addRow([
          row.customer,
          row.floor,
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
      sheet.addRow([`NAQD: ${formatMoney(data.cash)}`]);
      sheet.addRow([`KARTA: ${formatMoney(data.card)}`]);
      sheet.addRow([`JAMI TO‘LOVLAR: ${data.count}`]);
      sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.debt)}`]);
      return this.file(wb, `Yotoqxona_Oylik_Tolovlar${fx}_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'debts') {
      const data = await this.managerSvc.debts({ skip: 0, pageSize: 10000, floor });
      sheet.addRow(['Mijoz', 'Telefon', 'Qavat', 'Xona', 'O‘rin', 'Tur', 'To‘lanishi kerak', 'To‘langan', 'Qarz', 'Holat']);
      data.rows.forEach((row) =>
        sheet.addRow([
          row.fullName,
          row.phone,
          row.floor,
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
      return this.file(wb, `Yotoqxona_Qarzdorlik${fx}_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'occupancy') {
      const data = await this.managerSvc.occupancy(floor);
      sheet.addRow(['Ko‘rsatkich', 'Qiymat']);
      sheet.addRow(['Jami xonalar', data.rooms]);
      sheet.addRow(['Jami o‘rinlar', data.beds]);
      sheet.addRow(['Band', data.occupied]);
      sheet.addRow(['Bo‘sh', data.free]);
      sheet.addRow(['Qisman band xonalar', data.partial]);
      sheet.addRow(['To‘liq band xonalar', data.full]);
      sheet.addRow(['Bandlik foizi', `${data.percent}%`]);
      sheet.addRow([]);
      sheet.addRow(['Qavat', 'Xonalar', 'O‘rinlar', 'Band', 'Bo‘sh', 'Bandlik %']);
      data.floors.forEach((f) =>
        sheet.addRow([`${f.floor}-qavat`, f.rooms, f.beds, f.occupied, f.free, `${f.percent}%`]),
      );
      this.genderRows(sheet, data.genders);
      return this.file(wb, `Yotoqxona_Xonalar${fx}_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'check-history') {
      const data = await this.managerSvc.checkHistory({
        skip: 0,
        pageSize: 10000,
        from: opts.from,
        to: opts.to,
        floor,
        tab: 'all',
      });
      sheet.addRow(['F.I.Sh.', 'Qavat', 'Xona', 'O‘rin', 'Kirish', 'Chiqish', 'Holat', 'Reception']);
      data.rows.forEach((row) =>
        sheet.addRow([
          row.fullName,
          row.floor,
          row.room,
          row.bed,
          formatDateTime(row.inAt),
          row.outAt ? formatDateTime(row.outAt) : '—',
          row.status === 'ACTIVE' ? 'Yashamoqda' : 'Chiqib ketgan',
          row.reception,
        ]),
      );
      return this.file(wb, `Yotoqxona_Kirish_Chiqish${fx}_${date.slice(0, 7)}.xlsx`);
    }
    if (type === 'payment-due') {
      await this.paymentDueSheet(sheet, floor);
      return this.file(wb, `Yotoqxona_TolovMuddati${fx}_${date}.xlsx`);
    }
    if (type === 'movement') {
      await this.movementSheet(sheet, opts.range, floor);
      return this.file(wb, `Yotoqxona_KirimChiqim${fx}_${date}.xlsx`);
    }
    const data = await this.reports.paymentsReport(opts.from, opts.to, floor);
    sheet.addRow([
      '№',
      'Mijoz',
      'Telefon',
      'Qavat',
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
        row.stay.room.floor,
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
    sheet.addRow([`NAQD: ${formatMoney(data.cash)}`]);
    sheet.addRow([`KARTA: ${formatMoney(data.card)}`]);
    sheet.addRow([`JAMI QARZDORLIK: ${formatMoney(data.unpaid)}`]);
    return this.file(wb, `Yotoqxona_Tolovlar${fx}_${date.slice(0, 7)}.xlsx`);
  }
}
