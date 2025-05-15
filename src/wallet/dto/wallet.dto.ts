import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class WalletOperationDto {
  @IsUUID()
  @IsNotEmpty()
  walletId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
