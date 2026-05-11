import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Download, Landmark, Plus, RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { datePt, dateTimePt, money } from "@/lib/format";

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

type CashMovement = {
  id: string;
  type: "SALE" | "RECEIPT" | "PAYMENT" | "WITHDRAWAL" | "SUPPLY" | "TRANSFER" | "ADJUSTMENT";
  amount: string | number;
  methodName?: string | null;
  description: string;
  reference?: string | null;
  createdAt: string;
};

type CashSession = {
  id: string;
  status: "OPEN" | "CLOSED";
  openingBalance: string | number;
  closingBalance?: string | number | null;
  openedAt: string;
  closedAt?: string | null;
  openedBy: { name: string };
  movements?: CashMovement[];
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

const cashMovementLabels: Record<CashMovement["type"], string> = {
  SALE: "Venda",
  RECEIPT: "Recebimento",
  PAYMENT: "Pagamento",
  WITHDRAWAL: "Sangria",
  SUPPLY: "Suprimento",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

function cashSessionBalance(session: CashSession) {
  return (
    Number(session.openingBalance) +
    (session.movements ?? []).reduce((sum, movement) => {
      const value = Number(movement.amount);
      return sum + (movement.type === "WITHDRAWAL" || movement.type === "PAYMENT" ? -value : value);
    }, 0)
  );
}

function Financeiro() {
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState(0);
  const [cashMovementForm, setCashMovementForm] = useState({
    cashSessionId: "",
    type: "RECEIPT" as CashMovement["type"],
    amount: 0,
    methodName: "Dinheiro",
    description: "",
    reference: "",
  });

  const summary = useQuery({ queryKey: ["financial", "summary"], queryFn: () => apiGet<FinancialSummary>("/financial/summary") });
  const transactions = useQuery({ queryKey: ["financial", "transactions"], queryFn: () => apiGet<FinancialTransaction[]>("/financial/transactions") });
  const cashSessions = useQuery({ queryKey: ["operations", "cash"], queryFn: () => apiGet<CashSession[]>("/operations/cash-sessions") });
  const bankAccounts = useQuery({ queryKey: ["operations", "banks"], queryFn: () => apiGet<BankAccount[]>("/operations/bank-accounts") });
  const commissions = useQuery({ queryKey: ["operations", "commissions"], queryFn: () => apiGet<Commission[]>("/operations/commissions") });

  const openCashSessions = useMemo(() => (cashSessions.data ?? []).filter((session) => session.status === "OPEN"), [cashSessions.data]);
  const activeCashSession = useMemo(() => {
    const id = cashMovementForm.cashSessionId || openCashSessions[0]?.id;
    return openCashSessions.find((session) => session.id === id);
  }, [cashMovementForm.cashSessionId, openCashSessions]);

  const invalidateOperations = () => {
    queryClient.invalidateQueries({ queryKey: ["operations"] });
    queryClient.invalidateQueries({ queryKey: ["financial"] });
  };

  const openCash = useMutation({
    mutationFn: () => apiPost<CashSession>("/operations/cash-sessions", { openingBalance, notes: "Abertura pelo financeiro" }),
    onSuccess: () => {
      setOpeningBalance(0);
      invalidateOperations();
    },
  });

  const createCashMovement = useMutation({
    mutationFn: () =>
      apiPost<CashMovement>("/operations/cash-movements", {
        ...cashMovementForm,
        cashSessionId: activeCashSession?.id,
        reference: cashMovementForm.reference || undefined,
      }),
    onSuccess: () => {
      setCashMovementForm({ cashSessionId: "", type: "RECEIPT", amount: 0, methodName: "Dinheiro", description: "", reference: "" });
      invalidateOperations();
    },
  });

  const closeCash = useMutation({
    mutationFn: (session: CashSession) =>
      apiPatch<CashSession>(`/operations/cash-sessions/${session.id}/close`, {
        closingBalance: cashSessionBalance(session),
        notes: "Fechamento pelo financeiro",
      }),
    onSuccess: () => invalidateOperations(),
  });

  const cards = [
    ["A Receber", money(summary.data?.totalReceivables), "info", TrendingUp],
    ["A Pagar", money(summary.data?.totalPayables), "warning", TrendingDown],
    ["Pendente", money(summary.data?.pendingBalance), "danger", TrendingDown],
    ["Bancos", money((bankAccounts.data ?? []).reduce((sum, account) => sum + Number(account.balance), 0)), "success", Landmark],
    ["Caixa aberto", money(openCashSessions.reduce((sum, session) => sum + cashSessionBalance(session), 0)), "info", Wallet],
  ] as const;
  const iconClasses: Record<string, string> = {
    info: "text-info",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    success: "text-success",
  };

  function submitOpenCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openCash.mutate();
  }

  function submitCashMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCashSession || cashMovementForm.amount <= 0 || !cashMovementForm.description.trim()) {
      return;
    }
    createCashMovement.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-5">
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

      <Panel className="col-span-12 xl:col-span-7" title="Caixa operacional">
        <div className="grid gap-3 lg:grid-cols-7">
          <form className="space-y-2 lg:col-span-2" onSubmit={submitOpenCash}>
            <Field label="Saldo inicial">
              <input className="erp-input text-right" type="number" step={0.01} value={openingBalance} onChange={(event) => setOpeningBalance(Number(event.target.value))} />
            </Field>
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={openCash.isPending}><Banknote className="h-3.5 w-3.5" />Abrir caixa</button>
          </form>

          <form className="grid gap-2 lg:col-span-5 lg:grid-cols-5" onSubmit={submitCashMovement}>
            <Field label="Sessao">
              <select className="erp-input" value={activeCashSession?.id ?? ""} onChange={(event) => setCashMovementForm({ ...cashMovementForm, cashSessionId: event.target.value })}>
                {openCashSessions.map((session) => <option key={session.id} value={session.id}>{dateTimePt(session.openedAt)} - {session.openedBy.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className="erp-input" value={cashMovementForm.type} onChange={(event) => setCashMovementForm({ ...cashMovementForm, type: event.target.value as CashMovement["type"] })}>
                {Object.entries(cashMovementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Valor">
              <input className="erp-input text-right" type="number" step={0.01} value={cashMovementForm.amount} onChange={(event) => setCashMovementForm({ ...cashMovementForm, amount: Number(event.target.value) })} />
            </Field>
            <Field label="Forma">
              <input className="erp-input" value={cashMovementForm.methodName} onChange={(event) => setCashMovementForm({ ...cashMovementForm, methodName: event.target.value })} />
            </Field>
            <Field label="Referencia">
              <input className="erp-input" value={cashMovementForm.reference} onChange={(event) => setCashMovementForm({ ...cashMovementForm, reference: event.target.value })} />
            </Field>
            <div className="lg:col-span-4">
              <Field label="Descricao">
                <input className="erp-input" value={cashMovementForm.description} onChange={(event) => setCashMovementForm({ ...cashMovementForm, description: event.target.value })} />
              </Field>
            </div>
            <div className="flex items-end gap-1.5">
              <button className="erp-btn flex-1 justify-center" disabled={!activeCashSession || createCashMovement.isPending}><Plus className="h-3.5 w-3.5" />Lancar</button>
              <button type="button" className="erp-btn erp-btn-primary" disabled={!activeCashSession || closeCash.isPending} onClick={() => activeCashSession && closeCash.mutate(activeCashSession)}>
                <CheckCircle2 className="h-3.5 w-3.5" />Fechar
              </button>
            </div>
          </form>
        </div>
        <div className="mt-3 max-h-[260px] overflow-auto">
          <table className="erp-table">
            <thead><tr><th>Operador</th><th>Abertura</th><th className="text-right">Saldo atual</th><th>Status</th><th>Ultimo movimento</th></tr></thead>
            <tbody>
              {(cashSessions.data ?? []).slice(0, 8).map((session) => (
                <tr key={session.id}>
                  <td>{session.openedBy.name}</td>
                  <td>{dateTimePt(session.openedAt)}</td>
                  <td className="text-right tabular-nums font-semibold">{money(session.status === "OPEN" ? cashSessionBalance(session) : session.closingBalance)}</td>
                  <td><StatusBadge kind={session.status === "OPEN" ? "success" : "muted"}>{session.status}</StatusBadge></td>
                  <td className="text-muted-foreground">{session.movements?.[0]?.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-5" title="Movimentos recentes do caixa" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descricao</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {(cashSessions.data ?? []).flatMap((session) => session.movements ?? []).slice(0, 12).map((movement) => (
              <tr key={movement.id}>
                <td>{dateTimePt(movement.createdAt)}</td>
                <td>{cashMovementLabels[movement.type]}</td>
                <td>{movement.description}</td>
                <td className={`text-right font-semibold tabular-nums ${movement.type === "WITHDRAWAL" || movement.type === "PAYMENT" ? "text-destructive" : "text-success"}`}>{money(movement.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

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

      <Panel className="col-span-12 lg:col-span-4" title="Bancos" bodyClassName="p-0">
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

      <Panel className="col-span-12 lg:col-span-8" title="Comissoes" bodyClassName="p-0">
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
