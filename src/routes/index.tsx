import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge } from "@/components/erp";
import {
  TrendingUp, DollarSign, ShoppingCart, Package,
  AlertTriangle, Truck, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

const kpis = [
  { label: "Vendas do Dia", value: "R$ 24.870,50", delta: "+12,4%", up: true, icon: DollarSign, accent: "text-success" },
  { label: "Pedidos Hoje", value: "147", delta: "+8", up: true, icon: ShoppingCart, accent: "text-info" },
  { label: "Ticket Médio", value: "R$ 169,18", delta: "-2,1%", up: false, icon: TrendingUp, accent: "text-warning-foreground" },
  { label: "Itens em Estoque", value: "8.412", delta: "23 baixos", up: false, icon: Package, accent: "text-destructive" },
];

function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-3">
      {/* KPIs */}
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="erp-panel flex items-center justify-between p-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{k.value}</div>
                <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${k.up ? "text-success" : "text-destructive"}`}>
                  {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded bg-muted ${k.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales chart */}
      <Panel className="col-span-12 lg:col-span-8" title="Faturamento — Últimos 14 dias" actions={
        <select className="erp-input h-6 w-auto py-0 text-[11.5px]"><option>Diário</option><option>Semanal</option></select>
      }>
        <div className="h-56 px-1">
          <BarChart />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3 border-t pt-2 text-[12px]">
          <div><div className="text-muted-foreground">Total período</div><div className="font-bold tabular-nums">R$ 312.480,90</div></div>
          <div><div className="text-muted-foreground">Maior venda</div><div className="font-bold tabular-nums">R$ 38.120,00</div></div>
          <div><div className="text-muted-foreground">Pedidos</div><div className="font-bold tabular-nums">1.842</div></div>
        </div>
      </Panel>

      {/* Alerts */}
      <Panel className="col-span-12 lg:col-span-4" title="Alertas do Sistema" actions={<span className="text-[11px] text-muted-foreground">5 ativos</span>}>
        <ul className="divide-y -m-3">
          {[
            { t: "Estoque baixo: Cerveja Heineken 600ml", s: "12 un restantes", k: "danger" as const, i: AlertTriangle },
            { t: "Conta a pagar vence hoje", s: "Fornecedor Ambev — R$ 18.500", k: "warning" as const, i: Clock },
            { t: "3 pedidos aguardando rota", s: "Setor Norte", k: "info" as const, i: Truck },
            { t: "NFe rejeitada #00021843", s: "Erro 226 — Verificar destinatário", k: "danger" as const, i: AlertTriangle },
            { t: "Lote vencendo em 7 dias", s: "Vinho Tinto Reservado — Lote A12", k: "warning" as const, i: Clock },
          ].map((a, i) => {
            const Icon = a.i;
            return (
              <li key={i} className="flex items-start gap-2 px-3 py-2 hover:bg-muted">
                <Icon className={`mt-0.5 h-4 w-4 ${a.k === "danger" ? "text-destructive" : a.k === "warning" ? "text-warning-foreground" : "text-info"}`} />
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold">{a.t}</div>
                  <div className="text-[11.5px] text-muted-foreground">{a.s}</div>
                </div>
                <StatusBadge kind={a.k}>{a.k === "danger" ? "Crítico" : a.k === "warning" ? "Atenção" : "Info"}</StatusBadge>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Recent orders */}
      <Panel className="col-span-12 lg:col-span-7" title="Últimos Pedidos">
        <table className="erp-table">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Itens</th><th className="text-right">Valor</th><th>Pagto.</th><th>Status</th><th>Hora</th></tr>
          </thead>
          <tbody>
            {[
              ["10472", "Bar do Zé", 14, "R$ 1.248,00", "Boleto", "Em rota", "info", "10:42"],
              ["10471", "Mercearia Central", 7, "R$ 487,30", "PIX", "Entregue", "success", "10:11"],
              ["10470", "Restaurante Vila", 22, "R$ 3.120,80", "Faturado", "Pendente", "warning", "09:55"],
              ["10469", "Lanchonete da Praça", 5, "R$ 198,90", "Dinheiro", "Entregue", "success", "09:32"],
              ["10468", "Distrib. Sul Ltda", 48, "R$ 6.730,00", "Boleto", "Cancelado", "danger", "09:14"],
              ["10467", "Casa de Carnes BR", 11, "R$ 894,20", "Cartão", "Entregue", "success", "08:50"],
            ].map((r) => (
              <tr key={r[0] as string}>
                <td className="font-mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="tabular-nums">{r[2]}</td>
                <td className="text-right font-semibold tabular-nums">{r[3]}</td>
                <td>{r[4]}</td>
                <td><StatusBadge kind={r[6] as never}>{r[5]}</StatusBadge></td>
                <td className="text-muted-foreground">{r[7]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Top products */}
      <Panel className="col-span-12 lg:col-span-5" title="Produtos Mais Vendidos (mês)">
        <ul className="space-y-2">
          {[
            ["Cerveja Skol Lata 350ml", 4820, 92],
            ["Coca-Cola 2L", 3210, 78],
            ["Cerveja Heineken 600ml", 2840, 64],
            ["Água Mineral 500ml", 2510, 58],
            ["Vinho Tinto Reservado", 1180, 31],
            ["Energético Red Bull 250ml", 980, 24],
          ].map(([name, qty, pct]) => (
            <li key={name as string}>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span>{name}</span>
                <span className="tabular-nums text-muted-foreground">{qty} un</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function BarChart() {
  const data = [62, 78, 45, 88, 71, 95, 54, 82, 100, 68, 76, 90, 58, 84];
  return (
    <div className="flex h-full items-end gap-2">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative w-full flex-1">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t bg-gradient-to-t from-accent/80 to-accent/40 hover:from-accent hover:to-accent/60"
              style={{ height: `${v}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
