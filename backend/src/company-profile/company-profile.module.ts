import { Body, Controller, Get, Module, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { SaveCompanyProfileDto } from './company-profile.dto';
import { CompanyProfileService } from './company-profile.service';

@Controller('company-profile')
class CompanyProfileController {
  constructor(private readonly service: CompanyProfileService) {}
  @Get()
  @Roles(Role.ADMIN, Role.FISCAL)
  get() {
    return this.service.get();
  }
  @Put()
  @Roles(Role.ADMIN)
  save(
    @Body() dto: SaveCompanyProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.save(dto, user.sub);
  }
}
@Module({
  controllers: [CompanyProfileController],
  providers: [CompanyProfileService],
})
export class CompanyProfileModule {}
