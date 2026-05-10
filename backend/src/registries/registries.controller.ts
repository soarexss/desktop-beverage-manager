import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateRegistryEntryDto,
  RegistryQueryDto,
  UpdateRegistryEntryDto,
} from "./dto/registry.dto";
import { RegistriesService } from "./registries.service";

@Controller("registries")
export class RegistriesController {
  constructor(private readonly registriesService: RegistriesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.COMPRAS, Role.ESTOQUISTA, Role.FINANCEIRO, Role.FISCAL, Role.VENDEDOR)
  findAll(@Query() query: RegistryQueryDto) {
    return this.registriesService.findAll(query);
  }

  @Get("summary")
  @Roles(Role.ADMIN, Role.COMPRAS, Role.ESTOQUISTA, Role.FINANCEIRO, Role.FISCAL, Role.VENDEDOR)
  summary() {
    return this.registriesService.summary();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateRegistryEntryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.registriesService.create(dto, user);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRegistryEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registriesService.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.registriesService.remove(id, user);
  }
}
