import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WalletRepository } from './wallet.repository';
import { Wallet } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private walletRepository: WalletRepository) {}

  async getBalance(userId: string): Promise<Partial<Wallet>> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }
    return { balance: wallet.balance };
  }

  async deposit(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    return this.walletRepository.deposit(wallet.id, amount);
  }
}
