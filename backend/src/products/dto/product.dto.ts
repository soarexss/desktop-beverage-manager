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

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsInt()
  @Min(0)
  minStock!: number;

  @IsBoolean()
  trackBatch!: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
