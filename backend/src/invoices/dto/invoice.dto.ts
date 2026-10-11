import { InvoiceStatus as InvoiceStatusDto } from '@prisma/client';
import { IsEntityId } from '../../common/dto/entity-id';
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export { InvoiceStatusDto };

export class CreateInvoiceDto {
  @IsEntityId()
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
