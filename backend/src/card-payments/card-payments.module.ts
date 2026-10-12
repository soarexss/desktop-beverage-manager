import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { OperationsModule } from '../operations/operations.module';
import { CardPaymentsController } from './card-payments.controller';
import { CardPaymentsService } from './card-payments.service';
import { PaymentConnectionsService } from './payment-connections.service';
import { PaymentSecrets } from './payment-secrets';
import { MercadoPagoClient } from './mercado-pago.client';

@Module({
  imports: [PrismaModule, OperationsModule],
  controllers: [CardPaymentsController],
  providers: [
    CardPaymentsService,
    PaymentConnectionsService,
    PaymentSecrets,
    MercadoPagoClient,
  ],
})
export class CardPaymentsModule {}
