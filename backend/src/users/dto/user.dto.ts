import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsByteLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(12)
  @IsByteLength(0, 72)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
