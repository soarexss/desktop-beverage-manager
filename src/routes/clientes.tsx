import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { Plus, Pencil, Search, Phone, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/clientes")({ component: Clientes });

const customers = [
  ["00012", "Bar do Zé", "11.234.567/0001-89", "(11) 98765-4321", "São Paulo/SP", 12480.50, 5000, "Adimplente", "success"],
  ["00013", "Mercearia Central", "22.345.678/0001-90", "(11) 91234-5678", "Guarulhos/SP", 4870.30, 3000, "Adimplente", "success"],
  ["00014", "Restaurante Vila", "33.456.789/0001-12", "(11) 99876-1234", "Osasco/SP", 31208.80, 15000, "Atrasado", "warning"],
  ["00015", "Lanchonete da Praça", "44.567.890/0001-23", "(11) 92345-6789", "Diadema/SP", 1989.90, 1000, "Adimplente", "success"],
  ["00016", "Distrib. Sul Ltda", "55.678.901/0001-34", "(11) 93456-7890", "Santo André/SP", 67300.00, 50000, "Adimplente", "success"],
  ["00017", "Casa de Carnes BR", "66.789.012/0001-45", "(11) 94567-8901", "São Caetano/SP", 8942.20, 5000, "Bloqueado", "danger"],
];

function Clientes() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12" title="Pesquisa de Clientes">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Código"><input className="erp-input" /></Field>
          <Field label="Razão / Nome"><input className="erp-input" placeholder="Buscar..." /></Field>
          <Field label="CNPJ / CPF"><input className="erp-input" /></Field>
          <Field label="Situação">
            <select className="erp-input"><option>Todas</option><option>Adimplente</option><option>Atrasado</option><option>Bloqueado</option></select>
          </Field>
          <div className="flex items-end gap-1.5">
            <button className="erp-btn erp-btn-primary"><Search className="h-3.5 w-3.5" />Pesquisar</button>
            <button className="erp-btn"><Plus className="h-3.5 w-3.5" />Novo</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title="Clientes Cadastrados" actions={<span className="text-[11px] text-muted-foreground">462 registros</span>} bodyClassName="p-0">
        <div className="max-h-[480px] overflow-auto">
          <table className="erp-table">
            <thead><tr><th>Código</th><th>Razão Social</th><th>CNPJ</th><th>Cidade</th><th className="text-right">Saldo Devedor</th><th className="text-right">Limite</th><th>Situação</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c[0] as string}>
                  <td className="font-mono">{c[0]}</td>
                  <td className="font-semibold">{c[1]}</td>
                  <td className="font-mono text-[11.5px]">{c[2]}</td>
                  <td>{c[4]}</td>
                  <td className="text-right tabular-nums">R$ {(c[5] as number).toLocaleString("pt-BR", {minimumFractionDigits: 2})}</td>
                  <td className="text-right tabular-nums">R$ {(c[6] as number).toLocaleString("pt-BR", {minimumFractionDigits: 2})}</td>
                  <td><StatusBadge kind={c[8] as never}>{c[7]}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Ficha do Cliente" actions={<button className="erp-btn"><Pencil className="h-3.5 w-3.5" />Editar</button>}>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded bg-accent/15 text-lg font-bold text-accent">BZ</div>
          <div>
            <div className="text-[14px] font-bold">Bar do Zé Comércio LTDA</div>
            <div className="text-[11.5px] text-muted-foreground">CNPJ 11.234.567/0001-89 • Cliente desde 03/2021</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12.5px]">
          <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> (11) 98765-4321</div>
          <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> contato@bardoze.com.br</div>
          <div className="col-span-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> R. Augusta, 1240 — Consolação, São Paulo/SP</div>
        </div>
        <div className="my-3 grid grid-cols-3 gap-2 border-y py-2 text-center">
          <div><div className="text-[10.5px] uppercase text-muted-foreground">Limite</div><div className="font-bold tabular-nums">R$ 5.000</div></div>
          <div><div className="text-[10.5px] uppercase text-muted-foreground">Disponível</div><div className="font-bold tabular-nums text-success">R$ 2.519,50</div></div>
          <div><div className="text-[10.5px] uppercase text-muted-foreground">Em aberto</div><div className="font-bold tabular-nums text-warning-foreground">R$ 2.480,50</div></div>
        </div>
        <div className="erp-label">Histórico de Compras</div>
        <table className="erp-table">
          <thead><tr><th>Pedido</th><th>Data</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {[["10472","05/05","R$ 1.248,00","Em rota","info"],["10412","02/05","R$ 890,00","Pago","success"],["10398","28/04","R$ 1.560,00","Pago","success"],["10301","20/04","R$ 320,00","Pago","success"]].map((r, i) => (
              <tr key={i}><td className="font-mono">{r[0]}</td><td>{r[1]}</td><td className="text-right tabular-nums">{r[2]}</td><td><StatusBadge kind={r[4] as never}>{r[3]}</StatusBadge></td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
