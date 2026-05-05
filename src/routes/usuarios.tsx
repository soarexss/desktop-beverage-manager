import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Shield,
  MonitorCog,
  BellRing,
  Workflow,
  LockKeyhole,
  Save,
} from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppearance, type AppearanceMode } from "@/components/appearance-provider";

export const Route = createFileRoute("/usuarios")({ component: Usuarios });

const users = [
  ["jalmeida", "Joao Almeida", "Administrador", "Matriz", "05/05 10:42", "Ativo", "success"],
  ["mlima", "Maria Lima", "Vendedor", "Matriz", "05/05 09:30", "Ativo", "success"],
  ["psouza", "Pedro Souza", "Estoquista", "Matriz", "04/05 18:11", "Ativo", "success"],
  ["aoliveira", "Ana Oliveira", "Financeiro", "Matriz", "05/05 08:20", "Ativo", "success"],
  ["csilva", "Carlos Silva", "Entregador", "Filial 02", "03/05 14:00", "Inativo", "muted"],
  ["rferreira", "Rita Ferreira", "Caixa", "Matriz", "Nunca", "Bloqueado", "danger"],
] as const;

const permissions = [
  ["Dashboard", true, true, true, true],
  ["Estoque - Visualizar", true, true, true, false],
  ["Estoque - Editar", true, false, true, false],
  ["Estoque - Excluir", true, false, false, false],
  ["Vendas - PDV", true, true, false, false],
  ["Vendas - Cancelar", true, false, false, false],
  ["Clientes - Cadastrar", true, true, false, false],
  ["Financeiro - Visualizar", true, false, false, true],
  ["Financeiro - Lancar", true, false, false, true],
  ["Nota Fiscal - Emitir", true, true, false, true],
  ["Nota Fiscal - Cancelar", true, false, false, false],
  ["Relatorios", true, true, false, true],
  ["Usuarios e Permissoes", true, false, false, false],
] as const;

const profileNotes: Record<string, string> = {
  Administrador: "Controle completo do ERP, incluindo fiscal, financeiro, estoque e gestao de usuarios.",
  Vendedor: "Foco em PDV, pedidos, limite de cliente, acompanhamento de carteira e comissoes.",
  Estoquista: "Opera entradas, separacao, inventario, lotes e ajustes controlados de saldo.",
  Financeiro: "Controla caixa, contas a pagar/receber, cobranca e conciliacao.",
  Caixa: "Finaliza vendas rapidas, confere meios de pagamento e fechamento diario.",
  Entregador: "Consulta rotas, entregas, ocorrencias, comprovantes e devolucoes.",
};

const appearanceOptions: Array<{
  value: AppearanceMode;
  title: string;
  summary: string;
}> = [
  {
    value: "classic",
    title: "Original ERP",
    summary: "Mantem o visual atual, mais compacto e com cara de sistema tradicional.",
  },
  {
    value: "modern",
    title: "Moderno .NET 8",
    summary: "Aplica cantos mais arredondados, superficies suaves e um visual mais atual.",
  },
] as const;

const automationRules = [
  "Alertar ao tentar vender cliente com limite excedido",
  "Exigir conferencia dupla para ajuste de estoque negativo",
  "Abrir financeiro com resumo do caixa do dia",
  "Exibir atalhos rapidos no topo para o perfil",
];

