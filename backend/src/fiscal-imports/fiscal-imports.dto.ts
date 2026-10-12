import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsEntityId } from '../common/dto/entity-id';

export class PreviewNfeDto {
  @IsString() @MaxLength(524288) xmlContent!: string;
}
class NfeItemMappingDto {
  @IsInt() @Min(1) @Max(999) line!: number;
  @IsOptional() @IsEntityId() productId?: string;
  @IsOptional() @IsString() @MaxLength(80) newSku?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999)
  salePrice?: number;
  @IsOptional()
  @IsString()
  @MaxLength(6)
  stockUnit?: string;
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  @Max(1000000)
  stockFactor!: number;
}
export class ImportNfeDto extends PreviewNfeDto {
  @IsUUID('4') requestId!: string;
  @Transform(
    ({ obj }: { obj: Record<string, unknown> }) =>
      obj.authenticityChecked === true,
  )
  @Equals(true, {
    message: 'Confirme a autenticidade e o vínculo da nota com a compra',
  })
  authenticityChecked!: boolean;
  @IsDateString({ strict: true }) dueDate!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NfeItemMappingDto)
  items!: NfeItemMappingDto[];
}
