import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TokenCleanupService } from './token-cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';

@Global() // optional: makes PrismaService visible everywhere without repeated imports
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PrismaService, TokenCleanupService],
  exports: [PrismaService, TokenCleanupService],
})
export class PrismaModule {}
