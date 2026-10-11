import { OrderStatus as OrderStatusDto } from '@prisma/client';
import { IsUUID, IsIn, ArrayMaxSize } from 'class-validator';
import { IsEntityId } from '../../common/dto/entity-id';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export { OrderStatusDto };

export class CreateOrderItemDto {
  @IsEntityId()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  requestId!: string;

  @IsIn(['DINHEIRO', 'PIX', 'CARTAO', 'PRAZO'])
  paymentMethod!: string;
  @IsEntityId()
  clientId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusDto)
  status!: OrderStatusDto;
}
