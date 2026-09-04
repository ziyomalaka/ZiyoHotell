import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExcelService } from './excel.service';
import { ManagerModule } from '../manager/manager.module';

@Module({
  imports: [forwardRef(() => ManagerModule)],
  providers: [ReportsService, ExcelService],
  exports: [ReportsService, ExcelService],
})
export class ReportsModule {}
