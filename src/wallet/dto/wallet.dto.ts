import { IsNumber, IsPositive, IsString } from 'class-validator';

export class WalletOperationDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class ExternalWalletOperationDto extends WalletOperationDto {
  @IsString()
  email: string;
}
