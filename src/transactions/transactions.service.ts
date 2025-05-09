import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, Wallet, User } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  private async findUserWithWallet(userId: string): Promise<User & { wallet: Wallet | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user?.wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    return user;
  }

  private async findRecipientWithWallet(email: string): Promise<User & { wallet: Wallet | null }> {
    const recipient = await this.prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!recipient?.wallet) {
      throw new NotFoundException('Recipient not found');
    }

    return recipient;
  }

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const sender = await this.findUserWithWallet(userId);
    const recipient = await this.findRecipientWithWallet(createTransactionDto.recipientEmail);

    if (sender.wallet!.balance < createTransactionDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update sender's wallet
      await tx.wallet.update({
        where: { id: sender.wallet!.id },
        data: { balance: { decrement: createTransactionDto.amount } },
      });

      // Update recipient's wallet
      await tx.wallet.update({
        where: { id: recipient.wallet!.id },
        data: { balance: { increment: createTransactionDto.amount } },
      });

      // Create sender's transaction record
      const senderTransaction = await tx.transaction.create({
        data: {
          amount: createTransactionDto.amount,
          type: TransactionType.TRANSFER_OUT,
          walletId: sender.wallet!.id,
        },
      });

      // Create recipient's transaction record
      await tx.transaction.create({
        data: {
          amount: createTransactionDto.amount,
          type: TransactionType.TRANSFER_IN,
          walletId: recipient.wallet!.id,
        },
      });

      return senderTransaction;
    });
  }

  async findAll(userId: string) {
    const user = await this.findUserWithWallet(userId);

    return this.prisma.transaction.findMany({
      where: { walletId: user.wallet!.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const user = await this.findUserWithWallet(userId);

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id,
        walletId: user.wallet!.id,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ) {
    await this.findOne(id, userId);

    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}
