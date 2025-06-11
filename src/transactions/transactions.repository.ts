import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Transaction, User, Wallet } from '@prisma/client';

@Injectable()
export class TransactionsRepository {
  constructor(private prisma: PrismaService) {}

  async findUserWithWallet(
    userId: string,
  ): Promise<User & { wallet: Wallet | null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: { wallet: true },
    });

    if (!user?.wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    return user;
  }

  async findRecipientWithWallet(
    email: string,
  ): Promise<User & { wallet: Wallet | null }> {
    const recipient = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { wallet: true },
    });

    if (!recipient?.wallet) {
      throw new NotFoundException('Recipient not found');
    }

    return recipient;
  }

  async createTransfer(
    senderWalletId: string,
    recipientWalletId: string,
    amount: number,
    senderId: string,
    recipientId: string,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWalletId },
        data: { balance: { decrement: amount } },
      });

      await tx.wallet.update({
        where: { id: recipientWalletId },
        data: { balance: { increment: amount } },
      });

      const senderTransaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.TRANSFER_OUT,
          walletId: senderWalletId,
          relatedUserId: recipientId,
        },
      });

      await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.TRANSFER_IN,
          walletId: recipientWalletId,
          relatedUserId: senderId,
        },
      });

      return senderTransaction;
    });
  }

  async findAllByWalletId(
    walletId: string,
  ): Promise<(Transaction & { relatedUser: { email: string } | null })[]> {
    return this.prisma.transaction.findMany({
      where: {
        walletId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        relatedUser: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async findOneByWalletId(
    id: string,
    walletId: string,
  ): Promise<(Transaction & { relatedUser: { email: string } | null }) | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        walletId,
        relatedUserId: { not: null },
      },
      include: {
        relatedUser: {
          select: {
            email: true,
          },
        },
      },
    });
  }
}
