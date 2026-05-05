import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge, Toolbar, Field } from "@/components/erp";
import { Plus, Pencil, Trash2, Download, Upload, RefreshCw, Filter, Package } from "lucide-react";

export const Route = createFileRoute("/estoque")({ component: Estoque });

const products = [
  ["7891991010023", "Cerveja Skol Lata 350ml", "Cervejas", "CX 12", 4820, 2.49, "OK", "success"],
  ["7891991010024", "Cerveja Heineken 600ml", "Cervejas", "UN", 12, 9.90, "Baixo", "danger"],
  ["7894900011517", "Coca-Cola 2L", "Refrigerantes", "UN", 3210, 7.49, "OK", "success"],
  ["7898215151784", "Água Mineral 500ml", "Águas", "FD 12", 2510, 1.20, "OK", "success"],
  ["7891234567890", "Vinho Tinto Reservado", "Vinhos", "UN", 1180, 32.90, "Vencendo", "warning"],
  ["7891234567891", "Energético Red Bull 250ml", "Energéticos", "UN", 980, 8.50, "OK", "success"],
  ["7891234567892", "Whisky Black 1L", "Destilados", "UN", 84, 89.90, "Baixo", "danger"],
  ["7891234567893", "Suco Del Valle 1L", "Sucos", "UN", 1640, 5.20, "OK", "success"],
  ["7891234567894", "Vodka Smirnoff 998ml", "Destilados", "UN", 220, 38.50, "OK", "success"],
  ["7891234567895", "Cerveja Brahma 1L", "Cervejas", "UN", 1820, 7.20, "OK", "success"],
];

