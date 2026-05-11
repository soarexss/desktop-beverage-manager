import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export enum InventoryMovementTypeDto {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  ADJUSTMENT = "ADJUSTMENT",
}

export class CreateInventoryMovementDto {
  @IsUUID()
  productId!: string;

  @IsEnum(InventoryMovementTypeDto)
  type!: InventoryMovementTypeDto;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateProductBarcodeDto {
  @IsUUID()
  productId!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  type?: string = "EAN";

  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateInventoryCountSessionDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddInventoryCountItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  countedQty!: number;
}

export class CreateInventoryReservationDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
