import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Wallet } from '@prisma/client';

@Injectable()
export class WalletRepository {
  constructor(private prisma: PrismaService) {}

  async find(walletId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
  }

  async findByUserId(userId: string): Promise<Partial<Wallet> | null> {
    return this.prisma.wallet.findFirst({
      where: { userId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deposit(walletId: string, amount: number): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.DEPOSIT,
          walletId,
        },
      });

      return updatedWallet;
    });
  }
}
