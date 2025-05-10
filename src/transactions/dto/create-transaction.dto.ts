import { IsNumber, IsPositive, IsEmail } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEmail()
  recipientEmail: string;
}
