import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletRepository } from './wallet.repository';
import { ExternalApiService } from './external-api.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, ExternalApiService],
  exports: [WalletService],
})
export class WalletModule {}
