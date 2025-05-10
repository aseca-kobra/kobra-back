import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransactionOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const transactionId = request.params.id;

    // If there's no transaction ID, we're either creating a new transaction
    // or listing all transactions, which are already protected by the userId
    if (!transactionId) {
      return true;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: transaction.walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new ForbiddenException('You can only access your own transactions');
    }

    return true;
  }
}