function Estoque() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12" title="Filtros de Pesquisa">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Código / EAN"><input className="erp-input" placeholder="Digite o código" /></Field>
          <Field label="Descrição"><input className="erp-input" placeholder="Nome do produto" /></Field>
          <Field label="Categoria">
            <select className="erp-input"><option>Todas</option><option>Cervejas</option><option>Refrigerantes</option><option>Vinhos</option></select>
          </Field>
          <Field label="Status">
            <select className="erp-input"><option>Todos</option><option>OK</option><option>Estoque baixo</option><option>Vencendo</option></select>
          </Field>
          <div className="flex items-end gap-1.5">
            <button className="erp-btn erp-btn-primary"><Filter className="h-3.5 w-3.5" />Filtrar</button>
            <button className="erp-btn"><RefreshCw className="h-3.5 w-3.5" />Limpar</button>
          </div>
        </div>
      </Panel>

      <Panel
        className="col-span-12 lg:col-span-8"
        title={<span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Produtos Cadastrados</span>}
        actions={<span className="text-[11px] text-muted-foreground">128 registros</span>}
        bodyClassName="p-0"
      >
        <Toolbar>
          <div className="px-2 pt-2 flex flex-wrap gap-1.5">
            <button className="erp-btn erp-btn-primary"><Plus className="h-3.5 w-3.5" />Novo</button>
            <button className="erp-btn"><Pencil className="h-3.5 w-3.5" />Editar</button>
            <button className="erp-btn erp-btn-danger"><Trash2 className="h-3.5 w-3.5" />Excluir</button>
            <span className="mx-2 w-px self-stretch bg-border" />
            <button className="erp-btn"><Upload className="h-3.5 w-3.5" />Entrada</button>
            <button className="erp-btn"><Download className="h-3.5 w-3.5" />Saída</button>
          </div>
        </Toolbar>
        <div className="max-h-[480px] overflow-auto">
          <table className="erp-table">
            <thead>
              <tr><th>EAN</th><th>Descrição</th><th>Categoria</th><th>Un</th><th className="text-right">Estoque</th><th className="text-right">Custo</th><th>Status</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p[0] as string}>
                  <td className="font-mono text-[11.5px]">{p[0]}</td>
                  <td className="font-medium">{p[1]}</td>
                  <td>{p[2]}</td>
                  <td>{p[3]}</td>
                  <td className="text-right tabular-nums font-semibold">{(p[4] as number).toLocaleString("pt-BR")}</td>
                  <td className="text-right tabular-nums">R$ {(p[5] as number).toFixed(2)}</td>
                  <td><StatusBadge kind={p[7] as never}>{p[6]}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t bg-panel-header px-3 py-1.5 text-[11.5px]">
          <span className="text-muted-foreground">Mostrando 1–10 de 128</span>
          <div className="flex items-center gap-1">
            <button className="erp-btn px-2 py-0.5">«</button>
            <button className="erp-btn px-2 py-0.5">‹</button>
            <span className="px-2">Página 1 de 13</span>
            <button className="erp-btn px-2 py-0.5">›</button>
            <button className="erp-btn px-2 py-0.5">»</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Cadastro / Edição de Produto">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Código"><input className="erp-input" defaultValue="P-00472" /></Field>
            <Field label="EAN"><input className="erp-input" defaultValue="7891991010024" /></Field>
          </div>
          <Field label="Descrição"><input className="erp-input" defaultValue="Cerveja Heineken 600ml" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Categoria">
              <select className="erp-input"><option>Cervejas</option></select>
            </Field>
            <Field label="Unidade">
              <select className="erp-input"><option>UN</option><option>CX 12</option><option>FD 24</option></select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Custo R$"><input className="erp-input text-right" defaultValue="9,90" /></Field>
            <Field label="Venda R$"><input className="erp-input text-right" defaultValue="14,50" /></Field>
            <Field label="Margem %"><input className="erp-input text-right" defaultValue="46,46" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Estoque mín."><input className="erp-input text-right" defaultValue="50" /></Field>
            <Field label="Estoque máx."><input className="erp-input text-right" defaultValue="500" /></Field>
          </div>
          <Field label="Lote / Validade">
            <div className="flex gap-2">
              <input className="erp-input" defaultValue="LOTE-A12" />
              <input className="erp-input" defaultValue="2026-09-30" />
            </div>
          </Field>
          <div className="flex justify-end gap-1.5 border-t pt-2">
            <button className="erp-btn">Cancelar</button>
            <button className="erp-btn erp-btn-primary">Salvar (F12)</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Histórico de Movimentações">
        <table className="erp-table">
          <thead>
            <tr><th>Data</th><th>Documento</th><th>Tipo</th><th>Produto</th><th className="text-right">Qtde</th><th className="text-right">Custo Un.</th><th>Usuário</th></tr>
          </thead>
          <tbody>
            {[
              ["05/05/2026 10:42", "PED-10472", "Saída", "Cerveja Skol Lata 350ml", -48, "R$ 2,49", "jalmeida"],
              ["05/05/2026 09:30", "NF-001843", "Entrada", "Coca-Cola 2L", 240, "R$ 7,49", "estoque01"],
              ["04/05/2026 17:11", "PED-10468", "Saída", "Whisky Black 1L", -2, "R$ 89,90", "jalmeida"],
              ["04/05/2026 14:02", "AJUSTE", "Ajuste", "Vinho Tinto Reservado", -3, "R$ 32,90", "supervisor"],
              ["04/05/2026 11:20", "NF-001842", "Entrada", "Cerveja Heineken 600ml", 120, "R$ 9,90", "estoque01"],
            ].map((r, i) => (
              <tr key={i}>
                <td className="font-mono text-[11.5px]">{r[0]}</td>
                <td className="font-mono">{r[1]}</td>
                <td>{r[2]}</td>
                <td>{r[3]}</td>
                <td className={`text-right tabular-nums font-semibold ${(r[4] as number) < 0 ? "text-destructive" : "text-success"}`}>{(r[4] as number) > 0 ? "+" : ""}{r[4]}</td>
                <td className="text-right tabular-nums">{r[5]}</td>
                <td className="text-muted-foreground">{r[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
