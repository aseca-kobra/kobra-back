import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionOwnerGuard } from './guards/transaction-owner.guard';
import { TransactionsRepository } from './transactions.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsRepository,
    TransactionOwnerGuard,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
