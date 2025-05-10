import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionOwnerGuard } from './guards/transaction-owner.guard';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
  };
}

@Controller('transactions')
@UseGuards(JwtAuthGuard, TransactionOwnerGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  transfer(@Body() createTransactionDto: CreateTransactionDto, @Request() req: RequestWithUser) {
    return this.transactionsService.create(
      createTransactionDto,
      req.user.userId,
    );
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.transactionsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.transactionsService.findOne(id, req.user.userId);
  }
}
