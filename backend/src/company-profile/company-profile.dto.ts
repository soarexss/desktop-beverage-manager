import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { STATES, TAX_REGIMES } from './company-validation';

export class SaveCompanyProfileDto {
  @IsString() @MinLength(2) @MaxLength(150) legalName!: string;
  @IsString() @MinLength(2) @MaxLength(150) tradeName!: string;
  @IsString() @MaxLength(20) document!: string;
  @IsOptional() @IsString() @MaxLength(30) stateRegistration?: string;
  @IsOptional() @IsString() @MaxLength(30) municipalRegistration?: string;
  @IsIn(Object.keys(TAX_REGIMES)) taxRegime!: keyof typeof TAX_REGIMES;
  @Matches(/^\d{7}$/) primaryCnae!: string;
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Matches(/^\d{7}$/, { each: true })
  secondaryCnaes!: string[];
  @IsString() @MinLength(5) @MaxLength(250) address!: string;
  @IsString() @MinLength(2) @MaxLength(60) city!: string;
  @IsIn(STATES) state!: string;
  @Matches(/^\d{7}$/) municipalityCode!: string;
  @Matches(/^\d{8}$/) postalCode!: string;
  @IsBoolean() pixEnabled!: boolean;
  @IsOptional() @IsString() @MaxLength(77) pixKey?: string;
  @IsOptional() @IsString() @MaxLength(100) pixMerchantName?: string;
  @IsOptional() @IsString() @MaxLength(60) pixMerchantCity?: string;
}
