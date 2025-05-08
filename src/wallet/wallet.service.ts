import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';


@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }
    return { balance: user.wallet.balance };
  }

  async deposit(userId: number, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    const newBalance = user.wallet.balance + amount;
    return this.prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: newBalance },
      transactions: {
        create: {
          amount,
          type: TransactionType.INCOME,
        },
      },
    });
  }

  async extract(userId: number, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    const newBalance = user.wallet.balance - amount;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: newBalance },
    });
  }
}
