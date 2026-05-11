import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, PieChart, Play, Printer, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, Field, StatusBadge } from "@/components/erp";
import { apiGet } from "@/lib/api";
import { datePt, money, numberPt } from "@/lib/format";

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
  lowStock: Array<{ id: string; name: string; currentStock?: number; minStock?: number }>;
};

type OperationsOverview = {
  purchaseOrders: number;
  priceTables: number;
  openCashSessions: number;
  totalPayments: number;
  bankBalance: number;
  pendingCommissions: { count: number; amount: number };
};

type Order = {
  id: string;
  status: string;
  totalAmount: string | number;
  discountAmount: string | number;
  createdAt: string;
  client: { tradeName: string };
};

type FinancialTransaction = {
  id: string;
  type: "RECEIVABLE" | "PAYABLE";
  status: string;
  description: string;
  amount: string | number;
  dueDate: string;
  client?: { tradeName: string } | null;
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeReport, setActiveReport] = useState("Vendas por periodo");
  const filterQuery = new URLSearchParams();
  if (startDate) filterQuery.set("startDate", startDate);
  if (endDate) filterQuery.set("endDate", endDate);
  const suffix = filterQuery.toString() ? `?${filterQuery.toString()}` : "";

  const sales = useQuery({ queryKey: ["reports", "sales-summary", startDate, endDate], queryFn: () => apiGet<SalesSummary>(`/reports/sales-summary${suffix}`) });
  const inventory = useQuery({ queryKey: ["reports", "inventory-summary"], queryFn: () => apiGet<InventorySummary>("/reports/inventory-summary") });
  const operations = useQuery({ queryKey: ["operations", "overview"], queryFn: () => apiGet<OperationsOverview>("/operations/overview") });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/orders") });
  const financial = useQuery({ queryKey: ["financial", "transactions"], queryFn: () => apiGet<FinancialTransaction[]>("/financial/transactions") });

  const filteredOrders = useMemo(() => {
    return (orders.data ?? []).filter((order) => {
      const created = new Date(order.createdAt).getTime();
      const min = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
      const max = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
      return created >= min && created <= max;
    });
  }, [endDate, orders.data, startDate]);

  const receivables = (financial.data ?? []).filter((row) => row.type === "RECEIVABLE");
  const payables = (financial.data ?? []).filter((row) => row.type === "PAYABLE");
  const ticket = filteredOrders.length ? filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / filteredOrders.length : 0;

  const cards = [
    ["Faturamento", money(sales.data?.grossSales), TrendingUp, "text-success"],
    ["Ticket medio", money(ticket), BarChart3, "text-info"],
    ["Descontos", money(sales.data?.totalDiscounts), TrendingDown, "text-warning-foreground"],
    ["Recebiveis", money(sales.data?.receivables), FileText, "text-info"],
    ["Estoque baixo", numberPt(inventory.data?.lowStock.length), PieChart, "text-destructive"],
    ["Bancos", money(operations.data?.bankBalance), FileSpreadsheet, "text-success"],
  ] as const;

  function setPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }

  function exportCsv(kind: "sales" | "inventory" | "financial") {
    const rows =
      kind === "sales"
        ? [["Pedido", "Cliente", "Status", "Data", "Valor"], ...filteredOrders.map((order) => [order.id, order.client.tradeName, order.status, datePt(order.createdAt), String(order.totalAmount)])]
        : kind === "inventory"
          ? [["Produto", "Estoque atual", "Minimo"], ...(inventory.data?.lowStock ?? []).map((item) => [item.name, String(item.currentStock ?? ""), String(item.minStock ?? "")])]
          : [["Tipo", "Descricao", "Cliente", "Vencimento", "Valor", "Status"], ...(financial.data ?? []).map((item) => [item.type, item.description, item.client?.tradeName ?? "", datePt(item.dueDate), String(item.amount), item.status])];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `distribev-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, Icon, accent]) => (
          <div key={label} className="erp-panel flex min-h-20 items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded bg-muted">
              <Icon className={`h-4.5 w-4.5 ${accent}`} />
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-4" title="Filtros e exportacao">
        <Field label="Periodo">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="erp-input" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input type="date" className="erp-input" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            ["Hoje", 0],
            ["7 dias", 7],
            ["Mes", 30],
            ["Trimestre", 90],
            ["Ano", 365],
          ].map(([label, days]) => (
            <button key={label} className="erp-btn justify-center" onClick={() => setPreset(Number(days))}>{label}</button>
          ))}
          <button className="erp-btn justify-center" onClick={() => { setStartDate(""); setEndDate(""); }}>Tudo</button>
        </div>
        <Field label="Relatorio ativo">
          <select className="erp-input" value={activeReport} onChange={(event) => setActiveReport(event.target.value)}>
            {reports.map((row) => <option key={row[1]} value={row[1]}>{row[1]}</option>)}
          </select>
        </Field>
        <div className="mt-3 flex flex-col gap-1.5">
          <button className="erp-btn erp-btn-primary justify-center" onClick={() => { sales.refetch(); inventory.refetch(); operations.refetch(); }}><Play className="h-3.5 w-3.5" />Gerar dashboards</button>
          <div className="grid grid-cols-3 gap-1.5">
            <button className="erp-btn justify-center" onClick={() => exportCsv("sales")}><Download className="h-3.5 w-3.5" />Vendas CSV</button>
            <button className="erp-btn justify-center" onClick={() => exportCsv("inventory")}><Download className="h-3.5 w-3.5" />Estoque CSV</button>
            <button className="erp-btn justify-center" onClick={() => exportCsv("financial")}><Download className="h-3.5 w-3.5" />Financ. CSV</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button className="erp-btn justify-center"><FileText className="h-3.5 w-3.5" />PDF</button>
            <button className="erp-btn justify-center"><Printer className="h-3.5 w-3.5" />Imprimir</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-8" title="Relatorios disponiveis" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Categoria</th><th>Relatorio</th><th>Descricao</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reports.map((row, index) => (
              <tr key={index}>
                <td><span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10.5px] font-bold text-accent">{row[0]}</span></td>
                <td className="font-semibold">{row[1]}</td>
                <td className="text-muted-foreground">{row[2]}</td>
                <td><StatusBadge kind={row[1] === activeReport ? "success" : "muted"}>{row[1] === activeReport ? "Ativo" : "Disponivel"}</StatusBadge></td>
                <td><button className="erp-btn px-2 py-0.5" onClick={() => setActiveReport(row[1])}><Play className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title={<span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Dashboard de vendas</span>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Pedidos no periodo" value={numberPt(filteredOrders.length)} />
          <Metric label="Faturamento" value={money(sales.data?.grossSales)} />
          <Metric label="Ticket medio" value={money(ticket)} />
        </div>
        <div className="mt-3 h-48">
          <BarChart values={filteredOrders.slice(0, 14).map((order) => Number(order.totalAmount))} />
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title={<span className="flex items-center gap-2"><PieChart className="h-3.5 w-3.5" /> Dashboard financeiro</span>}>
        <div className="space-y-2">
          <Progress label="Recebiveis" value={receivables.reduce((sum, row) => sum + Number(row.amount), 0)} max={Math.max(...[...receivables, ...payables].map((row) => Number(row.amount)), 1)} />
          <Progress label="Pagaveis" value={payables.reduce((sum, row) => sum + Number(row.amount), 0)} max={Math.max(...[...receivables, ...payables].map((row) => Number(row.amount)), 1)} />
          <Progress label="Pagamentos realizados" value={operations.data?.totalPayments ?? 0} max={Math.max(operations.data?.totalPayments ?? 0, operations.data?.bankBalance ?? 0, 1)} />
          <Progress label="Comissoes pendentes" value={operations.data?.pendingCommissions.amount ?? 0} max={Math.max(operations.data?.pendingCommissions.amount ?? 0, 1)} />
        </div>
      </Panel>

      <Panel className="col-span-12" title="Amostra do relatorio ativo" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Registro</th><th>Descricao</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {(activeReport.includes("pagar") || activeReport.includes("receber") || activeReport.includes("caixa")
              ? financial.data ?? []
              : filteredOrders).slice(0, 12).map((row) => {
                const isFinancial = "type" in row;
                return (
                  <tr key={row.id}>
                    <td className="font-mono">{row.id.slice(-8)}</td>
                    <td>{isFinancial ? row.description : row.client.tradeName}</td>
                    <td>{isFinancial ? row.status : row.status}</td>
                    <td className="text-right font-semibold tabular-nums">{money(isFinancial ? row.amount : row.totalAmount)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
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
        <div className="h-full bg-accent" style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

function BarChart({ values }: { values: number[] }) {
  const source = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...source, 1);
  return (
    <div className="flex h-full items-end gap-2">
      {source.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative w-full flex-1">
            <div className="absolute bottom-0 left-0 right-0 rounded-t bg-accent/70" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}
