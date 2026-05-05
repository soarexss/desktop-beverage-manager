import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge } from "@/components/erp";
import { Plus, Download, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/financeiro")({ component: Financeiro });

function Financeiro() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Saldo em Caixa", "R$ 48.214,80", "success", TrendingUp],
          ["A Receber (30d)", "R$ 124.870,30", "info", TrendingUp],
          ["A Pagar (30d)", "R$ 87.420,15", "warning", TrendingDown],
          ["Inadimplência", "R$ 12.480,90", "danger", TrendingDown],
        ].map(([l, v, k, I]) => {
          const Icon = I as typeof TrendingUp;
          return (
            <div key={l as string} className="erp-panel flex items-center justify-between p-3">
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">{l}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{v}</div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded bg-${k}/15 text-${k}`}><Icon className="h-5 w-5" /></div>
            </div>
          );
        })}
      </div>

      <Panel className="col-span-12 lg:col-span-6" title="Contas a Pagar" actions={<button className="erp-btn"><Plus className="h-3.5 w-3.5" />Lançar</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Doc.</th><th>Fornecedor</th><th>Vencimento</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {[
              ["NF-3421", "Ambev S/A", "05/05/2026", 18500.00, "Vence hoje", "warning"],
              ["NF-3422", "Coca-Cola FEMSA", "08/05/2026", 12340.50, "A vencer", "info"],
              ["NF-3423", "Heineken Brasil", "12/05/2026", 9870.00, "A vencer", "info"],
              ["NF-3401", "Petrobras Distrib.", "02/05/2026", 4280.30, "Atrasado", "danger"],
              ["NF-3380", "Ambev S/A", "28/04/2026", 22100.00, "Pago", "success"],
            ].map((r, i) => (
              <tr key={i}>
                <td className="font-mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="font-mono text-[11.5px]">{r[2]}</td>
                <td className="text-right tabular-nums font-semibold">R$ {(r[3] as number).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td><StatusBadge kind={r[5] as never}>{r[4]}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-6" title="Contas a Receber" actions={<button className="erp-btn"><Download className="h-3.5 w-3.5" />Exportar</button>} bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Vencimento</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>
            {[
              ["10472", "Bar do Zé", "12/05/2026", 1248.00, "A vencer", "info"],
              ["10470", "Restaurante Vila", "10/05/2026", 3120.80, "A vencer", "info"],
              ["10412", "Mercearia Central", "04/05/2026", 487.30, "Atrasado", "danger"],
              ["10398", "Casa de Carnes BR", "01/05/2026", 894.20, "Atrasado", "danger"],
              ["10301", "Distrib. Sul Ltda", "20/04/2026", 6730.00, "Recebido", "success"],
            ].map((r, i) => (
              <tr key={i}>
                <td className="font-mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="font-mono text-[11.5px]">{r[2]}</td>
                <td className="text-right tabular-nums font-semibold">R$ {(r[3] as number).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td><StatusBadge kind={r[5] as never}>{r[4]}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-8" title="Fluxo de Caixa — Últimos 14 dias">
        <div className="h-48 flex items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const inV = 30 + Math.random() * 70;
            const outV = 20 + Math.random() * 60;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex gap-0.5 items-end h-full">
                  <div className="flex-1 bg-success/70 rounded-t" style={{ height: `${inV}%` }} />
                  <div className="flex-1 bg-destructive/70 rounded-t" style={{ height: `${outV}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-4 text-[12px] border-t pt-2">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-success/70" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-destructive/70" /> Saídas</span>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Fechamento Diário — 05/05/2026">
        <table className="erp-table">
          <tbody>
            <tr><td>Vendas Dinheiro</td><td className="text-right tabular-nums font-semibold">R$ 8.420,00</td></tr>
            <tr><td>Vendas PIX</td><td className="text-right tabular-nums font-semibold">R$ 9.150,50</td></tr>
            <tr><td>Vendas Cartão</td><td className="text-right tabular-nums font-semibold">R$ 7.300,00</td></tr>
            <tr><td>Faturado</td><td className="text-right tabular-nums font-semibold">R$ 4.870,30</td></tr>
            <tr><td className="text-destructive">(-) Despesas</td><td className="text-right tabular-nums text-destructive">R$ 1.240,80</td></tr>
            <tr className="bg-accent/10"><td className="font-bold">Total Líquido</td><td className="text-right tabular-nums font-bold text-accent">R$ 28.500,00</td></tr>
          </tbody>
        </table>
        <button className="erp-btn erp-btn-primary mt-3 w-full justify-center">Fechar Caixa</button>
      </Panel>
    </div>
  );
}
