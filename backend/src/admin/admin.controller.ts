import { Body, Controller, Delete, Get, HttpCode, Ip, Param, Post, Put, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Roles } from '../common/decorators';
import { parsePage } from '../common/errors';
import { ALL_PERMISSIONS, ROLES } from '../common/roles';
import { PageQueryDto } from '../reception/dto';
import { ExcelService } from '../reports/excel.service';
import { ReportsService } from '../reports/reports.service';
import { ReceptionService } from '../reception/reception.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { AdminCancelPaymentDto, BedDto, FloorDto, RestoreDto, RolePermissionsDto, RoomDto, SettingsDto, StaffDto } from './dto';

@ApiTags('admin')
@ApiCookieAuth('zh_access')
@ApiBearerAuth()
@Roles(ROLES.SYSTEM_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private reports: ReportsService,
    private excel: ExcelService,
    private reception: ReceptionService,
    private prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('floors')
  floors() {
    return this.admin.listFloors();
  }

  @Post('floors')
  @HttpCode(201)
  @Permissions('rooms.manage')
  createFloor(@Body() body: FloorDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveFloor(body, user.id, ip);
  }

  @Put('floors/:id')
  @Permissions('rooms.manage')
  updateFloor(@Param('id') id: string, @Body() body: FloorDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveFloor({ ...body, id }, user.id, ip);
  }

  @Get('rooms')
  rooms() {
    return this.admin.listRooms();
  }

  @Post('rooms')
  @HttpCode(201)
  @Permissions('rooms.manage')
  createRoom(@Body() body: RoomDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveRoom(body, user.id, ip);
  }

  @Put('rooms/:id')
  @Permissions('rooms.manage')
  updateRoom(@Param('id') id: string, @Body() body: RoomDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveRoom({ ...body, id }, user.id, ip);
  }

  @Delete('rooms/:id')
  @Permissions('rooms.manage')
  @ApiOperation({ summary: 'Xonani o‘chirish' })
  deleteRoom(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.deleteRoom(id, user.id, ip);
  }

  @Get('beds')
  beds() {
    return this.admin.listBeds();
  }

  @Post('beds')
  @HttpCode(201)
  @Permissions('rooms.manage')
  createBed(@Body() body: BedDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveBed(body, user.id, ip);
  }

  @Put('beds/:id')
  @Permissions('rooms.manage')
  updateBed(@Param('id') id: string, @Body() body: BedDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveBed({ ...body, id }, user.id, ip);
  }

  @Delete('beds/:id')
  @Permissions('rooms.manage')
  deleteBed(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.deactivateBed(id, user.id, ip);
  }

  @Post('beds/:id/deactivate')
  @Permissions('rooms.manage')
  deactivateBed(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.deactivateBed(id, user.id, ip);
  }

  @Get('staff')
  staff(@Query() query: PageQueryDto) {
    return this.admin.listStaff({ q: query.q, ...parsePage(query) });
  }

  @Post('staff')
  @HttpCode(201)
  @Permissions('staff.manage')
  createStaff(@Body() body: StaffDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveStaff(body, user.id, ip);
  }

  @Put('staff/:id')
  @Permissions('staff.manage')
  updateStaff(@Param('id') id: string, @Body() body: StaffDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveStaff({ ...body, id }, user.id, ip);
  }

  @Post('staff/:id/block')
  @Permissions('staff.manage')
  block(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.blockStaff(id, user.id, ip, false);
  }

  @Post('staff/:id/unblock')
  @Permissions('staff.manage')
  unblock(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.blockStaff(id, user.id, ip, true);
  }

  @Post('staff/:id/reset-password')
  @Permissions('staff.manage')
  resetPassword(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.resetStaffPassword(id, user.id, ip);
  }

  @Delete('staff/:id')
  @Permissions('staff.manage')
  deleteStaff(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.deleteStaff(id, user.id, ip);
  }

  @Get('customers')
  customers(@Query() query: PageQueryDto & { pay?: string }) {
    return this.admin.listCustomers({ q: query.q, tab: query.tab, type: query.type, pay: query.pay, ...parsePage(query) });
  }

  @Get('customers/:id')
  customer(@Param('id') id: string) {
    return this.admin.getCustomer(id);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: 'Mijozni o‘chirish' })
  deleteCustomer(@Param('id') id: string, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.reception.deleteCustomer(id, user.id);
  }

  @Get('payments')
  payments(@Query() query: PageQueryDto) {
    return this.admin.listPayments({ ...query, ...parsePage(query) });
  }

  @Post('payments')
  cancelPayment(@Body() body: AdminCancelPaymentDto, @CurrentUser() user: { id: string }) {
    return this.reception.cancelPayment(body.id, body.reason || 'Bekor qilindi', user.id);
  }

  @Get('stays')
  stays(@Query() query: PageQueryDto & { staffId?: string }) {
    return this.admin.listStays({ q: query.q, tab: query.tab, staffId: query.staffId, ...parsePage(query) });
  }

  @Get('reports')
  @Permissions('reports.view')
  async reportsList(@Query('type') type = 'customers', @Query('from') from?: string, @Query('to') to?: string) {
    if (type === 'payments') return this.reports.paymentsReport(from, to);
    if (type === 'occupancy') return this.reports.occupancyReport();
    if (type === 'check-history') return this.reports.checkHistoryReport(from, to);
    if (type === 'staff') return { rows: await this.admin.listStaffSimple() };
    if (type === 'debt') return this.admin.debtReport();
    return this.reports.customersReport(from, to);
  }

  @Get('reports/export/excel')
  @Permissions('reports.export')
  async excelExport(
    @Query('type') type = 'payments',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: { id: string },
  ): Promise<StreamableFile> {
    const { file } = await this.excel.admin(type, from, to);
    await this.prisma.auditLog.create({
      data: { userId: user!.id, action: 'EXCEL_EXPORT', entity: 'Report', meta: JSON.stringify({ type }) },
    });
    return file;
  }

  @Get('roles')
  roles() {
    return this.admin.listRoles();
  }

  @Get('permissions')
  permissions() {
    return ALL_PERMISSIONS;
  }

  @Put('roles/:id/permissions')
  @Permissions('roles.manage')
  saveRolePerms(@Param('id') id: string, @Body() body: RolePermissionsDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    return this.admin.saveRolePermissions(id, body.permissions, user.id, ip);
  }

  @Get('audit-logs')
  @Permissions('audit.view')
  audit(@Query() query: PageQueryDto) {
    return this.admin.listAudit({ q: query.q, ...parsePage(query) });
  }

  @Get('settings')
  settings() {
    return this.admin.getSettingsMap();
  }

  @Put('settings')
  @Permissions('settings.manage')
  saveSettings(@Body() body: SettingsDto, @CurrentUser() user: { id: string }, @Ip() ip: string) {
    const values = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as Record<string, string>;
    return this.admin.saveSettings(values, user.id, ip);
  }

  @Get('backups')
  @Permissions('backup.manage')
  backups() {
    return this.admin.listBackups();
  }

  @Post('backups')
  @HttpCode(201)
  @Permissions('backup.manage')
  createBackup(@CurrentUser() user: { id: string }) {
    return this.admin.createBackup(user.id);
  }

  @Post('backups/:id/restore')
  @Permissions('backup.manage')
  restore(@Body() body: RestoreDto, @CurrentUser() user: { id: string }) {
    return this.admin.confirmRestore(user.id, body.password);
  }

  @Get('health')
  health() {
    return this.admin.health();
  }

  @Get('system/health')
  systemHealth() {
    return this.admin.health();
  }
}
