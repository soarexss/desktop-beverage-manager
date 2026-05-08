import { PartialType } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export enum InvoiceStatusDto {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  AUTHORIZED = "AUTHORIZED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export class CreateInvoiceDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  xmlContent?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsOptional()
  @IsEnum(InvoiceStatusDto)
  status?: InvoiceStatusDto;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  accessKey?: string;
}
