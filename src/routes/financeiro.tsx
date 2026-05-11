import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { datePt, dateTimePt, money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/financeiro")({ component: Financeiro });

type FinancialStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | "RENEGOTIATED";
type FinancialType = "RECEIVABLE" | "PAYABLE";

type FinancialSummary = {
  totalReceivables: number;
  totalPayables: number;
  pendingBalance: number;
};

type Client = {
  id: string;
  tradeName: string;
  document: string;
  creditLimit: string | number;
  status: string;
};

type RegistryEntry = {
  id: string;
  code?: string | null;
  name: string;
  metadata?: Record<string, unknown> | null;
};

type FinancialSettlement = {
  id: string;
  amount: string | number;
  methodName: string;
  receiptNumber?: string | null;
  settledAt: string;
};

type FinancialTransaction = {
  id: string;
  type: FinancialType;
  status: FinancialStatus;
  amount: string | number;
  originalAmount?: string | number;
  paidAmount?: string | number;
  interestAmount?: string | number;
  penaltyAmount?: string | number;
  discountAmount?: string | number;
  description: string;
  documentNumber?: string | null;
  dueDate: string;
  paidAt?: string | null;
  supplierName?: string | null;
  paymentMethodName?: string | null;
  installmentNumber: number;
  totalInstallments: number;
  client?: { tradeName: string; document?: string } | null;
  settlements?: FinancialSettlement[];
};

type ForecastDay = {
  date: string;
  receivables: number;
  payables: number;
};

type FinancialDashboard = {
  bankBalance: number;
  cashBalance: number;
  totalBalance: number;
  receiveToday: number;
  payToday: number;
  overdueReceivables: number;
  overduePayables: number;
  overdueClients: FinancialTransaction[];
  alerts: FinancialTransaction[];
  forecast: ForecastDay[];
  realized: { income: number; expense: number };
  estimatedResult: number;
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
  movements: CashMovement[];
};

type BankTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  status: "PENDING" | "RECONCILED" | "IGNORED";
  amount: string | number;
  description: string;
  reference?: string | null;
  occurredAt: string;
};

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  agency?: string | null;
  accountNumber?: string | null;
  balance: string | number;
  transactions: BankTransaction[];
};

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: FinancialType;
};

type CostCenter = {
  id: string;
  code: string;
  name: string;
};

type Commission = {
  id: string;
  amount: string | number;
  percentage: string | number;
  status: "PENDING" | "PAID" | "CANCELLED";
  seller: { name: string };
  order: { client: { tradeName: string } };
};

const emptyDate = new Date().toISOString().slice(0, 10);

const financialStatusKind: Record<FinancialStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  PENDING: "warning",
  PARTIAL: "info",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "muted",
  RENEGOTIATED: "info",
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

