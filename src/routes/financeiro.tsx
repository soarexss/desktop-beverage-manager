import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Download, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, StatusBadge } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { datePt, money } from "@/lib/format";

export const Route = createFileRoute("/financeiro")({ component: Financeiro });

type FinancialSummary = {
  totalReceivables: number;
  totalPayables: number;
  pendingBalance: number;
};

type FinancialTransaction = {
  id: string;
  type: "RECEIVABLE" | "PAYABLE";
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  amount: string | number;
  description: string;
  dueDate: string;
  client?: { tradeName: string } | null;
};

type CashSession = {
  id: string;
  status: "OPEN" | "CLOSED";
  openingBalance: string | number;
  closingBalance?: string | number | null;
  openedAt: string;
  openedBy: { name: string };
};

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  balance: string | number;
};

type Commission = {
  id: string;
  amount: string | number;
  percentage: string | number;
  status: "PENDING" | "PAID" | "CANCELLED";
  seller: { name: string };
  order: { client: { tradeName: string } };
};

function Financeiro() {
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ["financial", "summary"], queryFn: () => apiGet<FinancialSummary>("/financial/summary") });
  const transactions = useQuery({ queryKey: ["financial", "transactions"], queryFn: () => apiGet<FinancialTransaction[]>("/financial/transactions") });
  const cashSessions = useQuery({ queryKey: ["operations", "cash"], queryFn: () => apiGet<CashSession[]>("/operations/cash-sessions") });
  const bankAccounts = useQuery({ queryKey: ["operations", "banks"], queryFn: () => apiGet<BankAccount[]>("/operations/bank-accounts") });
  const commissions = useQuery({ queryKey: ["operations", "commissions"], queryFn: () => apiGet<Commission[]>("/operations/commissions") });

  const openCash = useMutation({
    mutationFn: () => apiPost<CashSession>("/operations/cash-sessions", { openingBalance: 0 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "cash"] }),
  });

  const cards = [
    ["A Receber", money(summary.data?.totalReceivables), "info", TrendingUp],
    ["A Pagar", money(summary.data?.totalPayables), "warning", TrendingDown],
    ["Pendente", money(summary.data?.pendingBalance), "danger", TrendingDown],
    ["Bancos", money((bankAccounts.data ?? []).reduce((sum, account) => sum + Number(account.balance), 0)), "success", TrendingUp],
  ] as const;
  const iconClasses: Record<string, string> = {
    info: "text-info",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    success: "text-success",
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, kind, Icon]) => (
          <div key={label} className="erp-panel flex items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded bg-muted">
              <Icon className={`h-5 w-5 ${iconClasses[kind]}`} />
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-6" title="Contas a pagar" actions={<button className="erp-btn"><Plus className="h-3.5 w-3.5" />Lancar</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Descricao</th><th>Vencimento</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {(transactions.data ?? []).filter((row) => row.type === "PAYABLE").map((row) => (
              <tr key={row.id}>
                <td>{row.description}</td>
                <td>{datePt(row.dueDate)}</td>
                <td className="text-right font-semibold tabular-nums">{money(row.amount)}</td>
                <td><StatusBadge kind={row.status === "PAID" ? "success" : "warning"}>{row.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-6" title="Contas a receber" actions={<button className="erp-btn"><Download className="h-3.5 w-3.5" />Exportar</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Cliente/Descricao</th><th>Vencimento</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {(transactions.data ?? []).filter((row) => row.type === "RECEIVABLE").map((row) => (
              <tr key={row.id}>
                <td>{row.client?.tradeName ?? row.description}</td>
                <td>{datePt(row.dueDate)}</td>
                <td className="text-right font-semibold tabular-nums">{money(row.amount)}</td>
                <td><StatusBadge kind={row.status === "PAID" ? "success" : "info"}>{row.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Caixa" actions={<button className="erp-btn erp-btn-primary" onClick={() => openCash.mutate()}><Banknote className="h-3.5 w-3.5" />Abrir caixa</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Operador</th><th>Abertura</th><th className="text-right">Saldo inicial</th><th>Status</th></tr></thead>
          <tbody>
            {(cashSessions.data ?? []).slice(0, 6).map((session) => (
              <tr key={session.id}>
                <td>{session.openedBy.name}</td>
                <td>{datePt(session.openedAt)}</td>
                <td className="text-right tabular-nums">{money(session.openingBalance)}</td>
                <td><StatusBadge kind={session.status === "OPEN" ? "success" : "muted"}>{session.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-3" title="Bancos" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Conta</th><th className="text-right">Saldo</th></tr></thead>
          <tbody>
            {(bankAccounts.data ?? []).map((account) => (
              <tr key={account.id}>
                <td><div className="font-semibold">{account.name}</div><div className="text-[11px] text-muted-foreground">{account.bankName}</div></td>
                <td className="text-right font-semibold tabular-nums">{money(account.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Comissoes" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Vendedor</th><th>Cliente</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {(commissions.data ?? []).slice(0, 6).map((commission) => (
              <tr key={commission.id}>
                <td>{commission.seller.name}</td>
                <td>{commission.order.client.tradeName}</td>
                <td className="text-right font-semibold tabular-nums">{money(commission.amount)}</td>
                <td><StatusBadge kind={commission.status === "PAID" ? "success" : "warning"}>{commission.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
