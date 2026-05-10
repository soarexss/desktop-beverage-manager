import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, Save } from "lucide-react";
import { Panel, Field, StatusBadge } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { datePt } from "@/lib/format";

export const Route = createFileRoute("/cadastros")({ component: Cadastros });

const registryLabels: Record<string, string> = {
  ESTABLISHMENT: "Estabelecimentos",
  OPERATION_NATURE: "Natureza das operacoes",
  TAX_CATEGORY: "Categorias de impostos",
  TAX_RULE: "Regras de impostos",
  SUPPLIER: "Fornecedores",
  SELLER: "Vendedores",
  PAYMENT_METHOD: "Formas de pagamento",
  CITY: "Cidades",
  ACTIVITY_PROFILE: "Ramo de atividade / perfil",
  BRAND: "Marcas",
  UNIT: "Unidades",
  SECTION: "Secoes",
  PRODUCT_GROUP: "Grupos de mercadorias",
  PRODUCT_SUBGROUP: "Subgrupos",
  ICMS_ISS_CALC_FUNCTION: "Funcoes ICMS/ISS",
  COMPLEMENT_SUBSTANCE: "Complementos / substancias",
  PROJECT: "Projetos",
  PLATFORM: "Plataformas",
  NCM_CODE: "Codigos NCM",
  CFOP_CODE: "Codigos fiscais / CFOP",
  FREIGHT_TABLE: "Tabela de fretes",
  CARRIER: "Transportadoras",
  VEHICLE: "Veiculos",
};

type RegistryEntry = {
  id: string;
  type: string;
  code?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type RegistrySummary = {
  type: string;
  count: number;
};

function Cadastros() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("SUPPLIER");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const summary = useQuery({
    queryKey: ["registries-summary"],
    queryFn: () => apiGet<RegistrySummary[]>("/registries/summary"),
  });

  const entries = useQuery({
    queryKey: ["registries", type],
    queryFn: () => apiGet<RegistryEntry[]>(`/registries?type=${type}`),
  });

  const createEntry = useMutation({
    mutationFn: () =>
      apiPost<RegistryEntry>("/registries", {
        type,
        code: code || undefined,
        name,
        description: description || undefined,
      }),
    onSuccess: () => {
      setCode("");
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["registries"] });
      queryClient.invalidateQueries({ queryKey: ["registries-summary"] });
    },
  });

  const sortedSummary = useMemo(
    () => [...(summary.data ?? [])].sort((a, b) => registryLabels[a.type].localeCompare(registryLabels[b.type])),
    [summary.data],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    createEntry.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel
        className="col-span-12"
        title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Cadastros base do ERP</span>}
        actions={<button className="erp-btn" onClick={() => summary.refetch()}><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>}
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {sortedSummary.map((item) => (
            <button
              key={item.type}
              className={`rounded border p-2 text-left ${item.type === type ? "border-accent bg-accent/10" : "bg-card hover:bg-muted"}`}
              onClick={() => setType(item.type)}
            >
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{registryLabels[item.type]}</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{item.count}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title={`Novo cadastro - ${registryLabels[type]}`}>
        <form className="space-y-2" onSubmit={submit}>
          <Field label="Tipo">
            <select className="erp-input" value={type} onChange={(event) => setType(event.target.value)}>
              {Object.entries(registryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Codigo">
            <input className="erp-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex: 5102, AMB, CX12" />
          </Field>
          <Field label="Nome">
            <input className="erp-input" value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Descricao">
            <textarea className="erp-input min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createEntry.isPending}>
            {createEntry.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar cadastro
          </button>
        </form>
      </Panel>

      <Panel
        className="col-span-12 lg:col-span-8"
        title={registryLabels[type]}
        actions={<span className="text-[11px] text-muted-foreground">{entries.data?.length ?? 0} registros</span>}
        bodyClassName="p-0"
      >
        <table className="erp-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nome</th>
              <th>Descricao</th>
              <th>Criado em</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(entries.data ?? []).map((entry) => (
              <tr key={entry.id}>
                <td className="font-mono">{entry.code ?? "-"}</td>
                <td className="font-semibold">{entry.name}</td>
                <td className="text-muted-foreground">{entry.description ?? "-"}</td>
                <td>{datePt(entry.createdAt)}</td>
                <td><StatusBadge kind={entry.isActive ? "success" : "muted"}>{entry.isActive ? "Ativo" : "Inativo"}</StatusBadge></td>
              </tr>
            ))}
            {!entries.isLoading && !entries.data?.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum registro nesse cadastro. Use o formulario ao lado para criar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12" title="Cobertura dos cadastros solicitados">
        <div className="grid gap-2 text-[12.5px] md:grid-cols-3">
          <div className="rounded border bg-card p-3">Estabelecimento, operacoes, impostos ICMS/ISS, NCM e CFOP ficam centralizados em Cadastros fiscais.</div>
          <div className="rounded border bg-card p-3">Fornecedores, vendedores, formas de pagamento, cidades e perfis ficam prontos para vinculo nos fluxos comerciais.</div>
          <div className="rounded border bg-card p-3">Grupos, subgrupos, marcas, unidades, secoes, projetos e plataformas alimentam produtos, PDV e integracoes.</div>
        </div>
      </Panel>
    </div>
  );
}
