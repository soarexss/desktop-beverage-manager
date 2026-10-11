import { Prisma, PrismaClient } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

export async function serializable<T>(
  prisma: PrismaClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !['P2034', 'P2002'].includes(error.code)
      )
        throw error;
      if (attempt === 3)
        throw new ConflictException(
          'Operação concorrente. Atualize e tente novamente.',
        );
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw new ConflictException('Não foi possível concluir a operação.');
}

export async function stockInTransaction(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const movements = await tx.inventoryMovement.groupBy({
    by: ['type'],
    where: { productId },
    _sum: { quantity: true },
  });
  return movements.reduce(
    (sum, item) =>
      item.type === 'OUTBOUND'
        ? sum.minus(item._sum.quantity ?? 0)
        : sum.plus(item._sum.quantity ?? 0),
    new Prisma.Decimal(0),
  );
}
