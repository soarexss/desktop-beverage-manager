import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/usuarios")({ component: Usuarios });

const users = [
  ["jalmeida", "João Almeida", "Administrador", "Matriz", "05/05 10:42", "Ativo", "success"],
  ["mlima", "Maria Lima", "Vendedor", "Matriz", "05/05 09:30", "Ativo", "success"],
  ["psouza", "Pedro Souza", "Estoquista", "Matriz", "04/05 18:11", "Ativo", "success"],
  ["aoliveira", "Ana Oliveira", "Financeiro", "Matriz", "05/05 08:20", "Ativo", "success"],
  ["csilva", "Carlos Silva", "Entregador", "Filial 02", "03/05 14:00", "Inativo", "muted"],
  ["rferreira", "Rita Ferreira", "Caixa", "Matriz", "Nunca", "Bloqueado", "danger"],
];

const permissions = [
  ["Dashboard", true, true, true, true],
  ["Estoque - Visualizar", true, true, true, false],
  ["Estoque - Editar", true, false, true, false],
  ["Estoque - Excluir", true, false, false, false],
  ["Vendas - PDV", true, true, false, false],
  ["Vendas - Cancelar", true, false, false, false],
  ["Clientes - Cadastrar", true, true, false, false],
  ["Financeiro - Visualizar", true, false, false, true],
  ["Financeiro - Lançar", true, false, false, true],
  ["Nota Fiscal - Emitir", true, true, false, true],
  ["Nota Fiscal - Cancelar", true, false, false, false],
  ["Relatórios", true, true, false, true],
  ["Usuários e Permissões", true, false, false, false],
];

function Usuarios() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12 lg:col-span-7" title="Usuários do Sistema" actions={
        <div className="flex gap-1.5">
          <button className="erp-btn erp-btn-primary"><Plus className="h-3.5 w-3.5" />Novo</button>
          <button className="erp-btn"><Pencil className="h-3.5 w-3.5" />Editar</button>
          <button className="erp-btn erp-btn-danger"><Trash2 className="h-3.5 w-3.5" />Inativar</button>
        </div>
      } bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Login</th><th>Nome</th><th>Perfil</th><th>Filial</th><th>Último acesso</th><th>Situação</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u[0] as string}>
                <td className="font-mono">{u[0]}</td>
                <td className="font-semibold">{u[1]}</td>
                <td>{u[2]}</td>
                <td>{u[3]}</td>
                <td className="font-mono text-[11.5px]">{u[4]}</td>
                <td><StatusBadge kind={u[6] as never}>{u[5]}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Cadastro de Usuário">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Login"><input className="erp-input" defaultValue="jalmeida" /></Field>
          <Field label="Nome completo"><input className="erp-input" defaultValue="João Almeida" /></Field>
        </div>
        <Field label="E-mail"><input className="erp-input" defaultValue="joao@distribev.com.br" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Perfil de acesso">
            <select className="erp-input"><option>Administrador</option><option>Vendedor</option><option>Estoquista</option><option>Financeiro</option><option>Caixa</option></select>
          </Field>
          <Field label="Filial">
            <select className="erp-input"><option>Matriz</option><option>Filial 02</option></select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Senha"><input type="password" className="erp-input" defaultValue="********" /></Field>
          <Field label="Confirmar"><input type="password" className="erp-input" defaultValue="********" /></Field>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
          <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /> Forçar troca no 1º acesso</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /> Acesso ao PDV</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" /> Restringir IP</label>
        </div>
        <div className="mt-3 flex justify-end gap-1.5 border-t pt-2">
          <button className="erp-btn">Cancelar</button>
          <button className="erp-btn erp-btn-primary">Salvar (F12)</button>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Matriz de Permissões por Perfil" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Permissão / Recurso</th>
              <th className="text-center">Administrador</th>
              <th className="text-center">Vendedor</th>
              <th className="text-center">Estoquista</th>
              <th className="text-center">Financeiro</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((row) => (
              <tr key={row[0] as string}>
                <td className="font-medium">{row[0]}</td>
                {row.slice(1).map((v, i) => (
                  <td key={i} className="text-center">
                    {v ? <Check className="mx-auto h-4 w-4 text-success" /> : <span className="text-muted-foreground">—</span>}
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
