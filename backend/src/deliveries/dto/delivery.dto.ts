import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export enum DeliveryStatusDto {
  PENDING = "PENDING",
  ASSIGNED = "ASSIGNED",
  IN_ROUTE = "IN_ROUTE",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

export class AssignDeliveryDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
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
