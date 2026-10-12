import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { chargeLabels, type TerminalCharge } from "@/lib/card-payments";
import { money } from "@/lib/format";
import { Panel } from "./erp";

export function TerminalChargeMonitor() {
  const cache = useQueryClient();
  const charges = useQuery({
    queryKey: ["pending-terminal-charges"],
    queryFn: () =>
      apiGet<Array<TerminalCharge & { terminal: { label: string } }>>(
        "/card-payments/charges/pending",
      ),
    refetchInterval: 15000,
  });
  const sync = useMutation({
    mutationFn: (id: string) => apiPost(`/card-payments/charges/${id}/sync`, {}),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["pending-terminal-charges"] });
    },
  });
  return (
    <Panel title="Cobranças que precisam de acompanhamento">
      <p className="mb-2 text-xs text-muted-foreground">
        Até 100 cobranças pendentes ou em revisão, começando pelas mais antigas. Uma divergência ou
        estorno requer conferência no provedor; consultar não apaga o histórico.
      </p>
      {charges.isPending && <p role="status">Carregando cobranças…</p>}
      {(charges.error || sync.error) && (
        <p role="alert" className="text-sm text-destructive">
          {charges.error?.message ?? sync.error?.message}
        </p>
      )}
      {charges.isError && (
        <button className="erp-btn" onClick={() => void charges.refetch()}>
          Tentar novamente
        </button>
      )}
      {charges.isSuccess && !charges.data.length && (
        <p>Nenhuma cobrança pendente de acompanhamento.</p>
      )}
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Pedido / cobrança</th>
              <th>Caixa</th>
              <th>Valor</th>
              <th>Situação</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {charges.data?.map((charge) => (
              <tr key={charge.id}>
                <td>
                  <p>{charge.orderId}</p>
                  <p className="text-xs">{charge.externalId ?? charge.id}</p>
                </td>
                <td>{charge.terminal.label}</td>
                <td>{money(charge.amount)}</td>
                <td>{chargeLabels[charge.status]}</td>
                <td>
                  <button
                    className="erp-btn"
                    disabled={sync.isPending}
                    onClick={() => sync.mutate(charge.id)}
                  >
                    Consultar no provedor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
