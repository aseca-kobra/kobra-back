import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletAmountDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';
import { Wallet } from '@prisma/client';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  getWallet(@Request() req: RequestWithUser): Promise<Partial<Wallet>> {
    return this.walletService.getBalance(req.user.userId);
  }

  @Post('deposit')
  async deposit(
    @Request() req: RequestWithUser,
    @Body() dto: WalletAmountDto,
  ): Promise<Wallet> {
    return this.walletService.deposit(req.user.userId, dto.amount);
  }

  @Post('debin')
  async requestDebin(
    @Request() req: RequestWithUser,
    @Body() dto: WalletAmountDto,
  ): Promise<Wallet> {
    return this.walletService.requestDebin(req.user.userId, dto.amount);
  }
}
