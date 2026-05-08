import { PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export enum FinancialTypeDto {
  RECEIVABLE = "RECEIVABLE",
  PAYABLE = "PAYABLE",
}

export enum FinancialStatusDto {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

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
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class UpdateFinancialTransactionDto extends PartialType(
  CreateFinancialTransactionDto,
) {}
