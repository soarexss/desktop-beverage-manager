import { DeliveryStatus as DeliveryStatusDto } from '@prisma/client';
import { IsEntityId } from '../../common/dto/entity-id';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export { DeliveryStatusDto };

export class AssignDeliveryDto {
  @IsEntityId()
  orderId!: string;

  @IsEntityId()
  deliveryPersonId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatusDto)
  status!: DeliveryStatusDto;

  @IsOptional()
  @IsString()
  proofUrl?: string;
}