function Usuarios() {
  const [selectedProfile, setSelectedProfile] = useState("Administrador");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { appearance, setAppearance } = useAppearance();

  const profileUsers = useMemo(
    () => users.filter((user) => user[2] === selectedProfile),
    [selectedProfile],
  );

  const openProfileSettings = (profile: string) => {
    setSelectedProfile(profile);
    setSettingsOpen(true);
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel
        className="col-span-12 lg:col-span-7"
        title="Usuarios do Sistema"
        actions={
          <div className="flex gap-1.5">
            <button className="erp-btn erp-btn-primary">
              <Plus className="h-3.5 w-3.5" />
              Novo
            </button>
            <button className="erp-btn">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button className="erp-btn erp-btn-danger">
              <Trash2 className="h-3.5 w-3.5" />
              Inativar
            </button>
          </div>
        }
        bodyClassName="p-0"
      >
        <table className="erp-table">
          <thead>
            <tr>
              <th>Login</th>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Filial</th>
              <th>Ultimo acesso</th>
              <th>Situacao</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user[0]}>
                <td className="font-mono">{user[0]}</td>
                <td className="font-semibold">{user[1]}</td>
                <td>
                  <button
                    type="button"
                    className="rounded-full bg-accent/12 px-2.5 py-1 text-[11.5px] font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground"
                    onClick={() => openProfileSettings(user[2])}
                  >
                    {user[2]}
                  </button>
                </td>
                <td>{user[3]}</td>
                <td className="font-mono text-[11.5px]">{user[4]}</td>
                <td>
                  <StatusBadge kind={user[6]}>{user[5]}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Cadastro de Usuario">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Login">
            <input className="erp-input" defaultValue="jalmeida" />
          </Field>
          <Field label="Nome completo">
            <input className="erp-input" defaultValue="Joao Almeida" />
          </Field>
        </div>
        <Field label="E-mail">
          <input className="erp-input" defaultValue="joao@distribev.com.br" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Perfil de acesso">
            <div className="flex gap-2">
              <select className="erp-input">
                <option>Administrador</option>
                <option>Vendedor</option>
                <option>Estoquista</option>
                <option>Financeiro</option>
                <option>Caixa</option>
              </select>
              <button type="button" className="erp-btn whitespace-nowrap" onClick={() => openProfileSettings("Administrador")}>
                Configurar
              </button>
            </div>
          </Field>
          <Field label="Filial">
            <select className="erp-input">
              <option>Matriz</option>
              <option>Filial 02</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Senha">
            <input type="password" className="erp-input" defaultValue="********" />
          </Field>
          <Field label="Confirmar">
            <input type="password" className="erp-input" defaultValue="********" />
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" defaultChecked /> Forcar troca no 1 acesso
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" defaultChecked /> Acesso ao PDV
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" /> Restringir IP
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-1.5 border-t pt-2">
          <button className="erp-btn">Cancelar</button>
          <button className="erp-btn erp-btn-primary">Salvar (F12)</button>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Matriz de Permissoes por Perfil" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Permissao / Recurso</th>
              <th className="text-center">
                <button type="button" className="font-semibold hover:text-accent" onClick={() => openProfileSettings("Administrador")}>
                  Administrador
                </button>
              </th>
              <th className="text-center">
                <button type="button" className="font-semibold hover:text-accent" onClick={() => openProfileSettings("Vendedor")}>
                  Vendedor
                </button>
              </th>
              <th className="text-center">
                <button type="button" className="font-semibold hover:text-accent" onClick={() => openProfileSettings("Estoquista")}>
                  Estoquista
                </button>
              </th>
              <th className="text-center">
                <button type="button" className="font-semibold hover:text-accent" onClick={() => openProfileSettings("Financeiro")}>
                  Financeiro
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((row) => (
              <tr key={row[0]}>
                <td className="font-medium">{row[0]}</td>
                {row.slice(1).map((value, index) => (
                  <td key={`${row[0]}-${index}`} className="text-center">
                    {value ? <Check className="mx-auto h-4 w-4 text-success" /> : <span className="text-muted-foreground">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto border-border bg-background p-0">
          <DialogHeader className="border-b bg-panel-header px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-accent" />
              Configuracoes do Perfil: {selectedProfile}
            </DialogTitle>
            <DialogDescription>
              {profileNotes[selectedProfile] ?? "Personalize permissoes, experiencia visual e regras operacionais deste perfil."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4">
              <section className="erp-panel">
                <div className="erp-panel-header">
                  <span className="flex items-center gap-2">
                    <MonitorCog className="h-4 w-4" />
                    Aparencia e Interface
                  </span>
                </div>
                <div className="grid gap-3 p-4 lg:grid-cols-2">
                  {appearanceOptions.map((option) => {
                    const active = appearance === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAppearance(option.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-accent bg-accent/10 shadow-[0_12px_30px_-18px_rgba(37,99,235,0.55)]"
                            : "border-border bg-card hover:border-accent/60 hover:bg-muted/70"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-semibold">{option.title}</div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {active ? "Ativo" : "Disponivel"}
                          </span>
                        </div>
                        <div className="mb-4 text-xs text-muted-foreground">{option.summary}</div>
                        <div
                          className={`grid h-28 grid-cols-3 gap-2 rounded-2xl border p-3 ${
                            option.value === "modern"
                              ? "border-sky-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(226,239,255,0.9),_rgba(214,228,255,0.95))]"
                              : "border-slate-200 bg-[linear-gradient(to_bottom,_rgba(255,255,255,1),_rgba(236,241,247,1))]"
                          }`}
                        >
                          <div
                            className={`rounded-xl border ${
                              option.value === "modern" ? "border-sky-200 bg-white/90 shadow-sm" : "border-slate-300 bg-slate-50"
                            }`}
                          />
                          <div
                            className={`col-span-2 rounded-xl border ${
                              option.value === "modern" ? "border-sky-200 bg-white/85 shadow-sm" : "border-slate-300 bg-slate-100"
                            }`}
                          />
                          <div
                            className={`col-span-3 rounded-xl border ${
                              option.value === "modern" ? "border-sky-200 bg-white/80 shadow-sm" : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="erp-panel">
                <div className="erp-panel-header">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4" />
                    Controles Operacionais
                  </span>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {[
                    ["Pode aprovar desconto acima de 10%", true],
                    ["Pode editar preco na venda", selectedProfile === "Administrador" || selectedProfile === "Vendedor"],
                    ["Pode cancelar pedido faturado", selectedProfile === "Administrador"],
                    ["Pode movimentar estoque negativo", selectedProfile === "Administrador" || selectedProfile === "Estoquista"],
                    ["Pode reabrir caixa fechado", selectedProfile === "Administrador" || selectedProfile === "Financeiro"],
                    ["Pode transmitir nota fiscal", selectedProfile === "Administrador" || selectedProfile === "Financeiro"],
                  ].map(([label, enabled]) => (
                    <label key={label} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                      <span className="text-[12.5px]">{label}</span>
                      <input type="checkbox" defaultChecked={enabled} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="erp-panel">
                <div className="erp-panel-header">
                  <span className="flex items-center gap-2">
                    <Workflow className="h-4 w-4" />
                    Automacoes e Regras
                  </span>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {automationRules.map((rule, index) => (
                    <label key={rule} className="flex items-start gap-3 rounded-xl border bg-card px-3 py-3">
                      <input type="checkbox" className="mt-1" defaultChecked={index < 2} />
                      <span className="text-[12.5px] leading-5">{rule}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="erp-panel">
                <div className="erp-panel-header">
                  <span className="flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Resumo do Perfil
                  </span>
                </div>
                <div className="space-y-3 p-4 text-[12.5px]">
                  <div className="rounded-2xl border bg-card p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Perfil ativo</div>
                    <div className="mt-2 text-lg font-bold">{selectedProfile}</div>
                    <div className="mt-1 text-muted-foreground">{profileNotes[selectedProfile]}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-card p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Usuarios</div>
                      <div className="mt-2 text-2xl font-bold">{profileUsers.length}</div>
                    </div>
                    <div className="rounded-2xl border bg-card p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Visual</div>
                      <div className="mt-2 text-sm font-bold">{appearance === "modern" ? "Moderno .NET 8" : "Original ERP"}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-card p-3">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Usuarios vinculados</div>
                    <div className="space-y-2">
                      {profileUsers.map((user) => (
                        <div key={user[0]} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                          <div>
                            <div className="font-semibold">{user[1]}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {user[0]} - {user[3]}
                            </div>
                          </div>
                          <StatusBadge kind={user[6]}>{user[5]}</StatusBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="erp-panel">
                <div className="erp-panel-header">
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Acoes
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <button type="button" className="erp-btn erp-btn-primary w-full justify-center" onClick={() => setSettingsOpen(false)}>
                    Salvar configuracoes
                  </button>
                  <button type="button" className="erp-btn w-full justify-center" onClick={() => setAppearance("classic")}>
                    Restaurar visual original
                  </button>
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
