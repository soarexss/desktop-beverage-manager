import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { DateRangeReportDto } from "./dto/report.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("sales-summary")
  salesSummary(@Query() filters: DateRangeReportDto) {
    return this.reportsService.salesSummary(filters);
  }

  @Get("inventory-summary")
  inventorySummary() {
    return this.reportsService.inventorySummary();
  }
}
