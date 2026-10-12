import { Body, Controller, Get, Module, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ImportNfeDto, PreviewNfeDto } from './fiscal-imports.dto';
import { FiscalImportsService } from './fiscal-imports.service';

@Controller('fiscal-imports')
class FiscalImportsController {
  constructor(private readonly service: FiscalImportsService) {}
  @Post('preview')
  @Roles(Role.ADMIN, Role.COMPRAS)
  preview(@Body() dto: PreviewNfeDto) {
    return this.service.preview(dto.xmlContent);
  }
  @Post()
  @Roles(Role.ADMIN, Role.COMPRAS)
  import(@Body() dto: ImportNfeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.import(dto, user.sub);
  }
  @Get(':purchaseOrderId/xml')
  @Roles(Role.ADMIN, Role.COMPRAS, Role.FISCAL)
  xml(
    @Param('purchaseOrderId') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.xml(id, user.sub);
  }
}
@Module({
  controllers: [FiscalImportsController],
  providers: [FiscalImportsService],
})
export class FiscalImportsModule {}
