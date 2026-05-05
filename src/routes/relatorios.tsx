import { createFileRoute } from "@tanstack/react-router";
import { Panel, Field } from "@/components/erp";
import { FileText, FileSpreadsheet, Printer, BarChart3, PieChart, Play } from "lucide-react";

export const Route = createFileRoute("/relatorios")({ component: Relatorios });

const reports = [
  ["VENDAS", "Vendas por período", "Faturamento, ticket médio, top produtos"],
  ["VENDAS", "Vendas por vendedor", "Performance individual e comissões"],
  ["VENDAS", "Vendas por cliente", "Histórico e ranking de clientes"],
  ["ESTOQUE", "Posição de estoque", "Saldo atual por produto/categoria"],
  ["ESTOQUE", "Movimentações", "Entradas, saídas e ajustes"],
  ["ESTOQUE", "Inventário físico", "Para conferência e contagem"],
  ["FINANC.", "Contas a pagar", "Por vencimento e fornecedor"],
  ["FINANC.", "Contas a receber", "Inadimplência e projeção"],
  ["FINANC.", "Fluxo de caixa", "Entradas vs saídas"],
  ["FISCAL", "Livro de saídas", "SPED Fiscal/Contribuições"],
  ["FISCAL", "Apuração de impostos", "ICMS, PIS, COFINS"],
  ["GERAL", "DRE Gerencial", "Demonstrativo de resultados"],
];

function Relatorios() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12 lg:col-span-4" title="Filtros">
        <Field label="Período">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="erp-input" defaultValue="2026-04-01" />
            <input type="date" className="erp-input" defaultValue="2026-05-05" />
          </div>
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {["Hoje", "Ontem", "7 dias", "Mês", "Trimestre", "Ano"].map((b) => (
            <button key={b} className="erp-btn justify-center">{b}</button>
          ))}
        </div>
        <Field label="Filial"><select className="erp-input"><option>Todas</option><option>Matriz</option><option>Filial 02</option></select></Field>
        <Field label="Categoria"><select className="erp-input"><option>Todas</option></select></Field>
        <Field label="Vendedor"><select className="erp-input"><option>Todos</option></select></Field>
        <div className="mt-3 flex flex-col gap-1.5">
          <button className="erp-btn erp-btn-primary justify-center"><Play className="h-3.5 w-3.5" />Gerar Relatório</button>
          <div className="grid grid-cols-3 gap-1.5">
            <button className="erp-btn justify-center"><FileText className="h-3.5 w-3.5" />PDF</button>
            <button className="erp-btn justify-center"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
            <button className="erp-btn justify-center"><Printer className="h-3.5 w-3.5" />Imprimir</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-8" title="Relatórios Disponíveis" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Categoria</th><th>Relatório</th><th>Descrição</th><th></th></tr></thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td><span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10.5px] font-bold text-accent">{r[0]}</span></td>
                <td className="font-semibold">{r[1]}</td>
                <td className="text-muted-foreground">{r[2]}</td>
                <td><button className="erp-btn px-2 py-0.5"><Play className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title={<span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Faturamento por Categoria</span>}>
        <div className="space-y-2">
          {[
            ["Cervejas", 124800, 92],
            ["Refrigerantes", 78400, 58],
            ["Destilados", 65200, 48],
            ["Vinhos", 28100, 21],
            ["Águas", 15600, 11],
            ["Energéticos", 12400, 9],
          ].map(([n, v, p]) => (
            <div key={n as string}>
              <div className="mb-0.5 flex justify-between text-[12.5px]">
                <span className="font-semibold">{n}</span>
                <span className="tabular-nums">R$ {(v as number).toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm bg-muted">
                <div className="h-full bg-gradient-to-r from-accent/70 to-accent" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title={<span className="flex items-center gap-2"><PieChart className="h-3.5 w-3.5" /> Composição de Vendas</span>}>
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 rounded-full" style={{
            background: "conic-gradient(oklch(0.55 0.14 245) 0% 38%, oklch(0.55 0.14 150) 38% 60%, oklch(0.72 0.16 75) 60% 78%, oklch(0.52 0.21 27) 78% 100%)"
          }}>
            <div className="absolute inset-4 rounded-full bg-card grid place-items-center text-center">
              <div>
                <div className="text-[10px] text-muted-foreground">Total</div>
                <div className="text-[13px] font-bold tabular-nums">R$ 312k</div>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-[12px]">
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-accent" /> PIX <span className="ml-auto tabular-nums">38%</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-success" /> Dinheiro <span className="ml-auto tabular-nums">22%</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-warning" /> Cartão <span className="ml-auto tabular-nums">18%</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-destructive" /> Faturado <span className="ml-auto tabular-nums">22%</span></li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}
