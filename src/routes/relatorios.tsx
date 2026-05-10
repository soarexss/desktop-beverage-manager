import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileSpreadsheet, FileText, PieChart, Play, Printer } from "lucide-react";
import { Panel, Field } from "@/components/erp";
import { apiGet } from "@/lib/api";
import { money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({ component: Relatorios });

type SalesSummary = {
  totalOrders: number;
  grossSales: number;
  totalDiscounts: number;
  receivables: number;
  topProducts: Array<{ productId: string; _sum: { quantity?: string | number; totalPrice?: string | number } }>;
};

type InventorySummary = {
  products: number;
  lowStock: Array<{ id: string; name: string }>;
};

type OperationsOverview = {
  purchaseOrders: number;
  priceTables: number;
  openCashSessions: number;
  totalPayments: number;
  bankBalance: number;
  pendingCommissions: { count: number; amount: number };
};

const reports = [
  ["VENDAS", "Vendas por periodo", "Faturamento, ticket medio e descontos"],
  ["VENDAS", "Vendas por vendedor", "Performance individual e comissoes"],
  ["ESTOQUE", "Posicao de estoque", "Saldo atual por produto/categoria"],
  ["ESTOQUE", "Movimentacoes", "Entradas, saidas, ajustes e lotes"],
  ["FINANC.", "Contas a pagar", "Por vencimento e fornecedor"],
  ["FINANC.", "Contas a receber", "Inadimplencia e projecao"],
  ["FINANC.", "Fluxo de caixa", "Entradas, saidas e bancos"],
  ["FISCAL", "Livro de saidas", "Base para SPED Fiscal"],
  ["FISCAL", "Apuracao de impostos", "ICMS, PIS, COFINS"],
  ["GERAL", "DRE Gerencial", "Demonstrativo de resultados"],
];

function Relatorios() {
  const sales = useQuery({ queryKey: ["reports", "sales-summary"], queryFn: () => apiGet<SalesSummary>("/reports/sales-summary") });
  const inventory = useQuery({ queryKey: ["reports", "inventory-summary"], queryFn: () => apiGet<InventorySummary>("/reports/inventory-summary") });
  const operations = useQuery({ queryKey: ["operations", "overview"], queryFn: () => apiGet<OperationsOverview>("/operations/overview") });

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12 lg:col-span-4" title="Filtros">
        <Field label="Periodo">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="erp-input" />
            <input type="date" className="erp-input" />
          </div>
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {["Hoje", "Ontem", "7 dias", "Mes", "Trimestre", "Ano"].map((label) => (
            <button key={label} className="erp-btn justify-center">{label}</button>
          ))}
        </div>
        <Field label="Filial"><select className="erp-input"><option>Todas</option><option>Matriz</option></select></Field>
        <Field label="Categoria"><select className="erp-input"><option>Todas</option></select></Field>
        <Field label="Vendedor"><select className="erp-input"><option>Todos</option></select></Field>
        <div className="mt-3 flex flex-col gap-1.5">
          <button className="erp-btn erp-btn-primary justify-center"><Play className="h-3.5 w-3.5" />Gerar relatorio</button>
          <div className="grid grid-cols-3 gap-1.5">
            <button className="erp-btn justify-center"><FileText className="h-3.5 w-3.5" />PDF</button>
            <button className="erp-btn justify-center"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
            <button className="erp-btn justify-center"><Printer className="h-3.5 w-3.5" />Imprimir</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-8" title="Relatorios disponiveis" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Categoria</th><th>Relatorio</th><th>Descricao</th><th></th></tr></thead>
          <tbody>
            {reports.map((row, index) => (
              <tr key={index}>
                <td><span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10.5px] font-bold text-accent">{row[0]}</span></td>
                <td className="font-semibold">{row[1]}</td>
                <td className="text-muted-foreground">{row[2]}</td>
                <td><button className="erp-btn px-2 py-0.5"><Play className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title={<span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Indicadores reais</span>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Faturamento" value={money(sales.data?.grossSales)} />
          <Metric label="Pedidos" value={numberPt(sales.data?.totalOrders)} />
          <Metric label="Recebiveis" value={money(sales.data?.receivables)} />
          <Metric label="Produtos" value={numberPt(inventory.data?.products)} />
          <Metric label="Compras" value={numberPt(operations.data?.purchaseOrders)} />
          <Metric label="Saldo bancos" value={money(operations.data?.bankBalance)} />
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title={<span className="flex items-center gap-2"><PieChart className="h-3.5 w-3.5" /> Composicao financeira</span>}>
        <div className="space-y-2">
          <Progress label="Pagamentos" value={operations.data?.totalPayments ?? 0} max={Math.max(operations.data?.totalPayments ?? 0, operations.data?.bankBalance ?? 0, 1)} />
          <Progress label="Bancos" value={operations.data?.bankBalance ?? 0} max={Math.max(operations.data?.totalPayments ?? 0, operations.data?.bankBalance ?? 0, 1)} />
          <Progress label="Comissoes pendentes" value={operations.data?.pendingCommissions.amount ?? 0} max={Math.max(operations.data?.pendingCommissions.amount ?? 0, 1)} />
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Progress({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[12.5px]">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{money(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-sm bg-muted">
        <div className="h-full bg-accent" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}
