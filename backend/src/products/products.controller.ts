import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR, Role.ESTOQUISTA, Role.COMPRAS)
  findAll() {
    return this.productsService.findAll();
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR, Role.ESTOQUISTA, Role.COMPRAS)
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ESTOQUISTA, Role.COMPRAS)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.ESTOQUISTA, Role.COMPRAS)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.remove(id, user);
  }
}
