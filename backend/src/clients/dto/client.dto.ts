import { PartialType } from "@nestjs/swagger";
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateClientDto {
  @IsString()
  tradeName!: string;

  @IsString()
  legalName!: string;

  @IsString()
  @MaxLength(18)
  document!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsUUID()
  activityProfileId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number = 0;

  @IsOptional()
  @IsString()
  status?: string = "ACTIVE";

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientPurchaseHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
