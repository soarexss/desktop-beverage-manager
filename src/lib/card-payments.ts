export type TerminalCatalog = {
  provider: string;
  name: string;
  automatic: boolean;
  models: string[];
  documentation: string | null;
};
export type PaymentTerminal = {
  id: string;
  provider: string;
  model: string;
  label: string;
  mode: "MANUAL" | "INTEGRATED";
  externalId: string | null;
  isActive: boolean;
};
export type TerminalCharge = {
  id: string;
  orderId: string;
  terminalId: string;
  amount: string;
  status: "CREATING" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "REVIEW";
  externalId: string | null;
  paymentId: string | null;
  cancellationRequested: boolean;
};
export const chargeLabels: Record<TerminalCharge["status"], string> = {
  CREATING: "Aguardando retorno da criação",
  PENDING: "Aguardando pagamento na maquininha",
  PAID: "Pagamento confirmado pelo Mercado Pago",
  FAILED: "Cobrança falhou",
  CANCELLED: "Cobrança cancelada pelo provedor",
  EXPIRED: "Cobrança expirada",
  REVIEW: "Requer conferência no provedor e suporte",
};
export const chargeActive = (charge: TerminalCharge) =>
  ["CREATING", "PENDING", "REVIEW"].includes(charge.status);
