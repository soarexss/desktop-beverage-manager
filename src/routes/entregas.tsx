import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { MapPin, Truck, User, Navigation, Phone } from "lucide-react";

export const Route = createFileRoute("/entregas")({ component: Entregas });

const deliveries = [
  ["10472", "Bar do Zé", "R. Augusta, 1240 - Consolação", "Carlos S.", "Em rota", "info", "10:42", 5.2],
  ["10470", "Restaurante Vila", "Av. Paulista, 2300", "—", "Pendente", "warning", "09:55", 8.1],
  ["10471", "Mercearia Central", "R. dos Pinheiros, 580", "Marcos T.", "Entregue", "success", "10:11", 3.4],
  ["10468", "Distrib. Sul Ltda", "Av. do Estado, 4200", "Pedro R.", "Cancelado", "danger", "09:14", 12.5],
  ["10465", "Casa de Carnes BR", "R. Vergueiro, 950", "Carlos S.", "Em rota", "info", "08:50", 6.8],
  ["10463", "Lanchonete da Praça", "Pç. da Sé, 100", "—", "Pendente", "warning", "08:30", 4.0],
];

function Entregas() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pendentes", 14, "warning"],
          ["Em rota", 8, "info"],
          ["Entregues hoje", 47, "success"],
          ["Canceladas", 2, "danger"],
        ].map(([l, v, k]) => (
          <div key={l as string} className="erp-panel flex items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{v}</div>
            </div>
            <Truck className={`h-7 w-7 text-${k}`} />
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-8" title="Pedidos para Entrega" actions={<button className="erp-btn erp-btn-primary"><Navigation className="h-3.5 w-3.5" />Otimizar Rota</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Endereço</th><th>Entregador</th><th>Distância</th><th>Status</th><th>Hora</th></tr></thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d[0] as string}>
                <td className="font-mono">{d[0]}</td>
                <td className="font-semibold">{d[1]}</td>
                <td className="text-[12px] text-muted-foreground">{d[2]}</td>
                <td>{d[3] === "—" ? <span className="italic text-destructive">Não atribuído</span> : d[3]}</td>
                <td className="text-right tabular-nums">{d[7]} km</td>
                <td><StatusBadge kind={d[5] as never}>{d[4]}</StatusBadge></td>
                <td className="text-muted-foreground">{d[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Detalhes da Entrega — #10472">
        <div className="flex h-40 items-center justify-center rounded border bg-gradient-to-br from-muted to-secondary text-muted-foreground">
          <div className="text-center">
            <MapPin className="mx-auto h-8 w-8 text-accent" />
            <div className="text-[11.5px] mt-1">Mapa interativo</div>
            <div className="text-[10.5px]">Lat -23.555 / Lng -46.661</div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[12.5px]">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 text-accent" /><div><div className="font-semibold">Bar do Zé</div><div className="text-muted-foreground">R. Augusta, 1240 — Consolação, São Paulo/SP — CEP 01304-001</div></div></div>
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> (11) 98765-4321</div>
          <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> Receber com: Carlos (gerente)</div>
        </div>
        <div className="mt-3 border-t pt-2">
          <Field label="Atribuir entregador">
            <select className="erp-input"><option>Carlos S. — Veículo VW-1234</option><option>Marcos T. — Veículo MB-5678</option><option>Pedro R. — Veículo FT-9012</option></select>
          </Field>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="erp-btn">Imprimir</button>
          <button className="erp-btn erp-btn-primary">Confirmar Entrega</button>
        </div>
      </Panel>
    </div>
  );
}
