import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Roles } from '../common/decorators';
import { parsePage } from '../common/errors';
import { ROLES } from '../common/roles';
import { ExcelService } from '../reports/excel.service';
import { ReportsService } from '../reports/reports.service';
import { CancelPaymentDto, CheckoutDto, CreatePaymentDto, PageQueryDto, RegisterDto } from './dto';
import { ReceptionService } from './reception.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('reception')
@ApiCookieAuth('zh_access')
@ApiBearerAuth()
@Roles(ROLES.RECEPTION, ROLES.SYSTEM_ADMIN)
@Controller('reception')
export class ReceptionController {
  constructor(
    private reception: ReceptionService,
    private reports: ReportsService,
    private excel: ExcelService,
    private prisma: PrismaService,
  ) {}

  @Get('home')
  @ApiOperation({ summary: 'Reception bosh ekran' })
  home() {
    return this.reception.home();
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Xonalar va o‘rinlar holati' })
  rooms() {
    return this.reception.roomsOverview();
  }

  @Get('rooms/:id/beds')
  @ApiOperation({ summary: 'Xona o‘rinlari' })
  roomBeds(@Param('id') id: string) {
    return this.reception.roomBeds(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Mijozlar ro‘yxati' })
  customers(@Query() query: PageQueryDto) {
    const page = parsePage(query);
    return this.reception.listCustomers({ q: query.q, tab: query.tab, ...page });
  }

  @Get('customers/search')
  @ApiOperation({ summary: 'Mijoz qidirish' })
  search(@Query('q') q?: string, @Query('passport') passport?: string, @Query('phone') phone?: string) {
    if (passport || phone) return this.reception.findCustomerByPassportOrPhone(passport, phone);
    return this.reception.searchCustomers(q || '');
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Mijoz profili' })
  customer(@Param('id') id: string) {
    return this.reception.getCustomer(id);
  }

  @Delete('customers/:id')
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Mijozni o‘chirish' })
  deleteCustomer(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.reception.deleteCustomer(id, user.id);
  }

  @Post('customers/register')
  @HttpCode(201)
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Ro‘yxatga olish va check-in' })
  register(@Body() body: RegisterDto, @CurrentUser() user: { id: string }) {
    return this.reception.registerCustomer(body, user.id);
  }

  @Post('register-and-check-in')
  @HttpCode(201)
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Ro‘yxatga olish va check-in (alias)' })
  registerAlias(@Body() body: RegisterDto, @CurrentUser() user: { id: string }) {
    return this.reception.registerCustomer(body, user.id);
  }

  @Post('check-in')
  @HttpCode(201)
  @Permissions('stays.manage')
  @ApiOperation({ summary: 'Check-in (register bilan bir xil transaction)' })
  checkIn(@Body() body: RegisterDto, @CurrentUser() user: { id: string }) {
    return this.reception.registerCustomer(body, user.id);
  }

  @Get('stays')
  @ApiOperation({ summary: 'Kirish / chiqish ro‘yxati' })
  stays(@Query() query: PageQueryDto) {
    const page = parsePage(query);
    return this.reception.listStays({ ...query, ...page });
  }

  @Post('check-out')
  @Permissions('stays.manage')
  @ApiOperation({ summary: 'Check-out' })
  checkout(@Body() body: CheckoutDto, @CurrentUser() user: { id: string }) {
    return this.reception.checkoutStay(body, user.id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'To‘lovlar ro‘yxati' })
  payments(@Query() query: PageQueryDto) {
    const page = parsePage(query);
    return this.reception.listPayments({ ...query, ...page });
  }

  @Post('payments')
  @HttpCode(201)
  @Permissions('payments.create')
  @ApiOperation({ summary: 'To‘lov kiritish' })
  createPayment(
    @Body() body: CreatePaymentDto,
    @CurrentUser() user: { id: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.reception.addPayment({ ...body, idempotencyKey: body.idempotencyKey || idempotencyKey }, user.id);
  }

  @Post('payments/:id/cancel')
  @Permissions('payments.create')
  @ApiOperation({ summary: 'To‘lovni bekor qilish' })
  cancelPayment(@Param('id') id: string, @Body() body: CancelPaymentDto, @CurrentUser() user: { id: string }) {
    return this.reception.cancelPayment(id, body.reason, user.id);
  }

  @Get('reports/customers')
  @Permissions('reports.view')
  customersReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.customersReport(from, to);
  }

  @Get('reports/payments')
  @Permissions('reports.view')
  paymentsReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.paymentsReport(from, to);
  }

  @Get('reports/occupancy')
  @Permissions('reports.view')
  occupancy() {
    return this.reports.occupancyReport();
  }

  @Get('reports/check-history')
  @Permissions('reports.view')
  checkHistory(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.checkHistoryReport(from, to);
  }

  @Get('reports/export/excel')
  @Permissions('reports.export')
  @ApiOperation({ summary: 'Excel eksport' })
  async excelExport(
    @Query('type') type = 'payments',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: { id: string },
  ): Promise<StreamableFile> {
    const { file } = await this.excel.reception(type, from, to);
    await this.prisma.auditLog.create({
      data: { userId: user!.id, action: 'EXCEL_EXPORT', entity: 'Report', meta: JSON.stringify({ type, from, to }) },
    });
    return file;
  }
}
