import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Check, Plus, Shield, Trash2 } from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { datePt } from "@/lib/format";

export const Route = createFileRoute("/usuarios")({ component: Usuarios });

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
};

const roles = ["admin", "vendedor", "entregador", "caixa", "financeiro", "estoquista", "fiscal", "compras"];
const permissions = [
  ["Dashboard", true, true, true, true],
  ["Cadastros fiscais", true, false, false, true],
  ["Estoque - visualizar", true, true, true, false],
  ["Estoque - movimentar", true, false, true, false],
  ["Vendas / PDV", true, true, false, false],
  ["Financeiro", true, false, false, true],
  ["Nota fiscal", true, false, false, true],
  ["Usuarios e permissoes", true, false, false, false],
] as const;

function Usuarios() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/users") });
  const [form, setForm] = useState({ name: "", email: "", role: "vendedor", password: "senha1234" });

  const createUser = useMutation({
    mutationFn: () => apiPost<User>("/users", { ...form, isActive: true }),
    onSuccess: () => {
      setForm({ name: "", email: "", role: "vendedor", password: "senha1234" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return;
    }
    createUser.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel
        className="col-span-12 lg:col-span-7"
        title="Usuarios do sistema"
        actions={
          <div className="flex gap-1.5">
            <button className="erp-btn erp-btn-primary"><Plus className="h-3.5 w-3.5" />Novo</button>
            <button className="erp-btn erp-btn-danger"><Trash2 className="h-3.5 w-3.5" />Inativar</button>
          </div>
        }
        bodyClassName="p-0"
      >
        <table className="erp-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ultimo acesso</th><th>Situacao</th></tr></thead>
          <tbody>
            {(users.data ?? []).map((user) => (
              <tr key={user.id}>
                <td className="font-semibold">{user.name}</td>
                <td>{user.email}</td>
                <td><span className="rounded-full bg-accent/12 px-2.5 py-1 text-[11.5px] font-semibold text-accent">{user.role}</span></td>
                <td>{datePt(user.lastLoginAt)}</td>
                <td><StatusBadge kind={user.isActive ? "success" : "muted"}>{user.isActive ? "Ativo" : "Inativo"}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Cadastro de usuario">
        <form className="space-y-2" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nome completo"><input className="erp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Perfil de acesso">
              <select className="erp-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </Field>
          </div>
          <Field label="E-mail"><input className="erp-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
          <Field label="Senha inicial"><input className="erp-input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></Field>
          <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
            <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /> Forcar troca no 1 acesso</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /> Acesso ao PDV</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" /> Restringir IP</label>
          </div>
          <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createUser.isPending}>
            <Shield className="h-3.5 w-3.5" />Salvar usuario
          </button>
        </form>
      </Panel>

      <Panel className="col-span-12" title="Matriz de permissoes por perfil" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Permissao / Recurso</th><th className="text-center">Admin</th><th className="text-center">Vendedor</th><th className="text-center">Estoque</th><th className="text-center">Financeiro/Fiscal</th></tr></thead>
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
    </div>
  );
}
