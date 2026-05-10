import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Phone, Truck, User } from "lucide-react";
import { Panel, StatusBadge } from "@/components/erp";
import { apiGet } from "@/lib/api";
import { datePt } from "@/lib/format";

export const Route = createFileRoute("/entregas")({ component: Entregas });

type Delivery = {
  id: string;
  status: "PENDING" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "FAILED";
  notes?: string | null;
  assignedAt?: string | null;
  deliveredAt?: string | null;
  deliveryPerson: { name: string };
  order: {
    id: string;
    client: { tradeName: string; phone?: string | null; address: string };
  };
};

function Entregas() {
  const deliveries = useQuery({ queryKey: ["deliveries"], queryFn: () => apiGet<Delivery[]>("/deliveries") });
  const selected = deliveries.data?.[0];
  const counts = {
    pending: (deliveries.data ?? []).filter((item) => item.status === "PENDING" || item.status === "ASSIGNED").length,
    route: (deliveries.data ?? []).filter((item) => item.status === "IN_ROUTE").length,
    delivered: (deliveries.data ?? []).filter((item) => item.status === "DELIVERED").length,
    failed: (deliveries.data ?? []).filter((item) => item.status === "FAILED").length,
  };
  const iconClasses: Record<string, string> = {
    warning: "text-warning-foreground",
    info: "text-info",
    success: "text-success",
    danger: "text-destructive",
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pendentes", counts.pending, "warning"],
          ["Em rota", counts.route, "info"],
          ["Entregues", counts.delivered, "success"],
          ["Falhas", counts.failed, "danger"],
        ].map(([label, value, kind]) => (
          <div key={label as string} className="erp-panel flex items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
            </div>
            <Truck className={`h-7 w-7 ${iconClasses[kind as string]}`} />
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-8" title="Pedidos para entrega" actions={<button className="erp-btn erp-btn-primary"><Navigation className="h-3.5 w-3.5" />Otimizar rota</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Endereco</th><th>Entregador</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            {(deliveries.data ?? []).map((delivery) => (
              <tr key={delivery.id}>
                <td className="font-mono">{delivery.order.id.slice(-6)}</td>
                <td className="font-semibold">{delivery.order.client.tradeName}</td>
                <td className="text-[12px] text-muted-foreground">{delivery.order.client.address}</td>
                <td>{delivery.deliveryPerson.name}</td>
                <td><StatusBadge kind={delivery.status === "DELIVERED" ? "success" : delivery.status === "FAILED" ? "danger" : "info"}>{delivery.status}</StatusBadge></td>
                <td>{datePt(delivery.assignedAt ?? delivery.deliveredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Detalhes da entrega">
        {selected ? (
          <>
            <div className="flex h-40 items-center justify-center rounded border bg-muted text-muted-foreground">
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-accent" />
                <div className="mt-1 text-[11.5px]">Mapa e roteirizacao</div>
                <div className="text-[10.5px]">Pronto para integrar geolocalizacao</div>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-[12.5px]">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 text-accent" /><div><div className="font-semibold">{selected.order.client.tradeName}</div><div className="text-muted-foreground">{selected.order.client.address}</div></div></div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selected.order.client.phone ?? "-"}</div>
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> Entregador: {selected.deliveryPerson.name}</div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Nenhuma entrega cadastrada.</div>
        )}
      </Panel>
    </div>
  );
}
