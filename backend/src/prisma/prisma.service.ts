import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        await this.$connect();
        this.logger.log('PostgreSQL ulandi.');
        return;
      } catch {
        this.logger.warn(
          `PostgreSQL ishlamayapti (localhost:5432). Urinish ${attempt}/15. Backend papkasida npm run dev ni qayta ishga tushiring.`,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error(
      'PostgreSQL topilmadi. Avval backend papkasida npm run dev ni ishga tushiring (u Postgresni o‘zi yoqadi).',
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
