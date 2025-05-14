import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Wallet } from '@prisma/client';

@Injectable()
export class WalletRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    return user?.wallet ?? null;
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

  async extract(walletId: string, amount: number): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.WITHDRAWAL,
          walletId,
        },
      });

      return updatedWallet;
    });
  }
}
