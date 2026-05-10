import { PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  subgroupId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  ncmId?: string;

  @IsOptional()
  @IsString()
  cfopId?: string;

  @IsOptional()
  @IsString()
  taxCategoryId?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsInt()
  @Min(0)
  minStock!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsBoolean()
  trackBatch!: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
