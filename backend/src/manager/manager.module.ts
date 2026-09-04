import { Module, forwardRef } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [forwardRef(() => ReportsModule)],
  controllers: [ManagerController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}
