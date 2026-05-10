import { PartialType } from "@nestjs/swagger";
import { RegistryType } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class RegistryQueryDto {
  @IsOptional()
  @IsEnum(RegistryType)
  type?: RegistryType;
}

export class CreateRegistryEntryDto {
  @IsEnum(RegistryType)
  type!: RegistryType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateRegistryEntryDto extends PartialType(CreateRegistryEntryDto) {}
