import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, Field } from "@/components/erp";
import { TerminalChargeMonitor } from "@/components/terminal-charge-monitor";
import { useAuth } from "@/components/auth-context";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { PaymentTerminal, TerminalCatalog } from "@/lib/card-payments";

export const Route = createFileRoute("/maquininhas")({ component: Maquininhas });
type Connection = {
  configured: boolean;
  connected: boolean;
  merchantId: string | null;
  liveMode: boolean | null;
};
type RemoteTerminal = { id: string; operating_mode: string; store_id?: string; pos_id?: string };

function Maquininhas() {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const cache = useQueryClient();
  const [provider, setProvider] = useState("MERCADO_PAGO");
  const [model, setModel] = useState("Point Smart 2");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"MANUAL" | "INTEGRATED">("MANUAL");
  const [externalId, setExternalId] = useState("");
  const catalog = useQuery({
    queryKey: ["terminal-catalog"],
    queryFn: () => apiGet<TerminalCatalog[]>("/card-payments/catalog"),
  });
  const terminals = useQuery({
    queryKey: ["payment-terminals"],
    queryFn: () => apiGet<PaymentTerminal[]>("/card-payments/terminals"),
  });
  const connection = useQuery({
    queryKey: ["payment-connection"],
    queryFn: () => apiGet<Connection>("/card-payments/connection"),
    enabled: admin,
  });
  const remote = useQuery({
    queryKey: ["remote-terminals"],
    queryFn: () => apiGet<RemoteTerminal[]>("/card-payments/mercado-pago/terminals"),
    enabled: false,
  });
  const selected = catalog.data?.find((entry) => entry.provider === provider);
  const authorize = useMutation({
    mutationFn: () =>
      apiPost<{ authorizationUrl: string }>("/card-payments/mercado-pago/authorize", {}),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
  });
  const disconnect = useMutation({
    mutationFn: () => apiPost("/card-payments/connection/disconnect", {}),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["payment-connection"] });
      void cache.invalidateQueries({ queryKey: ["payment-terminals"] });
      cache.removeQueries({ queryKey: ["remote-terminals"] });
      setExternalId("");
    },
  });
  const save = useMutation({
    mutationFn: () =>
      apiPost("/card-payments/terminals", {
        provider,
        model,
        label,
        mode,
        ...(mode === "INTEGRATED" ? { externalId } : {}),
      }),
    onSuccess: () => {
      setLabel("");
      setExternalId("");
      void cache.invalidateQueries({ queryKey: ["payment-terminals"] });
    },
  });
  const active = useMutation({
    mutationFn: (terminal: PaymentTerminal) =>
      apiPatch(`/card-payments/terminals/${terminal.id}`, { isActive: !terminal.isActive }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["payment-terminals"] });
    },
  });
  const errors = [
    catalog.error,
    terminals.error,
    connection.error,
    remote.error,
    authorize.error,
    disconnect.error,
    save.error,
    active.error,
  ].filter(Boolean);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Maquininhas e contas de recebimento</h1>
      <p className="text-sm text-muted-foreground">
        Cadastre os aparelhos da loja. O modo manual funciona com qualquer provedora; no integrado,
        o ERP envia o valor e consulta a confirmação do pagamento.
      </p>
      {typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mp") === "error" && (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível conectar a conta. Confira a configuração, use a conta recebedora desta
            loja e inicie a autorização novamente.
          </p>
        )}
      {errors.map((error, index) => (
        <p role="alert" className="text-sm text-destructive" key={index}>
          {error?.message}
        </p>
      ))}
      {(catalog.isPending || terminals.isPending) && <p role="status">Carregando maquininhas…</p>}
      {(catalog.isError || terminals.isError) && (
        <button
          className="erp-btn"
          onClick={() => {
            void catalog.refetch();
            void terminals.refetch();
          }}
        >
          Tentar novamente
        </button>
      )}
      {admin && (
        <Panel title="Conta Mercado Pago da loja">
          <p className="mb-2 text-sm">
            {connection.isPending
              ? "Consultando conexão…"
              : connection.data?.connected
                ? `Conta ${connection.data.merchantId} conectada · ${connection.data.liveMode ? "Produção" : "Teste — não recebe pagamentos reais"}`
                : "Conta ainda não conectada."}
          </p>
          {connection.data && !connection.data.configured && (
            <p className="mb-2 text-sm">
              O responsável pela hospedagem precisa configurar a aplicação Mercado Pago e HTTPS. O
              cadastro manual já pode ser utilizado.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="erp-btn"
              disabled={!connection.data?.configured || authorize.isPending}
              onClick={() => authorize.mutate()}
            >
              {authorize.isPending
                ? "Abrindo autorização…"
                : connection.data?.connected
                  ? "Renovar autorização da conta"
                  : "Conectar Mercado Pago"}
            </button>
            <button className="erp-btn" onClick={() => void connection.refetch()}>
              Atualizar conexão
            </button>
            {connection.data?.connected && (
              <button
                className="erp-btn"
                disabled={disconnect.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Desconectar a conta e desativar seus terminais integrados? O histórico será preservado.",
                    )
                  )
                    disconnect.mutate();
                }}
              >
                Desconectar
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Autorize a conta recebedora do lojista. Configure loja/caixa e modo PDV no Mercado Pago
            antes de selecionar o terminal. O dinheiro segue as condições dessa conta; a mensalidade
            do ERP é separada.
          </p>
        </Panel>
      )}
      {admin && (
        <Panel title="Cadastrar maquininha">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Provedora">
              <select
                aria-label="Provedora"
                className="erp-input"
                value={provider}
                onChange={(event) => {
                  const entry = catalog.data?.find((item) => item.provider === event.target.value);
                  setProvider(event.target.value);
                  setModel(entry?.models[0] ?? "Outro modelo");
                  setMode("MANUAL");
                  setExternalId("");
                }}
              >
                {catalog.data?.map((entry) => (
                  <option key={entry.provider} value={entry.provider}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <input
                aria-label="Modelo"
                list="terminal-models"
                className="erp-input"
                required
                maxLength={80}
                minLength={2}
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
              <datalist id="terminal-models">
                {selected?.models.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <Field label="Nome no caixa">
              <input
                aria-label="Nome no caixa"
                className="erp-input"
                placeholder="Ex.: Balcão 1"
                required
                minLength={2}
                maxLength={80}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
            <Field label="Modo de operação">
              <select
                aria-label="Modo de operação"
                className="erp-input"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as "MANUAL" | "INTEGRATED");
                  setExternalId("");
                }}
              >
                <option value="MANUAL">Manual — digitar valor e conferir comprovante</option>
                {selected?.automatic && (
                  <option value="INTEGRATED">Integrado — Mercado Pago Point</option>
                )}
              </select>
            </Field>
            {mode === "INTEGRATED" && (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="erp-btn mb-2"
                  disabled={!connection.data?.connected || remote.isFetching}
                  onClick={() => void remote.refetch()}
                >
                  {remote.isFetching ? "Buscando…" : "Buscar terminais da conta"}
                </button>
                <Field label="Terminal vinculado ao caixa">
                  <select
                    aria-label="Terminal vinculado ao caixa"
                    required
                    className="erp-input"
                    value={externalId}
                    onChange={(event) => setExternalId(event.target.value)}
                  >
                    <option value="">Selecione o aparelho pelo número de série</option>
                    {remote.data?.map((terminal) => (
                      <option
                        key={terminal.id}
                        value={terminal.id}
                        disabled={terminal.operating_mode !== "PDV"}
                      >
                        {terminal.id} · {terminal.operating_mode}
                      </option>
                    ))}
                  </select>
                </Field>
                {remote.isSuccess && !remote.data.length && (
                  <p className="text-xs">
                    Nenhum terminal encontrado. Vincule o aparelho à conta da loja.
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
              {selected?.automatic
                ? "Smart 1/2 e Pro 2/3 usam a mesma integração. A seleção do modelo identifica o cadastro; a API verifica a conta e o modo PDV do aparelho."
                : "Cobrança automática não implementada para esta provedora. O cadastro permite registrar pagamentos conferidos na maquininha, sem confirmação bancária automática."}
            </p>
            <button
              className="erp-btn erp-btn-primary"
              disabled={
                save.isPending ||
                !catalog.data ||
                (mode === "INTEGRATED" && (!externalId || !connection.data?.connected))
              }
            >
              {save.isPending ? "Salvando…" : "Cadastrar maquininha"}
            </button>
            {save.isSuccess && (
              <p role="status" className="text-sm">
                Maquininha cadastrada.
              </p>
            )}
          </form>
        </Panel>
      )}
      <Panel title="Aparelhos cadastrados">
        {terminals.isSuccess && !terminals.data.length && (
          <p className="text-sm">
            Nenhuma maquininha cadastrada.{!admin && " Solicite o cadastro ao administrador."}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Caixa</th>
                <th>Provedora / modelo</th>
                <th>Operação</th>
                <th>Situação</th>
                {admin && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {terminals.data?.map((terminal) => (
                <tr key={terminal.id}>
                  <td>{terminal.label}</td>
                  <td>
                    {catalog.data?.find((entry) => entry.provider === terminal.provider)?.name} ·{" "}
                    {terminal.model}
                  </td>
                  <td>{terminal.mode === "INTEGRATED" ? "Integrado" : "Conferência manual"}</td>
                  <td>{terminal.isActive ? "Ativo" : "Inativo"}</td>
                  {admin && (
                    <td>
                      <button
                        className="erp-btn"
                        disabled={active.isPending}
                        onClick={() => active.mutate(terminal)}
                      >
                        {terminal.isActive ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Compatibilidade do ERP">
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.data?.map((entry) => (
            <div key={entry.provider} className="border p-3">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-xs">{entry.models.join(", ")}</p>
              <p className="mt-1 text-sm">
                {entry.automatic
                  ? "Conector Point implementado — exige configuração e validação no aparelho."
                  : "Registro manual disponível — integração automática ainda indisponível."}
              </p>
              {entry.documentation && (
                <a
                  className="text-xs underline"
                  href={entry.documentation}
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentação da provedora
                </a>
              )}
            </div>
          ))}
        </div>
      </Panel>
      {(admin || user.role === "financeiro") && <TerminalChargeMonitor />}
    </div>
  );
}
