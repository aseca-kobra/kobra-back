import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  ExternalWalletOperationDto,
  WalletOperationDto,
} from './dto/wallet.dto';
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
  // We could add an API key guard here if needed
  async deposit(@Body() dto: ExternalWalletOperationDto): Promise<Wallet> {
    return this.walletService.deposit(dto.email, dto.amount);
  }

  @Post('debin')
  @UseGuards(JwtAuthGuard)
  async requestDebin(
    @Body() dto: WalletOperationDto,
    @Request() req: RequestWithUser,
  ): Promise<Wallet> {
    return this.walletService.requestDebin(req.user.email, dto.amount);
  }
}
