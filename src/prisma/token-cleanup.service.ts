import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Adjust frequency as needed
  async cleanup() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      // 1) Find the latest token timestamp per user
      const latestPerUser = await tx.refreshToken.groupBy({
        by: ['userId'],
        _max: { createdAt: true },
      });

      // 2) For users whose latest token is still fresh (>= cutoff),
      //    keep only that latest token (delete all others).
      //    For users whose latest token is older than cutoff,
      //    keep none (delete all).
      const keepIds: string[] = [];

      for (const row of latestPerUser) {
        const latestCreatedAt = row._max.createdAt;
        if (latestCreatedAt && latestCreatedAt >= cutoff) {
          // Get the ID of the latest token for this user
          const latestToken = await tx.refreshToken.findFirst({
            where: {
              userId: row.userId,
              createdAt: latestCreatedAt,
            },
            select: { id: true },
          });
          if (latestToken?.id) keepIds.push(latestToken.id);
        }
      }

      // 3) Delete everything that is NOT in keepIds
      //    - This removes all tokens older than 2h
      //    - Also removes any extra tokens (even if < 2h), keeping max 1 per user
      const { count } = await tx.refreshToken.deleteMany({
        where: {
          id: { notIn: keepIds },
        },
      });

      if (count > 0) {
        this.logger.log(
          `Deleted ${count} tokens (kept latest fresh token per user).`,
        );
      }
    });
  }
}
