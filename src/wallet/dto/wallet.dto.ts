import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class WalletOperationDto {
  @IsUUID()
  @IsOptional()
  walletId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
