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
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
  RENEGOTIATED = "RENEGOTIATED",
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalAmount?: number;

  @IsOptional()
  @IsString()
  documentNumber?: string;

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

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  paymentMethodName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  installmentNumber?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalInstallments?: number = 1;
}

export class UpdateFinancialTransactionDto extends PartialType(
  CreateFinancialTransactionDto,
) {}

export class CreateFinancialTitleDto extends CreateFinancialTransactionDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  installments?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalDays?: number = 30;
}

export class SettleFinancialTransactionDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsString()
  methodName!: string;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateChartAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(FinancialTypeDto)
  type!: FinancialTypeDto;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateCostCenterDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
