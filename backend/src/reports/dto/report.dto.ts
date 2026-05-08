import { IsDateString, IsOptional } from "class-validator";

export class DateRangeReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
