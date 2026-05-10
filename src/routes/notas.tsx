import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileText, Send, Settings, X } from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { datePt, money } from "@/lib/format";

export const Route = createFileRoute("/notas")({ component: Notas });

type Invoice = {
  id: string;
  status: "PENDING" | "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED";
  number?: string | null;
  accessKey?: string | null;
  rejectionReason?: string | null;
  issuedAt: string;
  order: {
    id: string;
    totalAmount: string | number;
    client: { tradeName: string; document: string };
  };
};

type Order = {
  id: string;
  totalAmount: string | number;
  client: { tradeName: string; document: string };
  items: Array<{ product: { name: string }; quantity: string | number; totalPrice: string | number }>;
};

function Notas() {
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState("");
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => apiGet<Invoice[]>("/invoices") });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/orders") });
  const selectedOrder = orders.data?.find((order) => order.id === orderId);

  const createInvoice = useMutation({
    mutationFn: () => apiPost<Invoice>("/invoices", { orderId, externalReference: `NFE-${Date.now()}` }),
    onSuccess: () => {
      setOrderId("");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const counts = {
    authorized: (invoices.data ?? []).filter((invoice) => invoice.status === "AUTHORIZED").length,
    processing: (invoices.data ?? []).filter((invoice) => invoice.status === "PROCESSING" || invoice.status === "PENDING").length,
    rejected: (invoices.data ?? []).filter((invoice) => invoice.status === "REJECTED").length,
    cancelled: (invoices.data ?? []).filter((invoice) => invoice.status === "CANCELLED").length,
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Autorizadas", counts.authorized, "success"],
          ["Processando", counts.processing, "info"],
          ["Rejeitadas", counts.rejected, "danger"],
          ["Canceladas", counts.cancelled, "muted"],
        ].map(([label, value, kind]) => (
          <div key={label as string} className="erp-panel p-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <StatusBadge kind={kind as never}>NFe</StatusBadge>
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-7" title="Notas fiscais emitidas" actions={
        <div className="flex gap-1.5">
          <button className="erp-btn"><Settings className="h-3.5 w-3.5" />Config. fiscal</button>
          <button className="erp-btn erp-btn-primary" onClick={() => orderId && createInvoice.mutate()} disabled={!orderId || createInvoice.isPending}><FileText className="h-3.5 w-3.5" />Emitir NFe</button>
        </div>
      } bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Numero</th><th>Pedido</th><th>Destinatario</th><th>Emissao</th><th className="text-right">Valor</th><th>Status</th><th>Acoes</th></tr></thead>
          <tbody>
            {(invoices.data ?? []).map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-mono">{invoice.number ?? invoice.id.slice(-8)}</td>
                <td className="font-mono">{invoice.order.id.slice(-6)}</td>
                <td>{invoice.order.client.tradeName}</td>
                <td>{datePt(invoice.issuedAt)}</td>
                <td className="text-right font-semibold tabular-nums">{money(invoice.order.totalAmount)}</td>
                <td><StatusBadge kind={invoice.status === "REJECTED" ? "danger" : invoice.status === "AUTHORIZED" ? "success" : "info"}>{invoice.status}</StatusBadge></td>
                <td>
                  <div className="flex gap-0.5">
                    <button className="erp-btn px-1.5 py-0.5" title="XML"><Download className="h-3 w-3" /></button>
                    <button className="erp-btn px-1.5 py-0.5" title="DANFE"><FileText className="h-3 w-3" /></button>
                    <button className="erp-btn px-1.5 py-0.5 text-destructive" title="Cancelar"><X className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Emissao de NFe / NFCe">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Modelo"><select className="erp-input"><option>NFe (55)</option><option>NFCe (65)</option></select></Field>
          <Field label="Natureza"><select className="erp-input"><option>Venda de mercadoria</option><option>Devolucao</option><option>Transferencia</option></select></Field>
        </div>
        <Field label="Pedido vinculado">
          <select className="erp-input" value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            <option value="">Selecione um pedido</option>
            {(orders.data ?? []).filter((order) => !(invoices.data ?? []).some((invoice) => invoice.order.id === order.id)).map((order) => (
              <option key={order.id} value={order.id}>{order.id.slice(-6)} - {order.client.tradeName} - {money(order.totalAmount)}</option>
            ))}
          </select>
        </Field>
        {selectedOrder && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Destinatario"><input className="erp-input" value={selectedOrder.client.tradeName} readOnly /></Field>
              <Field label="CNPJ/CPF"><input className="erp-input font-mono" value={selectedOrder.client.document} readOnly /></Field>
            </div>
            <div className="mt-2 erp-label">Itens</div>
            <table className="erp-table">
              <thead><tr><th>Produto</th><th>Qtd</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map((item, index) => (
                  <tr key={index}><td>{item.product.name}</td><td>{Number(item.quantity)}</td><td className="text-right tabular-nums">{money(item.totalPrice)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-[12px]">
              <div><span className="text-muted-foreground">ICMS</span><div className="font-bold tabular-nums">{money(Number(selectedOrder.totalAmount) * 0.18)}</div></div>
              <div><span className="text-muted-foreground">PIS/COFINS</span><div className="font-bold tabular-nums">{money(Number(selectedOrder.totalAmount) * 0.0925)}</div></div>
              <div><span className="text-muted-foreground">Total NFe</span><div className="font-bold tabular-nums text-accent">{money(selectedOrder.totalAmount)}</div></div>
            </div>
            <button className="erp-btn erp-btn-primary mt-3 w-full justify-center" onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
              <Send className="h-3.5 w-3.5" />Criar nota pendente
            </button>
          </>
        )}
      </Panel>
    </div>
  );
}
