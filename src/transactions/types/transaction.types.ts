import { Transaction } from '@prisma/client';

export type TransactionWithRelatedUser = Transaction & {
  relatedUser: { email: string } | null;
};
