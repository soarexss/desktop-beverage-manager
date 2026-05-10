import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ProductPriceItemDto {
  @IsUUID()
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
  @IsUUID()
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
  @IsOptional()
  @IsUUID()
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

export class CreatePaymentDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  financialTransactionId?: string;

  @IsOptional()
  @IsUUID()
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
  @IsUUID()
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
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsNumber()
  @Min(0)
  percentage!: number;
}
