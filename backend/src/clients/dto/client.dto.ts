import { PartialType } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
  @IsString()
  notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientPurchaseHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
