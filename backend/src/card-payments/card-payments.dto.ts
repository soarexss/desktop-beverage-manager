import {
  Equals,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { IsEntityId } from '../common/dto/entity-id';
import { TERMINAL_CATALOG } from './terminal-catalog';

export class CreateTerminalDto {
  @IsIn(TERMINAL_CATALOG.map((entry) => entry.provider))
  provider!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  model!: string;

  @IsIn(['MANUAL', 'INTEGRATED'])
  mode!: 'MANUAL' | 'INTEGRATED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string;
}

export class TerminalActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class CreateTerminalChargeDto {
  @IsUUID('4')
  requestId!: string;

  @IsEntityId()
  orderId!: string;

  @IsEntityId()
  terminalId!: string;
}

export class OAuthCallbackDto {
  @IsString()
  @MaxLength(200)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  error?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  error_description?: string;
}

export class ManualTerminalPaymentDto extends CreateTerminalChargeDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  amount!: number;
  @Equals(true)
  confirmed!: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nsu!: string;
}
