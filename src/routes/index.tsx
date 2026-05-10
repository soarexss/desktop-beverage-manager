import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, DollarSign, Package, ShoppingCart, TrendingUp, Truck } from "lucide-react";
import { Panel, StatusBadge } from "@/components/erp";
import { apiGet } from "@/lib/api";
import { datePt, money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Dashboard });

type SalesSummary = {
  totalOrders: number;
  grossSales: number;
  totalDiscounts: number;
  receivables: number;
  topProducts: Array<{ productId: string; _sum: { quantity?: string | number; totalPrice?: string | number } }>;
};

type FinancialSummary = {
  totalReceivables: number;
  totalPayables: number;
  pendingBalance: number;
};

type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  client: { tradeName: string };
  items: Array<unknown>;
};

type Product = {
  id: string;
  name: string;
  minStock: number;
};

type InventoryMovement = {
  productId: string;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  quantity: string | number;
};

function Dashboard() {
  const sales = useQuery({ queryKey: ["reports", "sales-summary"], queryFn: () => apiGet<SalesSummary>("/reports/sales-summary") });
  const financial = useQuery({ queryKey: ["financial", "summary"], queryFn: () => apiGet<FinancialSummary>("/financial/summary") });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/orders") });
  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const movements = useQuery({ queryKey: ["inventory-movements"], queryFn: () => apiGet<InventoryMovement[]>("/inventory/movements") });

  const stock = new Map<string, number>();
  for (const movement of movements.data ?? []) {
    const current = stock.get(movement.productId) ?? 0;
    stock.set(movement.productId, current + (movement.type === "OUTBOUND" ? -Number(movement.quantity) : Number(movement.quantity)));
  }
  const lowStock = (products.data ?? []).filter((product) => (stock.get(product.id) ?? 0) <= product.minStock);

  const kpis = [
    { label: "Vendas", value: money(sales.data?.grossSales), delta: `${sales.data?.totalOrders ?? 0} pedidos`, up: true, icon: DollarSign, accent: "text-success" },
    { label: "A receber", value: money(financial.data?.totalReceivables), delta: "financeiro", up: true, icon: TrendingUp, accent: "text-info" },
    { label: "A pagar", value: money(financial.data?.totalPayables), delta: "contas", up: false, icon: ArrowDownRight, accent: "text-warning-foreground" },
    { label: "Estoque baixo", value: numberPt(lowStock.length), delta: `${products.data?.length ?? 0} produtos`, up: false, icon: Package, accent: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="erp-panel flex items-center justify-between p-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{kpi.value}</div>
                <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${kpi.up ? "text-success" : "text-destructive"}`}>
                  {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.delta}
                </div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded bg-muted ${kpi.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      <Panel className="col-span-12 lg:col-span-8" title="Faturamento e pedidos">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border bg-card p-3">
            <div className="text-[11px] uppercase text-muted-foreground">Total vendido</div>
            <div className="mt-1 text-xl font-bold">{money(sales.data?.grossSales)}</div>
          </div>
          <div className="rounded border bg-card p-3">
            <div className="text-[11px] uppercase text-muted-foreground">Descontos</div>
            <div className="mt-1 text-xl font-bold">{money(sales.data?.totalDiscounts)}</div>
          </div>
          <div className="rounded border bg-card p-3">
            <div className="text-[11px] uppercase text-muted-foreground">Recebiveis</div>
            <div className="mt-1 text-xl font-bold">{money(sales.data?.receivables)}</div>
          </div>
        </div>
        <div className="mt-3 h-44">
          <BarChart values={(orders.data ?? []).slice(0, 14).map((order) => Number(order.totalAmount))} />
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Alertas do sistema" actions={<span className="text-[11px] text-muted-foreground">{lowStock.length} ativos</span>}>
        <ul className="-m-3 divide-y">
          {lowStock.slice(0, 6).map((product) => (
            <li key={product.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold">Estoque baixo: {product.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{numberPt(stock.get(product.id) ?? 0, 3)} em estoque</div>
              </div>
              <StatusBadge kind="danger">Critico</StatusBadge>
            </li>
          ))}
          {!lowStock.length && (
            <li className="px-3 py-6 text-center text-muted-foreground">Sem alertas criticos de estoque.</li>
          )}
        </ul>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title="Ultimos pedidos" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Itens</th><th className="text-right">Valor</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            {(orders.data ?? []).slice(0, 8).map((order) => (
              <tr key={order.id}>
                <td className="font-mono">{order.id.slice(-6)}</td>
                <td>{order.client.tradeName}</td>
                <td className="tabular-nums">{order.items.length}</td>
                <td className="text-right font-semibold tabular-nums">{money(order.totalAmount)}</td>
                <td><StatusBadge kind={order.status === "CANCELLED" ? "danger" : "info"}>{order.status}</StatusBadge></td>
                <td className="text-muted-foreground">{datePt(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Produtos cadastrados">
        <ul className="space-y-2">
          {(products.data ?? []).slice(0, 8).map((product) => (
            <li key={product.id}>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span>{product.name}</span>
                <span className="tabular-nums text-muted-foreground">{numberPt(stock.get(product.id) ?? 0, 3)} un</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(8, (stock.get(product.id) ?? 0) / Math.max(product.minStock, 1) * 20))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-full items-end gap-2">
      {(values.length ? values : [0, 0, 0, 0, 0, 0, 0]).map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative w-full flex-1">
            <div className="absolute bottom-0 left-0 right-0 rounded-t bg-gradient-to-t from-accent/80 to-accent/40" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}
