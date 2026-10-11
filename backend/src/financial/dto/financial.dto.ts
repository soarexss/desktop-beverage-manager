import { FinancialStatus as FinancialStatusDto } from '@prisma/client';
import { FinancialType as FinancialTypeDto } from '@prisma/client';
import { IsEntityId } from '../../common/dto/entity-id';
import { PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export { FinancialTypeDto };

export { FinancialStatusDto };

export class CreateFinancialTransactionDto {
  @IsEnum(FinancialTypeDto)
  type!: FinancialTypeDto;

  @IsEnum(FinancialStatusDto)
  @IsOptional()
  status?: FinancialStatusDto = FinancialStatusDto.PENDING;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  description!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsEntityId()
  clientId?: string;

  @IsOptional()
  @IsEntityId()
  orderId?: string;
}

export class UpdateFinancialTransactionDto extends PartialType(
  CreateFinancialTransactionDto,
) {}
