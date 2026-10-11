import { InventoryMovementType as InventoryMovementTypeDto } from '@prisma/client';
import { IsEntityId } from '../../common/dto/entity-id';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export { InventoryMovementTypeDto };

export class CreateInventoryMovementDto {
  @IsEntityId()
  productId!: string;

  @IsEnum(InventoryMovementTypeDto)
  type!: InventoryMovementTypeDto;

  @IsNumber()
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
