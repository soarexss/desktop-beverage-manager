import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import {
  chargeActive,
  chargeLabels,
  type PaymentTerminal,
  type TerminalCharge,
} from "@/lib/card-payments";
import { money } from "@/lib/format";
import { Field } from "./erp";

export function CardPaymentPanel({ orderId }: { orderId: string }) {
  const cache = useQueryClient();
  const [terminalId, setTerminalId] = useState("");
  const [nsu, setNsu] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [manualPaid, setManualPaid] = useState(false);
  // Kept across retries, including a timed-out response. The server also reserves the order.
  const requestId = useRef(crypto.randomUUID());
  const terminals = useQuery({
    queryKey: ["payment-terminals"],
    queryFn: () => apiGet<PaymentTerminal[]>("/card-payments/terminals"),
  });
  const charges = useQuery({
    queryKey: ["terminal-charges", orderId],
    queryFn: () => apiGet<TerminalCharge[]>(`/card-payments/charges?orderId=${orderId}`),
    refetchInterval: 5000,
  });
  const balance = useQuery({
    queryKey: ["terminal-balance", orderId],
    queryFn: () =>
      apiGet<{ amount: string; orderStatus: string }>(`/card-payments/balance?orderId=${orderId}`),
    refetchInterval: 5000,
  });
  const current = charges.data?.[0];
  const reserved = charges.data?.some(chargeActive);
  const terminal = terminals.data?.find((item) => item.id === terminalId);
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["terminal-charges", orderId] });
    void cache.invalidateQueries({ queryKey: ["terminal-balance", orderId] });
    void cache.invalidateQueries({ queryKey: ["financial"] });
    void cache.invalidateQueries({ queryKey: ["orders"] });
  };
  const create = useMutation({
    mutationFn: () =>
      apiPost<TerminalCharge>("/card-payments/charges", {
        requestId: requestId.current,
        orderId,
        terminalId,
      }),
    onSuccess: refresh,
    onError: refresh,
  });
  const sync = useMutation({
    mutationFn: (id: string) => apiPost<TerminalCharge>(`/card-payments/charges/${id}/sync`, {}),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => apiPost<TerminalCharge>(`/card-payments/charges/${id}/cancel`, {}),
    onSuccess: refresh,
    onError: refresh,
  });
  const manual = useMutation({
    mutationFn: () =>
      apiPost("/card-payments/manual", {
        requestId: requestId.current,
        orderId,
        terminalId,
        nsu,
        confirmed,
        amount: Number(balance.data?.amount),
      }),
    onSuccess: () => {
      setManualPaid(true);
      refresh();
    },
  });
  const latestSync = useRef(sync.mutate);
  latestSync.current = sync.mutate;
  useEffect(() => {
    // Poll only known pending resources. An unknown creation outcome is retried explicitly.
    if (current?.status !== "PENDING" || !current.externalId) return;
    const timer = window.setInterval(() => latestSync.current(current.id), 15000);
    return () => window.clearInterval(timer);
  }, [current?.id, current?.status, current?.externalId]);
  const busy = create.isPending || sync.isPending || cancel.isPending || manual.isPending;
  const paid = manualPaid || Boolean(current?.paymentId) || balance.data?.amount === "0.00";
  const errors = [
    terminals.error,
    charges.error,
    balance.error,
    create.error,
    sync.error,
    cancel.error,
    manual.error,
  ].filter(Boolean);
  return (
    <section aria-label="Pagamento por maquininha" className="mt-3 space-y-2 border p-3">
      <p className="font-semibold">Pagamento por maquininha</p>
      {balance.data && (
        <p className="text-sm">
          Saldo pendente: <strong>{money(balance.data.amount)}</strong>
        </p>
      )}
      {(terminals.isPending || charges.isPending) && (
        <p role="status" className="text-sm">
          Carregando terminais e cobranças…
        </p>
      )}
      {errors.map((error, index) => (
        <p key={index} role="alert" className="text-sm text-destructive">
          {error?.message}
        </p>
      ))}
      {(terminals.isError || charges.isError) && (
        <button
          className="erp-btn"
          onClick={() => {
            void terminals.refetch();
            void charges.refetch();
          }}
        >
          Tentar carregar novamente
        </button>
      )}
      {current && (
        <div role="status" className="border p-2 text-sm">
          <p>
            {chargeLabels[current.status]} · {money(current.amount)}
          </p>
          {current.externalId && (
            <p className="break-all text-xs">Referência: {current.externalId}</p>
          )}
          {current.cancellationRequested && chargeActive(current) && (
            <p>Cancelamento solicitado; aguardando confirmação do provedor.</p>
          )}
          {current.status === "REVIEW" && (
            <p>
              Não cobre novamente. Confira a transação no Mercado Pago e procure o suporte para
              conciliar a divergência ou estorno.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="erp-btn" disabled={busy} onClick={() => sync.mutate(current.id)}>
              Consultar status no provedor
            </button>
            {chargeActive(current) && !current.paymentId && (
              <button
                className="erp-btn"
                disabled={busy || !current.externalId}
                onClick={() => {
                  if (
                    window.confirm(
                      "Solicitar cancelamento da cobrança na maquininha? O pedido será mantido até a confirmação.",
                    )
                  )
                    cancel.mutate(current.id);
                }}
              >
                Cancelar cobrança
              </button>
            )}
          </div>
          {["FAILED", "CANCELLED", "EXPIRED"].includes(current.status) && (
            <button
              className="erp-btn mt-2"
              disabled={busy}
              onClick={() => {
                requestId.current = crypto.randomUUID();
                create.reset();
              }}
            >
              Preparar nova tentativa
            </button>
          )}
        </div>
      )}
      {manualPaid && (
        <p role="status" className="text-sm">
          Pagamento registrado por conferência do operador.
        </p>
      )}
      {!reserved && !paid && balance.data && balance.data.orderStatus !== "CANCELLED" && (
        <>
          <Field label="Maquininha do caixa">
            <select
              aria-label="Maquininha do caixa"
              className="erp-input"
              disabled={busy || !terminals.data || !charges.data}
              value={terminalId}
              onChange={(event) => {
                setTerminalId(event.target.value);
                requestId.current = crypto.randomUUID();
                create.reset();
                manual.reset();
                setConfirmed(false);
              }}
            >
              <option value="">Selecione a maquininha</option>
              {terminals.data
                ?.filter((item) => item.isActive)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.label} · {item.model} ·{" "}
                    {item.mode === "INTEGRATED" ? "integrado" : "manual"}
                  </option>
                ))}
            </select>
          </Field>
          {terminal?.mode === "INTEGRATED" && (
            <>
              <p className="text-xs">
                O saldo pendente será enviado ao terminal. A baixa só ocorre após confirmação do
                Mercado Pago.
              </p>
              <button
                className="erp-btn erp-btn-primary"
                disabled={busy || !charges.data || charges.isError}
                onClick={() => create.mutate()}
              >
                {create.isPending ? "Enviando cobrança…" : "Enviar valor à maquininha"}
              </button>
            </>
          )}
          {terminal?.mode === "MANUAL" && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                manual.mutate();
              }}
            >
              <p className="text-xs">
                Digite o saldo pendente na maquininha. Após a aprovação, confira valor e comprovante
                antes de registrar aqui. Não há consulta automática nesta provedora.
              </p>
              <Field label="NSU ou referência do comprovante">
                <input
                  aria-label="NSU ou referência do comprovante"
                  required
                  minLength={3}
                  maxLength={80}
                  className="erp-input"
                  value={nsu}
                  disabled={busy}
                  onChange={(event) => setNsu(event.target.value)}
                />
              </Field>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={confirmed}
                  required
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Conferi a aprovação e o valor correspondente ao saldo deste pedido no comprovante.
              </label>
              <button
                className="erp-btn"
                disabled={busy || !confirmed || nsu.trim().length < 3 || !charges.data}
              >
                {manual.isPending ? "Registrando…" : "Registrar pagamento conferido"}
              </button>
            </form>
          )}
        </>
      )}
      {terminals.isSuccess && !terminals.data.some((item) => item.isActive) && (
        <p className="text-sm">Nenhuma maquininha ativa. Solicite o cadastro ao administrador.</p>
      )}
      <Link to="/maquininhas" className="inline-block text-xs underline">
        Consultar e configurar maquininhas
      </Link>
    </section>
  );
}
