import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsRepository } from "./products.repository";

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.productsRepository.findAll();
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser) {
    const product = await this.productsRepository.create({ ...dto });
    await this.auditService.logAction({
      actorId: user.sub,
      action: "products.create",
      entityType: "product",
      entityId: product.id,
    });
    return product;
  }

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser) {
    await this.findOne(id);
    const product = await this.productsRepository.update(id, { ...dto });
    await this.auditService.logAction({
      actorId: user.sub,
      action: "products.update",
      entityType: "product",
      entityId: id,
    });
    return product;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.findOne(id);
    await this.productsRepository.remove(id);
    await this.auditService.logAction({
      actorId: user.sub,
      action: "products.delete",
      entityType: "product",
      entityId: id,
    });
    return { message: "Product removed" };
  }
}
