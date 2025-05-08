import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletAmountDto } from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance/:userId')
  getWallet(@Param('userId', ParseIntPipe) userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post('deposit/:userId')
  async deposit(
    @Param('userId', ParseIntPipe) userId: string,
    @Body() dto: WalletAmountDto,
  ) {
    return this.walletService.deposit(userId, dto.amount);
  }

  @Post('withdraw/:userId')
  async withdraw(
    @Param('userId', ParseIntPipe) userId: string,
    @Body() dto: WalletAmountDto,
  ) {
    return this.walletService.extract(userId, dto.amount);
  }
}