function outstanding(row: FinancialTransaction) {
  return Math.max(Number(row.amount) - Number(row.paidAmount ?? 0), 0);
}

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
  const [titleForm, setTitleForm] = useState({
    type: "RECEIVABLE" as FinancialType,
    description: "",
    documentNumber: "",
    amount: 0,
    dueDate: emptyDate,
    installments: 1,
    intervalDays: 30,
    clientId: "",
    supplierName: "",
    categoryId: "",
    costCenterId: "",
    paymentMethodId: "",
    paymentMethodName: "",
  });
  const [settleForm, setSettleForm] = useState({
    transactionId: "",
    amount: 0,
    interestAmount: 0,
    penaltyAmount: 0,
    discountAmount: 0,
    methodId: "",
    methodName: "PIX",
    receiptNumber: "",
    notes: "",
  });
  const [openingBalance, setOpeningBalance] = useState(0);
  const [cashMovementForm, setCashMovementForm] = useState({
    cashSessionId: "",
    type: "RECEIPT" as CashMovement["type"],
    amount: 0,
    methodName: "Dinheiro",
    description: "",
  });
  const [bankForm, setBankForm] = useState({
    name: "",
    bankName: "",
    agency: "",
    accountNumber: "",
    balance: 0,
  });
  const [bankTransactionForm, setBankTransactionForm] = useState({
    bankAccountId: "",
    type: "CREDIT" as BankTransaction["type"],
    amount: 0,
    description: "",
    reference: "",
  });
  const [chartForm, setChartForm] = useState({
    code: "",
    name: "",
    type: "RECEIVABLE" as FinancialType,
  });
  const [costCenterForm, setCostCenterForm] = useState({
    code: "",
    name: "",
  });

  const summary = useQuery({ queryKey: ["financial", "summary"], queryFn: () => apiGet<FinancialSummary>("/financial/summary") });
  const dashboard = useQuery({ queryKey: ["financial", "dashboard"], queryFn: () => apiGet<FinancialDashboard>("/financial/dashboard") });
  const transactions = useQuery({ queryKey: ["financial", "transactions"], queryFn: () => apiGet<FinancialTransaction[]>("/financial/transactions") });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => apiGet<Client[]>("/clients") });
  const paymentMethods = useQuery({
    queryKey: ["registries", "PAYMENT_METHOD"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=PAYMENT_METHOD"),
  });
  const chartAccounts = useQuery({ queryKey: ["financial", "chart-accounts"], queryFn: () => apiGet<ChartAccount[]>("/financial/chart-accounts") });
  const costCenters = useQuery({ queryKey: ["financial", "cost-centers"], queryFn: () => apiGet<CostCenter[]>("/financial/cost-centers") });
  const cashSessions = useQuery({ queryKey: ["operations", "cash"], queryFn: () => apiGet<CashSession[]>("/operations/cash-sessions") });
  const bankAccounts = useQuery({ queryKey: ["operations", "banks"], queryFn: () => apiGet<BankAccount[]>("/operations/bank-accounts") });
  const commissions = useQuery({ queryKey: ["operations", "commissions"], queryFn: () => apiGet<Commission[]>("/operations/commissions") });

  const openTransactions = useMemo(
    () => (transactions.data ?? []).filter((row) => ["PENDING", "PARTIAL", "OVERDUE"].includes(row.status)),
    [transactions.data],
  );
  const selectedSettlementTitle = useMemo(() => {
    const id = settleForm.transactionId || openTransactions[0]?.id;
    return openTransactions.find((row) => row.id === id);
  }, [openTransactions, settleForm.transactionId]);
  const openCashSessions = useMemo(() => (cashSessions.data ?? []).filter((session) => session.status === "OPEN"), [cashSessions.data]);
  const activeCashSession = useMemo(() => {
    const id = cashMovementForm.cashSessionId || openCashSessions[0]?.id;
    return openCashSessions.find((session) => session.id === id);
  }, [cashMovementForm.cashSessionId, openCashSessions]);
  const allBankTransactions = useMemo(
    () => (bankAccounts.data ?? []).flatMap((account) => (account.transactions ?? []).map((transaction) => ({ ...transaction, accountName: account.name }))),
    [bankAccounts.data],
  );

  const invalidateFinancial = () => {
    queryClient.invalidateQueries({ queryKey: ["financial"] });
    queryClient.invalidateQueries({ queryKey: ["operations"] });
  };

  const createTitle = useMutation({
    mutationFn: () =>
      apiPost<FinancialTransaction[]>("/financial/titles", {
        ...titleForm,
        amount: titleForm.amount,
        documentNumber: titleForm.documentNumber || undefined,
        clientId: titleForm.type === "RECEIVABLE" ? titleForm.clientId || undefined : undefined,
        supplierName: titleForm.type === "PAYABLE" ? titleForm.supplierName || undefined : undefined,
        categoryId: titleForm.categoryId || undefined,
        costCenterId: titleForm.costCenterId || undefined,
        paymentMethodId: titleForm.paymentMethodId || undefined,
        paymentMethodName: titleForm.paymentMethodName || undefined,
      }),
    onSuccess: () => {
      setTitleForm({
        type: "RECEIVABLE",
        description: "",
        documentNumber: "",
        amount: 0,
        dueDate: emptyDate,
        installments: 1,
        intervalDays: 30,
        clientId: "",
        supplierName: "",
        categoryId: "",
        costCenterId: "",
        paymentMethodId: "",
        paymentMethodName: "",
      });
      invalidateFinancial();
    },
  });

  const settleTitle = useMutation({
    mutationFn: () =>
      apiPost<FinancialSettlement>(`/financial/transactions/${selectedSettlementTitle?.id}/settlements`, {
        amount: settleForm.amount || outstanding(selectedSettlementTitle as FinancialTransaction),
        interestAmount: settleForm.interestAmount,
        penaltyAmount: settleForm.penaltyAmount,
        discountAmount: settleForm.discountAmount,
        methodId: settleForm.methodId || undefined,
        methodName: settleForm.methodName || "Dinheiro",
        receiptNumber: settleForm.receiptNumber || undefined,
        notes: settleForm.notes || undefined,
      }),
    onSuccess: () => {
      setSettleForm({ transactionId: "", amount: 0, interestAmount: 0, penaltyAmount: 0, discountAmount: 0, methodId: "", methodName: "PIX", receiptNumber: "", notes: "" });
      invalidateFinancial();
    },
  });

  const reopenTitle = useMutation({
    mutationFn: (id: string) => apiPatch<FinancialTransaction>(`/financial/transactions/${id}/reopen`),
    onSuccess: () => invalidateFinancial(),
  });

  const openCash = useMutation({
    mutationFn: () => apiPost<CashSession>("/operations/cash-sessions", { openingBalance, notes: "Abertura pelo financeiro" }),
    onSuccess: () => {
      setOpeningBalance(0);
      invalidateFinancial();
    },
  });

  const closeCash = useMutation({
    mutationFn: (session: CashSession) => apiPatch<CashSession>(`/operations/cash-sessions/${session.id}/close`, { closingBalance: cashSessionBalance(session), notes: "Fechamento pelo financeiro" }),
    onSuccess: () => invalidateFinancial(),
  });

  const createCashMovement = useMutation({
    mutationFn: () =>
      apiPost<CashMovement>("/operations/cash-movements", {
        ...cashMovementForm,
        cashSessionId: activeCashSession?.id,
      }),
    onSuccess: () => {
      setCashMovementForm({ cashSessionId: "", type: "RECEIPT", amount: 0, methodName: "Dinheiro", description: "" });
      invalidateFinancial();
    },
  });

  const createBankAccount = useMutation({
    mutationFn: () =>
      apiPost<BankAccount>("/operations/bank-accounts", {
        ...bankForm,
        agency: bankForm.agency || undefined,
        accountNumber: bankForm.accountNumber || undefined,
      }),
    onSuccess: () => {
      setBankForm({ name: "", bankName: "", agency: "", accountNumber: "", balance: 0 });
      invalidateFinancial();
    },
  });

  const createBankTransaction = useMutation({
    mutationFn: () =>
      apiPost<BankTransaction>("/operations/bank-transactions", {
        ...bankTransactionForm,
        reference: bankTransactionForm.reference || undefined,
      }),
    onSuccess: () => {
      setBankTransactionForm({ bankAccountId: "", type: "CREDIT", amount: 0, description: "", reference: "" });
      invalidateFinancial();
    },
  });

  const createChartAccount = useMutation({
    mutationFn: () => apiPost<ChartAccount>("/financial/chart-accounts", chartForm),
    onSuccess: () => {
      setChartForm({ code: "", name: "", type: "RECEIVABLE" });
      invalidateFinancial();
    },
  });

  const createCostCenter = useMutation({
    mutationFn: () => apiPost<CostCenter>("/financial/cost-centers", costCenterForm),
    onSuccess: () => {
      setCostCenterForm({ code: "", name: "" });
      invalidateFinancial();
    },
  });

  const cards = [
    ["Saldo caixa", money(dashboard.data?.cashBalance), Wallet, "text-info"],
    ["Saldo bancos", money(dashboard.data?.bankBalance), Landmark, "text-success"],
    ["Receber hoje", money(dashboard.data?.receiveToday), TrendingUp, "text-success"],
    ["Pagar hoje", money(dashboard.data?.payToday), TrendingDown, "text-warning-foreground"],
    ["Atraso clientes", money(dashboard.data?.overdueReceivables), ShieldCheck, "text-destructive"],
    ["Atraso pagar", money(dashboard.data?.overduePayables), Receipt, "text-destructive"],
    ["Resultado", money(dashboard.data?.estimatedResult), Calculator, Number(dashboard.data?.estimatedResult ?? 0) >= 0 ? "text-success" : "text-destructive"],
    ["Pendente", money(summary.data?.pendingBalance), CircleDollarSign, "text-info"],
  ] as const;

  const shortcutCards = [
    ["Cartoes / TEF", money((transactions.data ?? []).filter((row) => row.paymentMethodName?.toLowerCase().includes("cart")).reduce((sum, row) => sum + outstanding(row), 0)), CreditCard],
    ["Boletos em aberto", `${(transactions.data ?? []).filter((row) => row.paymentMethodName?.toLowerCase().includes("boleto") && row.status !== "PAID").length}`, Receipt],
    ["Crediario", money(dashboard.data?.overdueReceivables), BookOpen],
    ["Comissoes", money((commissions.data ?? []).filter((row) => row.status === "PENDING").reduce((sum, row) => sum + Number(row.amount), 0)), ClipboardCheck],
    ["Conciliacao", `${allBankTransactions.filter((row) => row.status === "PENDING").length}`, ShieldCheck],
    ["DRE gerencial", money(dashboard.data?.estimatedResult), BarChart3],
  ] as const;

  function submitTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titleForm.description || titleForm.amount <= 0) {
      return;
    }
    createTitle.mutate();
  }

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSettlementTitle) {
      return;
    }
    settleTitle.mutate();
  }

  function submitCashMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCashSession || cashMovementForm.amount <= 0 || !cashMovementForm.description) {
      return;
    }
    createCashMovement.mutate();
  }

  function submitBankAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bankForm.name || !bankForm.bankName) {
      return;
    }
    createBankAccount.mutate();
  }

  function submitBankTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bankTransactionForm.bankAccountId || bankTransactionForm.amount <= 0 || !bankTransactionForm.description) {
      return;
    }
    createBankTransaction.mutate();
  }

  function submitChartAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chartForm.code || !chartForm.name) {
      return;
    }
    createChartAccount.mutate();
  }

  function submitCostCenter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!costCenterForm.code || !costCenterForm.name) {
      return;
    }
    createCostCenter.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-8">
        {cards.map(([label, value, Icon, iconClass]) => (
          <div key={label} className="erp-panel flex min-h-20 items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded bg-muted">
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12 xl:col-span-8" title="Dashboard financeiro">
        <div className="grid gap-3 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Previsao de caixa</span>
              <span>14 dias</span>
            </div>
            <div className="grid h-48 grid-cols-7 items-end gap-1 border-b border-border px-1">
              {(dashboard.data?.forecast ?? []).slice(0, 14).map((day) => {
                const maxValue = Math.max(...(dashboard.data?.forecast ?? []).flatMap((item) => [item.receivables, item.payables]), 1);
                const receiveHeight = Math.max((day.receivables / maxValue) * 100, day.receivables > 0 ? 8 : 0);
                const payHeight = Math.max((day.payables / maxValue) * 100, day.payables > 0 ? 8 : 0);
                return (
                  <div key={day.date} className="flex h-full flex-col justify-end gap-1">
                    <div className="flex h-36 items-end gap-0.5">
                      <div className="w-full rounded-t bg-success/70" style={{ height: `${receiveHeight}%` }} />
                      <div className="w-full rounded-t bg-destructive/70" style={{ height: `${payHeight}%` }} />
                    </div>
                    <div className="text-center text-[10px] text-muted-foreground">{new Date(day.date).getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/70" />Entradas</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/70" />Saidas</span>
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Alertas</span>
              <span>{dashboard.data?.alerts.length ?? 0}</span>
            </div>
            <div className="max-h-52 overflow-auto">
              <table className="erp-table">
                <thead><tr><th>Titulo</th><th>Venc.</th><th className="text-right">Aberto</th></tr></thead>
                <tbody>
                  {(dashboard.data?.alerts ?? []).map((row) => (
                    <tr key={row.id}>
                      <td><div className="font-medium">{row.client?.tradeName ?? row.supplierName ?? row.description}</div><div className="text-[11px] text-muted-foreground">{row.description}</div></td>
                      <td>{datePt(row.dueDate)}</td>
                      <td className="text-right tabular-nums font-semibold">{money(outstanding(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-4" title="Atalhos financeiros">
        <div className="grid grid-cols-2 gap-2">
          {shortcutCards.map(([label, value, Icon]) => (
            <div key={label} className="rounded border border-border bg-muted/30 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
                <Icon className="h-3.5 w-3.5 text-info" />
              </div>
              <div className="mt-1 text-base font-bold tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-5" title="Lancamento de titulos">
        <form className="space-y-2" onSubmit={submitTitle}>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tipo">
              <select className="erp-input" value={titleForm.type} onChange={(event) => setTitleForm({ ...titleForm, type: event.target.value as FinancialType })}>
                <option value="RECEIVABLE">A receber</option>
                <option value="PAYABLE">A pagar</option>
              </select>
            </Field>
            <Field label="Documento"><input className="erp-input" value={titleForm.documentNumber} onChange={(event) => setTitleForm({ ...titleForm, documentNumber: event.target.value })} /></Field>
            <Field label="Vencimento"><input className="erp-input" type="date" value={titleForm.dueDate} onChange={(event) => setTitleForm({ ...titleForm, dueDate: event.target.value })} /></Field>
          </div>
          <Field label="Descricao"><input className="erp-input" value={titleForm.description} onChange={(event) => setTitleForm({ ...titleForm, description: event.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Valor"><input className="erp-input text-right" type="number" step={0.01} value={titleForm.amount} onChange={(event) => setTitleForm({ ...titleForm, amount: Number(event.target.value) })} /></Field>
            <Field label="Parcelas"><input className="erp-input text-right" type="number" min={1} value={titleForm.installments} onChange={(event) => setTitleForm({ ...titleForm, installments: Number(event.target.value) })} /></Field>
            <Field label="Intervalo"><input className="erp-input text-right" type="number" min={1} value={titleForm.intervalDays} onChange={(event) => setTitleForm({ ...titleForm, intervalDays: Number(event.target.value) })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cliente">
              <select className="erp-input" value={titleForm.clientId} disabled={titleForm.type !== "RECEIVABLE"} onChange={(event) => setTitleForm({ ...titleForm, clientId: event.target.value })}>
                <option value="">Sem cliente</option>
                {(clients.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.tradeName}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor"><input className="erp-input" disabled={titleForm.type !== "PAYABLE"} value={titleForm.supplierName} onChange={(event) => setTitleForm({ ...titleForm, supplierName: event.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Categoria">
              <select className="erp-input" value={titleForm.categoryId} onChange={(event) => setTitleForm({ ...titleForm, categoryId: event.target.value })}>
                <option value="">Selecione</option>
                {(chartAccounts.data ?? []).filter((account) => account.type === titleForm.type).map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
              </select>
            </Field>
            <Field label="Centro custo">
              <select className="erp-input" value={titleForm.costCenterId} onChange={(event) => setTitleForm({ ...titleForm, costCenterId: event.target.value })}>
                <option value="">Selecione</option>
                {(costCenters.data ?? []).map((center) => <option key={center.id} value={center.id}>{center.code} - {center.name}</option>)}
              </select>
            </Field>
            <Field label="Forma pgto.">
              <select
                className="erp-input"
                value={titleForm.paymentMethodId}
                onChange={(event) => {
                  const selected = paymentMethods.data?.find((item) => item.id === event.target.value);
                  setTitleForm({ ...titleForm, paymentMethodId: event.target.value, paymentMethodName: selected?.name ?? "" });
                }}
              >
                <option value="">Selecione</option>
                {(paymentMethods.data ?? []).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </Field>
          </div>
          <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createTitle.isPending}>
            {createTitle.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Gerar titulo
          </button>
        </form>
      </Panel>

      <Panel className="col-span-12 xl:col-span-7" title="Baixa, recebimento e pagamento">
        <form className="grid gap-2 lg:grid-cols-6" onSubmit={submitSettlement}>
          <Field label="Titulo">
            <select
              className="erp-input"
              value={selectedSettlementTitle?.id ?? ""}
              onChange={(event) => {
                const selected = openTransactions.find((row) => row.id === event.target.value);
                setSettleForm({ ...settleForm, transactionId: event.target.value, amount: selected ? outstanding(selected) : 0 });
              }}
            >
              {openTransactions.map((row) => <option key={row.id} value={row.id}>{row.type === "RECEIVABLE" ? "REC" : "PAG"} - {row.description}</option>)}
            </select>
          </Field>
          <Field label="Valor"><input className="erp-input text-right" type="number" step={0.01} value={settleForm.amount || (selectedSettlementTitle ? outstanding(selectedSettlementTitle) : 0)} onChange={(event) => setSettleForm({ ...settleForm, amount: Number(event.target.value) })} /></Field>
          <Field label="Juros"><input className="erp-input text-right" type="number" step={0.01} value={settleForm.interestAmount} onChange={(event) => setSettleForm({ ...settleForm, interestAmount: Number(event.target.value) })} /></Field>
          <Field label="Multa"><input className="erp-input text-right" type="number" step={0.01} value={settleForm.penaltyAmount} onChange={(event) => setSettleForm({ ...settleForm, penaltyAmount: Number(event.target.value) })} /></Field>
          <Field label="Desconto"><input className="erp-input text-right" type="number" step={0.01} value={settleForm.discountAmount} onChange={(event) => setSettleForm({ ...settleForm, discountAmount: Number(event.target.value) })} /></Field>
          <Field label="Metodo">
            <select
              className="erp-input"
              value={settleForm.methodId}
              onChange={(event) => {
                const selected = paymentMethods.data?.find((item) => item.id === event.target.value);
                setSettleForm({ ...settleForm, methodId: event.target.value, methodName: selected?.name ?? "Dinheiro" });
              }}
            >
              <option value="">Dinheiro</option>
              {(paymentMethods.data ?? []).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select>
          </Field>
          <div className="lg:col-span-5">
            <Field label="Recibo / observacao"><input className="erp-input" value={settleForm.receiptNumber} onChange={(event) => setSettleForm({ ...settleForm, receiptNumber: event.target.value })} placeholder="Numero do recibo, NSU, PIX ou comprovante" /></Field>
          </div>
          <div className="flex items-end">
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={!selectedSettlementTitle || settleTitle.isPending}><CheckCircle2 className="h-3.5 w-3.5" />Baixar</button>
          </div>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded border border-border bg-muted/30 p-2">
            <div className="text-muted-foreground">Titulo selecionado</div>
            <div className="font-semibold">{selectedSettlementTitle?.description ?? "-"}</div>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2">
            <div className="text-muted-foreground">Saldo em aberto</div>
            <div className="font-semibold tabular-nums">{money(selectedSettlementTitle ? outstanding(selectedSettlementTitle) : 0)}</div>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-6" title="Contas a receber" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Cliente/Descricao</th><th>Parc.</th><th>Vencimento</th><th className="text-right">Aberto</th><th>Status</th></tr></thead>
          <tbody>
            {(transactions.data ?? []).filter((row) => row.type === "RECEIVABLE").slice(0, 12).map((row) => (
              <tr key={row.id}>
                <td><div className="font-medium">{row.client?.tradeName ?? row.description}</div><div className="text-[11px] text-muted-foreground">{row.documentNumber ?? row.paymentMethodName ?? "-"}</div></td>
                <td>{row.installmentNumber}/{row.totalInstallments}</td>
                <td>{datePt(row.dueDate)}</td>
                <td className="text-right font-semibold tabular-nums">{money(outstanding(row))}</td>
                <td><StatusBadge kind={financialStatusKind[row.status]}>{row.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 xl:col-span-6" title="Contas a pagar" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Fornecedor/Descricao</th><th>Parc.</th><th>Vencimento</th><th className="text-right">Aberto</th><th>Status</th></tr></thead>
          <tbody>
            {(transactions.data ?? []).filter((row) => row.type === "PAYABLE").slice(0, 12).map((row) => (
              <tr key={row.id}>
                <td><div className="font-medium">{row.supplierName ?? row.description}</div><div className="text-[11px] text-muted-foreground">{row.documentNumber ?? row.paymentMethodName ?? "-"}</div></td>
                <td>{row.installmentNumber}/{row.totalInstallments}</td>
                <td>{datePt(row.dueDate)}</td>
                <td className="text-right font-semibold tabular-nums">{money(outstanding(row))}</td>
                <td><StatusBadge kind={financialStatusKind[row.status]}>{row.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 xl:col-span-7" title="Caixa e movimento operacional">
        <div className="grid gap-3 lg:grid-cols-7">
          <form className="space-y-2 lg:col-span-2" onSubmit={(event) => { event.preventDefault(); openCash.mutate(); }}>
            <Field label="Saldo inicial"><input className="erp-input text-right" type="number" step={0.01} value={openingBalance} onChange={(event) => setOpeningBalance(Number(event.target.value))} /></Field>
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={openCash.isPending}><Banknote className="h-3.5 w-3.5" />Abrir caixa</button>
          </form>
          <form className="grid gap-2 lg:col-span-5 lg:grid-cols-5" onSubmit={submitCashMovement}>
            <Field label="Caixa">
              <select className="erp-input" value={activeCashSession?.id ?? ""} onChange={(event) => setCashMovementForm({ ...cashMovementForm, cashSessionId: event.target.value })}>
                {openCashSessions.map((session) => <option key={session.id} value={session.id}>{dateTimePt(session.openedAt)} - {session.openedBy.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className="erp-input" value={cashMovementForm.type} onChange={(event) => setCashMovementForm({ ...cashMovementForm, type: event.target.value as CashMovement["type"] })}>
                {Object.entries(cashMovementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Valor"><input className="erp-input text-right" type="number" step={0.01} value={cashMovementForm.amount} onChange={(event) => setCashMovementForm({ ...cashMovementForm, amount: Number(event.target.value) })} /></Field>
            <Field label="Forma"><input className="erp-input" value={cashMovementForm.methodName} onChange={(event) => setCashMovementForm({ ...cashMovementForm, methodName: event.target.value })} /></Field>
            <Field label="Descricao"><input className="erp-input" value={cashMovementForm.description} onChange={(event) => setCashMovementForm({ ...cashMovementForm, description: event.target.value })} /></Field>
            <div className="lg:col-span-5 flex gap-1.5">
              <button className="erp-btn flex-1 justify-center" disabled={!activeCashSession || createCashMovement.isPending}><Plus className="h-3.5 w-3.5" />Lancar movimento</button>
              <button type="button" className="erp-btn" disabled={!activeCashSession || closeCash.isPending} onClick={() => activeCashSession && closeCash.mutate(activeCashSession)}><ClipboardCheck className="h-3.5 w-3.5" />Fechar caixa</button>
            </div>
          </form>
        </div>
        <div className="mt-3 max-h-[260px] overflow-auto">
          <table className="erp-table">
            <thead><tr><th>Operador</th><th>Abertura</th><th className="text-right">Saldo atual</th><th>Status</th><th>Ultimos movimentos</th></tr></thead>
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

      <Panel className="col-span-12 xl:col-span-5" title="Bancos e conciliacao">
        <form className="grid gap-2 md:grid-cols-5" onSubmit={submitBankTransaction}>
          <Field label="Conta">
            <select className="erp-input" value={bankTransactionForm.bankAccountId} onChange={(event) => setBankTransactionForm({ ...bankTransactionForm, bankAccountId: event.target.value })}>
              <option value="">Selecione</option>
              {(bankAccounts.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className="erp-input" value={bankTransactionForm.type} onChange={(event) => setBankTransactionForm({ ...bankTransactionForm, type: event.target.value as BankTransaction["type"] })}>
              <option value="CREDIT">Credito</option>
              <option value="DEBIT">Debito</option>
            </select>
          </Field>
          <Field label="Valor"><input className="erp-input text-right" type="number" step={0.01} value={bankTransactionForm.amount} onChange={(event) => setBankTransactionForm({ ...bankTransactionForm, amount: Number(event.target.value) })} /></Field>
          <Field label="Referencia"><input className="erp-input" value={bankTransactionForm.reference} onChange={(event) => setBankTransactionForm({ ...bankTransactionForm, reference: event.target.value })} /></Field>
          <Field label="Descricao"><input className="erp-input" value={bankTransactionForm.description} onChange={(event) => setBankTransactionForm({ ...bankTransactionForm, description: event.target.value })} /></Field>
          <div className="md:col-span-5">
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createBankTransaction.isPending}><Landmark className="h-3.5 w-3.5" />Lancar no banco</button>
          </div>
        </form>
        <form className="mt-3 grid gap-2 border-t border-border pt-3 md:grid-cols-5" onSubmit={submitBankAccount}>
          <Field label="Conta"><input className="erp-input" value={bankForm.name} onChange={(event) => setBankForm({ ...bankForm, name: event.target.value })} /></Field>
          <Field label="Banco"><input className="erp-input" value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} /></Field>
          <Field label="Agencia"><input className="erp-input" value={bankForm.agency} onChange={(event) => setBankForm({ ...bankForm, agency: event.target.value })} /></Field>
          <Field label="Numero"><input className="erp-input" value={bankForm.accountNumber} onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })} /></Field>
          <Field label="Saldo"><input className="erp-input text-right" type="number" step={0.01} value={bankForm.balance} onChange={(event) => setBankForm({ ...bankForm, balance: Number(event.target.value) })} /></Field>
          <div className="md:col-span-5">
            <button className="erp-btn w-full justify-center" disabled={createBankAccount.isPending}><Plus className="h-3.5 w-3.5" />Cadastrar conta bancaria</button>
          </div>
        </form>
        <div className="mt-3 max-h-[220px] overflow-auto">
          <table className="erp-table">
            <thead><tr><th>Conta</th><th>Banco</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {(bankAccounts.data ?? []).map((account) => (
                <tr key={account.id}>
                  <td className="font-semibold">{account.name}</td>
                  <td>{account.bankName}</td>
                  <td className="text-right font-semibold tabular-nums">{money(account.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-6" title="Plano de contas e centro de custo">
        <div className="grid gap-3 lg:grid-cols-2">
          <form className="space-y-2" onSubmit={submitChartAccount}>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Codigo"><input className="erp-input" value={chartForm.code} onChange={(event) => setChartForm({ ...chartForm, code: event.target.value })} /></Field>
              <Field label="Tipo">
                <select className="erp-input" value={chartForm.type} onChange={(event) => setChartForm({ ...chartForm, type: event.target.value as FinancialType })}>
                  <option value="RECEIVABLE">Receita</option>
                  <option value="PAYABLE">Despesa</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button className="erp-btn w-full justify-center" disabled={createChartAccount.isPending}><Plus className="h-3.5 w-3.5" />Conta</button>
              </div>
            </div>
            <Field label="Nome"><input className="erp-input" value={chartForm.name} onChange={(event) => setChartForm({ ...chartForm, name: event.target.value })} /></Field>
          </form>
          <form className="space-y-2" onSubmit={submitCostCenter}>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Codigo"><input className="erp-input" value={costCenterForm.code} onChange={(event) => setCostCenterForm({ ...costCenterForm, code: event.target.value })} /></Field>
              <div className="col-span-2 flex items-end">
                <button className="erp-btn w-full justify-center" disabled={createCostCenter.isPending}><Plus className="h-3.5 w-3.5" />Centro de custo</button>
              </div>
            </div>
            <Field label="Nome"><input className="erp-input" value={costCenterForm.name} onChange={(event) => setCostCenterForm({ ...costCenterForm, name: event.target.value })} /></Field>
          </form>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="max-h-44 overflow-auto">
            <table className="erp-table">
              <thead><tr><th>Codigo</th><th>Conta</th><th>Tipo</th></tr></thead>
              <tbody>{(chartAccounts.data ?? []).map((account) => <tr key={account.id}><td className="font-mono">{account.code}</td><td>{account.name}</td><td>{account.type}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="max-h-44 overflow-auto">
            <table className="erp-table">
              <thead><tr><th>Codigo</th><th>Centro</th></tr></thead>
              <tbody>{(costCenters.data ?? []).map((center) => <tr key={center.id}><td className="font-mono">{center.code}</td><td>{center.name}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-6" title="Comissoes, auditoria e repasses" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Vendedor</th><th>Cliente</th><th className="text-right">%</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {(commissions.data ?? []).slice(0, 8).map((commission) => (
              <tr key={commission.id}>
                <td>{commission.seller.name}</td>
                <td>{commission.order.client.tradeName}</td>
                <td className="text-right tabular-nums">{numberPt(commission.percentage, 2)}%</td>
                <td className="text-right font-semibold tabular-nums">{money(commission.amount)}</td>
                <td><StatusBadge kind={commission.status === "PAID" ? "success" : commission.status === "CANCELLED" ? "muted" : "warning"}>{commission.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12" title="Extrato financeiro recente" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Tipo</th><th>Descricao</th><th>Documento</th><th>Vencimento</th><th>Baixa</th><th className="text-right">Valor</th><th className="text-right">Pago</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(transactions.data ?? []).slice(0, 20).map((row) => (
              <tr key={row.id}>
                <td>{row.type === "RECEIVABLE" ? "Receber" : "Pagar"}</td>
                <td><div className="font-medium">{row.description}</div><div className="text-[11px] text-muted-foreground">{row.client?.tradeName ?? row.supplierName ?? row.paymentMethodName ?? "-"}</div></td>
                <td className="font-mono text-[11.5px]">{row.documentNumber ?? "-"}</td>
                <td>{datePt(row.dueDate)}</td>
                <td>{datePt(row.paidAt)}</td>
                <td className="text-right tabular-nums font-semibold">{money(row.amount)}</td>
                <td className="text-right tabular-nums">{money(row.paidAmount)}</td>
                <td><StatusBadge kind={financialStatusKind[row.status]}>{row.status}</StatusBadge></td>
                <td className="text-right">
                  {row.status === "PAID" && (
                    <button className="erp-btn" onClick={() => reopenTitle.mutate(row.id)} disabled={reopenTitle.isPending}>
                      <RefreshCw className="h-3.5 w-3.5" />Reabrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
