import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletOperationDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';
import { Wallet } from '@prisma/client';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getWallet(@Request() req: RequestWithUser): Promise<Partial<Wallet>> {
    return this.walletService.getBalance(req.user.userId);
  }

  @Post('deposit')
  async deposit(@Body() dto: WalletOperationDto): Promise<Wallet> {
    return this.walletService.deposit(dto.walletId, dto.amount);
  }

  @Post('debin')
  async requestDebin(@Body() dto: WalletOperationDto): Promise<Wallet> {
    return this.walletService.requestDebin(dto.walletId, dto.amount);
  }
}
