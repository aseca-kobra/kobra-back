import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from '@prisma/client';
import { TransactionWithRelatedUser } from './types/transaction.types';

@Injectable()
export class TransactionsService {
  constructor(private transactionsRepository: TransactionsRepository) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    const sender = await this.transactionsRepository.findUserWithWallet(userId);
    const recipient = await this.transactionsRepository.findRecipientWithWallet(
      createTransactionDto.recipientEmail,
    );
    if (!sender || !recipient) {
      throw new NotFoundException('Sender or recipient inactive or not found');
    }

    if (sender.wallet!.balance < createTransactionDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }
    if (recipient.email === sender.email) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    return this.transactionsRepository.createTransfer(
      sender.wallet!.id,
      recipient.wallet!.id,
      createTransactionDto.amount,
      sender.id,
      recipient.id,
    );
  }

  async findAll(userId: string): Promise<TransactionWithRelatedUser[]> {
    const user = await this.transactionsRepository.findUserWithWallet(userId);
    return this.transactionsRepository.findAllByWalletId(user.wallet!.id);
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<TransactionWithRelatedUser> {
    const user = await this.transactionsRepository.findUserWithWallet(userId);
    const transaction = await this.transactionsRepository.findOneByWalletId(
      id,
      user.wallet!.id,
    );

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }
}
