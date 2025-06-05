import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WalletRepository } from './wallet.repository';
import { Wallet } from '@prisma/client';
import { ExternalApiService } from './external-api.service';

@Injectable()
export class WalletService {
  constructor(
    private walletRepository: WalletRepository,
    private externalApiService: ExternalApiService,
  ) {}

  async getBalance(userId: string): Promise<Partial<Wallet>> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }
    return { balance: wallet.balance };
  }

  async deposit(email: string, amount: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserEmail(email);

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.walletRepository.deposit(wallet.id!, amount);
  }

  async requestDebin(email: string, amount: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserEmail(email);

    if (!wallet || !wallet.id) {
      throw new NotFoundException('Wallet not found for this user');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    try {
      const debinResponse = await this.externalApiService.requestDebin(
        email,
        amount,
      );

      if (!debinResponse.success) {
        throw new BadRequestException(
          'Failed to process DEBIN request: ' + debinResponse.message,
        );
      }

      return this.walletRepository.deposit(wallet.id, amount);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new BadRequestException(errorMessage);
    }
  }
}
