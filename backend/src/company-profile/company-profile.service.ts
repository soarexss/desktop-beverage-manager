import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serializable } from '../common/transaction';
import { pixPayload } from '../orders/pix.service';
import { SaveCompanyProfileDto } from './company-profile.dto';
import { normalizeCnpj, TAX_REGIMES, validCnpj } from './company-validation';

const profileFields = {
  id: true,
  legalName: true,
  tradeName: true,
  document: true,
  stateRegistration: true,
  municipalRegistration: true,
  taxRegime: true,
  primaryCnae: true,
  secondaryCnaes: true,
  address: true,
  city: true,
  state: true,
  municipalityCode: true,
  postalCode: true,
  pixEnabled: true,
  pixKey: true,
  pixMerchantName: true,
  pixMerchantCity: true,
} as const;

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}
  async get() {
    const company = await this.prisma.company.findUnique({
      where: { operationalKey: 'PRIMARY' },
      select: profileFields,
    });
    return company
      ? {
          ...company,
          crt: TAX_REGIMES[company.taxRegime as keyof typeof TAX_REGIMES],
          fiscalEmissionEnabled: false,
        }
      : null;
  }

  async save(dto: SaveCompanyProfileDto, actorId: string) {
    const document = normalizeCnpj(dto.document);
    if (!validCnpj(document))
      throw new BadRequestException(
        'CNPJ inválido; confira os dígitos verificadores',
      );
    if (dto.pixEnabled) {
      if (!dto.pixKey || !dto.pixMerchantName || !dto.pixMerchantCity)
        throw new BadRequestException(
          'Informe chave, nome e cidade do recebedor Pix',
        );
      pixPayload(
        dto.pixKey,
        dto.pixMerchantName,
        dto.pixMerchantCity,
        '1.00',
        'CONFIG',
      );
    }
    await serializable(this.prisma, async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(48276019)::text`;
      const current = await tx.company.findUnique({
        where: { operationalKey: 'PRIMARY' },
      });
      if (
        current &&
        current.document !== document &&
        (await tx.fiscalImport.count({ where: { companyId: current.id } }))
      ) {
        throw new BadRequestException(
          'Empresa com notas importadas: utilize outra instância para outro CNPJ',
        );
      }
      const sameDocument = await tx.company.findUnique({ where: { document } });
      if (current && sameDocument && current.id !== sameDocument.id)
        throw new BadRequestException('CNPJ já cadastrado em outra empresa');
      const data = { ...dto, document, operationalKey: 'PRIMARY' };
      const company =
        current || sameDocument
          ? await tx.company.update({
              where: { id: (current ?? sameDocument)!.id },
              data,
            })
          : await tx.company.create({ data });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'company.profile.save',
          entityType: 'company',
          entityId: company.id,
          metadata: { taxRegime: dto.taxRegime, pixEnabled: dto.pixEnabled },
        },
      });
    });
    return this.get();
  }
}
