import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { serializable } from '../common/transaction';
import { ImportNfeDto } from './fiscal-imports.dto';
import { parseNfe } from './nfe-parser';

@Injectable()
export class FiscalImportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async company(recipient: string) {
    const company = await this.prisma.company.findUnique({
      where: { operationalKey: 'PRIMARY' },
    });
    if (!company)
      throw new BadRequestException('Configure primeiro o CNPJ da empresa');
    if (company.document !== recipient)
      throw new BadRequestException(
        'O destinatário da nota não corresponde ao CNPJ configurado',
      );
    return company;
  }

  async preview(xml: string) {
    const note = parseNfe(xml);
    await this.company(note.recipientDocument);
    const [existing, candidates] = await Promise.all([
      this.prisma.fiscalImport.findUnique({
        where: { accessKey: note.accessKey },
        select: { purchaseOrderId: true },
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          barcode: {
            in: note.items.flatMap((item) =>
              item.barcode ? [item.barcode] : [],
            ),
          },
        },
        select: { id: true, name: true, barcode: true },
      }),
    ]);
    return {
      ...note,
      existingPurchaseId: existing?.purchaseOrderId ?? null,
      authenticity: 'NOT_VERIFIED',
      items: note.items.map((item) => ({
        ...item,
        candidates: candidates.filter(
          (product) => product.barcode === item.barcode,
        ),
      })),
    };
  }

  async import(dto: ImportNfeDto, actorId: string) {
    const note = parseNfe(dto.xmlContent);
    await this.company(note.recipientDocument);
    if (
      dto.items.length !== note.items.length ||
      new Set(dto.items.map((item) => item.line)).size !== note.items.length
    )
      throw new BadRequestException('Mapeie todos os itens exatamente uma vez');
    const dueDate = new Date(dto.dueDate);
    if (!Number.isFinite(dueDate.getTime()))
      throw new BadRequestException('Vencimento inválido');
    const xmlHash = createHash('sha256')
      .update(dto.xmlContent, 'utf8')
      .digest('hex');
    return serializable(this.prisma, async (tx) => {
      // Coordinate with the company setup so a CNPJ cannot change while accepting a document.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(48276019)::text`;
      const company = await tx.company.findUnique({
        where: { operationalKey: 'PRIMARY' },
      });
      if (!company || company.document !== note.recipientDocument)
        throw new ConflictException(
          'Configuração da empresa alterada; confira a nota novamente',
        );
      const previous = await tx.fiscalImport.findUnique({
        where: { accessKey: note.accessKey },
        include: { purchaseOrder: true },
      });
      if (previous) {
        if (previous.xmlHash !== xmlHash)
          throw new ConflictException(
            'Esta chave já foi importada com outro conteúdo; concilie a nota existente',
          );
        return {
          purchaseOrderId: previous.purchaseOrderId,
          alreadyImported: true,
        };
      }
      if (
        await tx.purchaseOrder.findFirst({
          where: {
            OR: [{ accessKey: note.accessKey }, { requestId: dto.requestId }],
          },
        })
      )
        throw new ConflictException(
          'Chave ou identificador já utilizados em outra compra; concilie antes de importar',
        );
      const supplier = await tx.registryEntry.upsert({
        where: { type_code: { type: 'SUPPLIER', code: note.issuerDocument } },
        create: {
          type: 'SUPPLIER',
          code: note.issuerDocument,
          name: note.supplierName,
        },
        update: {},
      });
      const items: Prisma.PurchaseOrderItemCreateWithoutPurchaseOrderInput[] =
        [];
      for (const item of note.items) {
        const mapping = dto.items.find(
          (candidate) => candidate.line === item.line,
        );
        if (!mapping) throw new BadRequestException('Item da nota sem vínculo');
        const quantity = new Prisma.Decimal(item.quantity).mul(
          mapping.stockFactor,
        );
        if (
          quantity.decimalPlaces() > 3 ||
          quantity.lessThanOrEqualTo(0) ||
          quantity.greaterThan('999999999.999')
        )
          throw new BadRequestException(
            `Item ${item.line}: ajuste a conversão para quantidade com até 3 casas decimais`,
          );
        const unitCost = new Prisma.Decimal(item.total)
          .div(quantity)
          .toDecimalPlaces(2);
        if (unitCost.greaterThan('9999999999.99'))
          throw new BadRequestException(
            'Conversão excede o limite de custo unitário',
          );
        let productId = mapping.productId;
        if (productId) {
          if (mapping.newSku || mapping.salePrice !== undefined)
            throw new BadRequestException(
              'Escolha produto existente ou criação, sem misturar os dois',
            );
          const product = await tx.product.findUnique({
            where: { id: productId },
          });
          if (!product?.isActive)
            throw new BadRequestException(
              `Produto do item ${item.line} indisponível`,
            );
          if (product.trackBatch && (!item.batchNumber || !item.expiresAt))
            throw new BadRequestException(
              `Item ${item.line}: produto exige lote/validade; este XML não informa ambos`,
            );
        } else {
          if (
            !mapping.newSku?.trim() ||
            !mapping.stockUnit?.trim() ||
            mapping.salePrice === undefined
          )
            throw new BadRequestException(
              `Item ${item.line}: selecione produto ou informe SKU e preço de venda para cadastrar`,
            );
          if (
            await tx.product.findUnique({
              where: { sku: mapping.newSku.trim() },
            })
          )
            throw new ConflictException(
              `SKU ${mapping.newSku} já existe; selecione o produto cadastrado`,
            );
          const ncm = await tx.registryEntry.upsert({
            where: { type_code: { type: 'NCM_CODE', code: item.ncm } },
            create: { type: 'NCM_CODE', code: item.ncm, name: item.ncm },
            update: {},
          });
          const unit = await tx.registryEntry.upsert({
            where: {
              type_code: {
                type: 'UNIT',
                code: mapping.stockUnit.trim().toUpperCase(),
              },
            },
            create: {
              type: 'UNIT',
              code: mapping.stockUnit.trim().toUpperCase(),
              name: mapping.stockUnit.trim().toUpperCase(),
            },
            update: {},
          });
          // The supplier's outgoing CFOP is preserved in the XML, never copied as a sales tax rule.
          const product = await tx.product.create({
            data: {
              sku: mapping.newSku.trim(),
              name: item.name,
              barcode: item.barcode,
              ncmId: ncm.id,
              unitId: unit.id,
              price: mapping.salePrice,
              cost: unitCost,
              minStock: 0,
              trackBatch: Boolean(item.batchNumber && item.expiresAt),
            },
          });
          productId = product.id;
        }
        if (
          item.expiresAt &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(item.expiresAt) ||
            !Number.isFinite(Date.parse(item.expiresAt)) ||
            new Date(item.expiresAt).toISOString().slice(0, 10) !==
              item.expiresAt)
        )
          throw new BadRequestException('Validade de lote inválida');
        items.push({
          product: { connect: { id: productId } },
          quantity,
          unitCost,
          totalCost: item.total,
          batchNumber: item.batchNumber,
          expiresAt: item.expiresAt
            ? new Date(`${item.expiresAt}T00:00:00Z`)
            : null,
        });
      }
      const purchase = await tx.purchaseOrder.create({
        data: {
          requestId: dto.requestId,
          supplierId: supplier.id,
          supplierName: note.supplierName,
          invoiceNumber: `${note.number}/${note.series}`,
          accessKey: note.accessKey,
          subtotal: note.subtotal,
          freightAmount: note.freightAmount,
          discountAmount: note.discountAmount,
          totalAmount: note.totalAmount,
          dueDate,
          status: 'DRAFT',
          createdById: actorId,
          items: { create: items },
          fiscalImport: {
            create: {
              accessKey: note.accessKey,
              xmlHash,
              xmlContent: dto.xmlContent,
              company: { connect: { id: company.id } },
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'fiscal.import.xml',
          entityType: 'purchase_order',
          entityId: purchase.id,
          metadata: {
            xmlHash,
            authenticity: 'OPERATOR_CHECKED',
            items: items.length,
          },
        },
      });
      return { purchaseOrderId: purchase.id, alreadyImported: false };
    });
  }

  async xml(purchaseOrderId: string, actorId: string) {
    const imported = await this.prisma.fiscalImport.findUnique({
      where: { purchaseOrderId },
      select: { xmlContent: true, accessKey: true },
    });
    if (!imported) throw new NotFoundException('Compra sem XML importado');
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'fiscal.import.download',
        entityType: 'purchase_order',
        entityId: purchaseOrderId,
      },
    });
    return imported;
  }
}
