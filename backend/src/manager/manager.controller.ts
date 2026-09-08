import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Roles } from '../common/decorators';
import { parsePage } from '../common/errors';
import { todayISO } from '../common/datetime';
import { ROLES } from '../common/roles';
import { PageQueryDto } from '../reception/dto';
import { ExcelService } from '../reports/excel.service';
import { ReportsService } from '../reports/reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManagerService } from './manager.service';

@ApiTags('manager')
@ApiCookieAuth('zh_access')
@ApiBearerAuth()
@Roles(ROLES.MANAGER, ROLES.SYSTEM_ADMIN)
@Controller('manager')
export class ManagerController {
  constructor(
    private manager: ManagerService,
    private excel: ExcelService,
    private reports: ReportsService,
    private prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Boshliq dashboard' })
  dashboard() {
    return this.manager.dashboard();
  }

  @Get('floors')
  @ApiOperation({ summary: 'Qavatlar ro‘yxati (filtrlar uchun)' })
  floors() {
    return this.manager.floorOptions();
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Xonalar ro‘yxati (faqat o‘qish)' })
  rooms(@Query('floor') floor?: string) {
    return this.manager.listRooms(floor ? Number(floor) : undefined);
  }

  @Get('customers')
  customers(@Query() query: PageQueryDto & { pay?: string; sort?: string; order?: string }) {
    return this.manager.customers({ ...query, ...parsePage(query) });
  }

  @Get('customers/:id')
  customer(@Param('id') id: string) {
    return this.manager.customerProfile(id);
  }

  @Get('payments')
  payments(@Query() query: PageQueryDto & { method?: string }) {
    return this.manager.payments({ ...query, ...parsePage(query) });
  }

  @Get('payments/daily')
  daily(@Query('date') date?: string, @Query('floor') floor?: string) {
    return this.manager.dailyPayments(date || todayISO(), floor ? Number(floor) : undefined);
  }

  @Get('payments/monthly')
  monthly(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('date') date?: string,
    @Query('floor') floor?: string,
  ) {
    const d = date || todayISO();
    return this.manager.monthlyPayments(
      Number(year || d.slice(0, 4)),
      Number(month || d.slice(5, 7)),
      floor ? Number(floor) : undefined,
    );
  }

  @Get('debts')
  debts(@Query() query: PageQueryDto) {
    return this.manager.debts({
      tab: query.tab,
      q: query.q,
      type: query.type,
      age: query.age,
      floor: query.floor,
      ...parsePage(query),
    });
  }

  @Get('check-history')
  checkHistory(
    @Query() query: PageQueryDto & { room?: string; staffId?: string },
  ) {
    const page = parsePage(query);
    return this.manager.checkHistory({
      tab: query.tab,
      q: query.q,
      range: query.range,
      from: query.from,
      to: query.to,
      room: query.room,
      floor: query.floor,
      staffId: query.staffId,
      skip: page.skip,
      pageSize: page.pageSize,
    }).then((data) => ({ ...data, page: page.page, pageSize: page.pageSize }));
  }

  @Get('reports/customers')
  @Permissions('reports.view')
  customersReport(@Query('from') from?: string, @Query('to') to?: string, @Query('floor') floor?: string) {
    return this.manager.customersReport(from, to, floor ? Number(floor) : undefined);
  }

  @Get('reports/payments/daily')
  @Permissions('reports.view')
  reportDaily(@Query('date') date?: string, @Query('floor') floor?: string) {
    return this.manager.dailyPayments(date || todayISO(), floor ? Number(floor) : undefined);
  }

  @Get('reports/payments/monthly')
  @Permissions('reports.view')
  reportMonthly(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('date') date?: string,
    @Query('floor') floor?: string,
  ) {
    const d = date || todayISO();
    return this.manager.monthlyPayments(
      Number(year || d.slice(0, 4)),
      Number(month || d.slice(5, 7)),
      floor ? Number(floor) : undefined,
    );
  }

  @Get('reports/debts')
  @Permissions('reports.view')
  reportDebts(@Query() query: PageQueryDto) {
    return this.manager.debts({ tab: query.tab, q: query.q, floor: query.floor, skip: 0, pageSize: 10000 });
  }

  @Get('reports/occupancy')
  @Permissions('reports.view')
  occupancy(@Query('floor') floor?: string) {
    return this.manager.occupancy(floor ? Number(floor) : undefined);
  }

  @Get('reports/check-history')
  @Permissions('reports.view')
  reportChecks(@Query('from') from?: string, @Query('to') to?: string, @Query('floor') floor?: string) {
    return this.manager.checkHistory({
      from,
      to,
      floor: floor ? Number(floor) : undefined,
      skip: 0,
      pageSize: 10000,
      tab: 'all',
    });
  }

  @Get('reports/payment-due')
  @Permissions('reports.view')
  paymentDue(@Query('floor') floor?: string) {
    return this.reports.paymentDueReport(floor ? Number(floor) : undefined);
  }

  @Get('reports/movement')
  @Permissions('reports.view')
  movement(@Query('range') range?: string, @Query('floor') floor?: string) {
    return this.reports.movementReport(range, floor ? Number(floor) : undefined);
  }

  @Get('reports/export/excel')
  @Permissions('reports.export')
  async excelExport(
    @Query('type') type = 'payments',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('floor') floor?: string,
    @Query('range') range?: string,
    @CurrentUser() user?: { id: string },
  ): Promise<StreamableFile> {
    const { file } = await this.excel.manager({
      type,
      from,
      to,
      date,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      floor: floor ? Number(floor) : undefined,
      range,
    });
    await this.prisma.auditLog.create({
      data: { userId: user!.id, action: 'EXCEL_EXPORT', entity: 'Report', meta: JSON.stringify({ type, floor }) },
    });
    return file;
  }
}
