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

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  getWallet(@Request() req) {
    return this.walletService.getBalance(req.user.userId);
  }

  @Post('deposit')
  async deposit(@Request() req, @Body() dto: WalletAmountDto) {
    return this.walletService.deposit(req.user.userId, dto.amount);
  }

  @Post('withdraw')
  async withdraw(@Request() req, @Body() dto: WalletAmountDto) {
    return this.walletService.extract(req.user.userId, dto.amount);
  }
}
