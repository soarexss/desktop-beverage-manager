import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import {
  BadgePercent,
  Building2,
  ClipboardList,
  Filter,
  Landmark,
  Layers3,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Truck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
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

const registryGroups = [
  {
    id: "empresa",
    title: "Estabelecimento e fiscal",
    icon: Building2,
    description: "Empresa, filial, operacoes, impostos, NCM, CFOP e funcoes fiscais.",
    types: ["ESTABLISHMENT", "OPERATION_NATURE", "TAX_CATEGORY", "TAX_RULE", "ICMS_ISS_CALC_FUNCTION", "NCM_CODE", "CFOP_CODE"],
  },
  {
    id: "produtos",
    title: "Produtos e classificacao",
    icon: Package,
    description: "Marcas, unidades, secoes, grupos, subgrupos, complementos, projetos e plataformas.",
    types: ["BRAND", "UNIT", "SECTION", "PRODUCT_GROUP", "PRODUCT_SUBGROUP", "COMPLEMENT_SUBSTANCE", "PROJECT", "PLATFORM"],
  },
  {
    id: "comercial",
    title: "Comercial e clientes",
    icon: Users,
    description: "Fornecedores, vendedores, formas de pagamento, cidades e perfis de clientes.",
    types: ["SUPPLIER", "SELLER", "PAYMENT_METHOD", "CITY", "ACTIVITY_PROFILE"],
  },
  {
    id: "logistica",
    title: "Logistica e entregas",
    icon: Truck,
    description: "Fretes, transportadoras, veiculos e bases para entrega.",
    types: ["FREIGHT_TABLE", "CARRIER", "VEHICLE"],
  },
];

const operationalCards = [
  { title: "Produtos", text: "Cadastro de produto, balanco, tabela de preco, kits, NCM e integracoes.", to: "/estoque", icon: Package },
  { title: "Clientes", text: "Cadastro completo, cadastro reduzido, agenda, cidades, perfil e credito.", to: "/clientes", icon: Users },
  { title: "Compras", text: "Entradas, fornecedores, associacao produto-fornecedor e devolucao.", to: "/compras", icon: ClipboardList },
  { title: "Financeiro", text: "Formas, condicoes, caixa, bancos, boletos, cheques e centro de custo.", to: "/financeiro", icon: WalletCards },
  { title: "Fiscal", text: "Natureza da operacao, CFOP, NCM, NF-e, SPED, Sintegra e MDF-e.", to: "/notas", icon: Landmark },
  { title: "Relatorios", text: "Relatorios gerais, financeiros, estoque, fiscal e exportacoes.", to: "/relatorios", icon: BadgePercent },
];

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
  const [activeGroup, setActiveGroup] = useState("comercial");
  const [search, setSearch] = useState("");
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

  const countByType = useMemo(() => new Map((summary.data ?? []).map((item) => [item.type, item.count])), [summary.data]);
  const selectedGroup = registryGroups.find((group) => group.id === activeGroup) ?? registryGroups[0];
  const filteredEntries = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (entries.data ?? []).filter((entry) => {
      if (!normalized) {
        return true;
      }
      return [entry.code, entry.name, entry.description].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [entries.data, search]);

  const totalRecords = (summary.data ?? []).reduce((sum, item) => sum + item.count, 0);

  function selectGroup(groupId: string) {
    const group = registryGroups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    setActiveGroup(group.id);
    setType(group.types[0]);
  }

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
        title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Central de cadastros do ERP</span>}
        actions={<button className="erp-btn" onClick={() => summary.refetch()}><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          {registryGroups.map((group) => {
            const Icon = group.icon;
            const count = group.types.reduce((sum, itemType) => sum + (countByType.get(itemType) ?? 0), 0);
            return (
              <button
                key={group.id}
                className={`rounded border p-3 text-left ${group.id === activeGroup ? "border-accent bg-accent/10" : "bg-card hover:bg-muted"}`}
                onClick={() => selectGroup(group.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-info" />
                  <span className="text-xl font-bold tabular-nums">{count}</span>
                </div>
                <div className="mt-2 font-semibold">{group.title}</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">{group.description}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-3" title="Subcadastros">
        <div className="mb-2 rounded border bg-muted/30 p-2 text-[12px]">
          <div className="font-semibold">{selectedGroup.title}</div>
          <div className="text-muted-foreground">{totalRecords} registros de base no ERP</div>
        </div>
        <div className="max-h-[430px] space-y-1 overflow-auto">
          {selectedGroup.types.map((itemType) => (
            <button
              key={itemType}
              className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-[12.5px] ${type === itemType ? "border-accent bg-accent/10" : "bg-card hover:bg-muted"}`}
              onClick={() => setType(itemType)}
            >
              <span>{registryLabels[itemType]}</span>
              <span className="rounded bg-muted px-1.5 text-[11px] tabular-nums">{countByType.get(itemType) ?? 0}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-5" title={`Cadastro ativo - ${registryLabels[type]}`}>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded border bg-muted/30 p-2">
            <div className="text-[11px] uppercase text-muted-foreground">Registros</div>
            <div className="text-lg font-bold tabular-nums">{countByType.get(type) ?? 0}</div>
          </div>
          <div className="rounded border bg-muted/30 p-2">
            <div className="text-[11px] uppercase text-muted-foreground">Grupo</div>
            <div className="font-semibold">{selectedGroup.title}</div>
          </div>
          <div className="rounded border bg-muted/30 p-2">
            <div className="text-[11px] uppercase text-muted-foreground">Uso</div>
            <div className="font-semibold">Base operacional</div>
          </div>
        </div>
        <form className="space-y-2" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
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
          </div>
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

      <Panel className="col-span-12 xl:col-span-4" title="Atalhos para cadastros operacionais">
        <div className="grid gap-2">
          {operationalCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.to} className="rounded border bg-card p-2 hover:bg-muted">
                <div className="flex items-center gap-2 font-semibold"><Icon className="h-3.5 w-3.5 text-info" />{card.title}</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">{card.text}</div>
              </Link>
            );
          })}
        </div>
      </Panel>

      <Panel
        className="col-span-12"
        title={registryLabels[type]}
        actions={<span className="text-[11px] text-muted-foreground">{filteredEntries.length} registros</span>}
      >
        <div className="mb-2 grid gap-2 md:grid-cols-5">
          <Field label="Pesquisar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input className="erp-input pl-7" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Codigo, nome ou descricao" />
            </div>
          </Field>
          <Field label="Status"><select className="erp-input"><option>Ativos</option><option>Todos</option><option>Inativos</option></select></Field>
          <Field label="Modulo"><select className="erp-input" value={activeGroup} onChange={(event) => selectGroup(event.target.value)}>{registryGroups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></Field>
          <div className="flex items-end gap-1.5">
            <button className="erp-btn erp-btn-primary" onClick={() => entries.refetch()}><Filter className="h-3.5 w-3.5" />Filtrar</button>
            <button className="erp-btn" onClick={() => setSearch("")}><RefreshCw className="h-3.5 w-3.5" />Limpar</button>
          </div>
        </div>
        <div className="max-h-[340px] overflow-auto">
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
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-mono">{entry.code ?? "-"}</td>
                  <td className="font-semibold">{entry.name}</td>
                  <td className="text-muted-foreground">{entry.description ?? "-"}</td>
                  <td>{datePt(entry.createdAt)}</td>
                  <td><StatusBadge kind={entry.isActive ? "success" : "muted"}>{entry.isActive ? "Ativo" : "Inativo"}</StatusBadge></td>
                </tr>
              ))}
              {!entries.isLoading && !filteredEntries.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum registro nesse cadastro. Use o formulario acima para criar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Cobertura planejada dos cadastros">
        <div className="grid gap-2 text-[12.5px] md:grid-cols-4">
          <Coverage icon={Building2} title="Estabelecimento" text="Empresa, filial, natureza das operacoes, categorias de impostos e regras fiscais." />
          <Coverage icon={Layers3} title="Produtos" text="Marcas, unidades, secoes, grupos, subgrupos, funcoes ICMS/ISS, complementos, projetos e plataformas." />
          <Coverage icon={Users} title="Clientes" text="Ramo/perfil, clientes, agenda, cidades, cadastro reduzido e credito comercial." />
          <Coverage icon={MapPin} title="Movimentacoes" text="CFOP, fretes, transportadoras, veiculos, entradas, saidas, reservas, comissoes e entregas." />
        </div>
      </Panel>
    </div>
  );
}

function Coverage({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded border bg-card p-3">
      <Icon className="mb-2 h-4 w-4 text-info" />
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-muted-foreground">{text}</div>
    </div>
  );
}
