import { CashMovementType as CashMovementTypeDto } from '@prisma/client';
import { IsUUID, ArrayMaxSize, Max } from 'class-validator';
import { IsEntityId } from '../../common/dto/entity-id';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export { CashMovementTypeDto };

export class ProductPriceItemDto {
  @IsEntityId()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  price!: number;
}

export class CreatePriceTableDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marginPercent?: number = 0;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceItemDto)
  items?: ProductPriceItemDto[];
}

export class PurchaseOrderItemDto {
  @IsEntityId()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  requestId!: string;
  @IsOptional()
  @IsEntityId()
  supplierId?: string;

  @IsString()
  supplierName!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  accessKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightAmount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsOptional()
  @IsBoolean()
  receiveNow?: boolean = false;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}

export class OpenCashSessionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number = 0;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @IsNumber()
  @Min(0)
  closingBalance!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCashMovementDto {
  @IsString()
  cashSessionId!: string;

  @IsEnum(CashMovementTypeDto)
  type!: CashMovementTypeDto;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  methodName?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreatePaymentDto {
  @IsUUID()
  requestId!: string;
  @IsOptional()
  @IsEntityId()
  orderId?: string;

  @IsOptional()
  @IsEntityId()
  financialTransactionId?: string;

  @IsOptional()
  @IsEntityId()
  methodId?: string;

  @IsString()
  methodName!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  nsu?: string;
}

export class CreateBankAccountDto {
  @IsString()
  name!: string;

  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsNumber()
  balance?: number = 0;
}

export class CreateBankReconciliationDto {
  @IsEntityId()
  bankAccountId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;
}

export class CreateCommissionDto {
  @IsEntityId()
  orderId!: string;

  @IsOptional()
  @IsEntityId()
  sellerId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}
