import { TransactionType } from '@prisma/client';

export class Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  createdAt: Date;
  updatedAt: Date;
  walletId: string;
  relatedUserId?: string;
}
