import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { ROLES } from '../common/roles';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiCookieAuth('zh_access')
@ApiBearerAuth()
@Roles(ROLES.RECEPTION, ROLES.MANAGER, ROLES.SYSTEM_ADMIN)
@Controller('reminders')
export class RemindersController {
  constructor(private reminders: RemindersService) {}

  @Get()
  @ApiOperation({ summary: 'To‘lov muddati eslatmalari' })
  list(@Query('all') all?: string, @Query('take') take?: string) {
    return this.reminders.list({ onlyUnread: all !== '1', take: Number(take) || 50 });
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Barcha eslatmalarni o‘qilgan deb belgilash' })
  readAll() {
    return this.reminders.markAllRead();
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eslatmani o‘qilgan deb belgilash' })
  read(@Param('id') id: string) {
    return this.reminders.markRead(id);
  }
}
