import { createFileRoute } from "@tanstack/react-router";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { FileText, Download, X, Send, Settings } from "lucide-react";

export const Route = createFileRoute("/notas")({ component: Notas });

function Notas() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Autorizadas (mês)", "1.482", "success"],
          ["Em processamento", "8", "info"],
          ["Rejeitadas", "12", "danger"],
          ["Canceladas", "4", "muted"],
        ].map(([l, v, k]) => (
          <div key={l as string} className="erp-panel p-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">{l}</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-2xl font-bold tabular-nums">{v}</div>
              <StatusBadge kind={k as never}>NFe</StatusBadge>
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12 lg:col-span-7" title="Notas Fiscais Emitidas" actions={
        <div className="flex gap-1.5">
          <button className="erp-btn"><Settings className="h-3.5 w-3.5" />Config. Fiscal</button>
          <button className="erp-btn erp-btn-primary"><FileText className="h-3.5 w-3.5" />Emitir NFe</button>
        </div>
      } bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Número</th><th>Série</th><th>Tipo</th><th>Destinatário</th><th>Emissão</th><th className="text-right">Valor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {[
              ["00021847", "1", "NFe", "Bar do Zé", "05/05 10:42", 1248.00, "Autorizada", "success"],
              ["00021846", "1", "NFCe", "Consumidor Final", "05/05 10:11", 487.30, "Autorizada", "success"],
              ["00021845", "1", "NFe", "Restaurante Vila", "05/05 09:55", 3120.80, "Processando", "info"],
              ["00021844", "1", "NFe", "Distrib. Sul Ltda", "05/05 09:14", 6730.00, "Cancelada", "muted"],
              ["00021843", "1", "NFe", "Casa de Carnes BR", "05/05 08:50", 894.20, "Rejeitada", "danger"],
              ["00021842", "1", "NFe", "Lanchonete da Praça", "04/05 17:32", 198.90, "Autorizada", "success"],
            ].map((r) => (
              <tr key={r[0] as string}>
                <td className="font-mono">{r[0]}</td>
                <td className="text-center">{r[1]}</td>
                <td><span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-bold">{r[2]}</span></td>
                <td>{r[3]}</td>
                <td className="font-mono text-[11.5px]">{r[4]}</td>
                <td className="text-right tabular-nums font-semibold">R$ {(r[5] as number).toLocaleString("pt-BR", {minimumFractionDigits:2})}</td>
                <td><StatusBadge kind={r[7] as never}>{r[6]}</StatusBadge></td>
                <td>
                  <div className="flex gap-0.5">
                    <button className="erp-btn px-1.5 py-0.5" title="XML"><Download className="h-3 w-3" /></button>
                    <button className="erp-btn px-1.5 py-0.5" title="DANFE"><FileText className="h-3 w-3" /></button>
                    <button className="erp-btn px-1.5 py-0.5 text-destructive" title="Cancelar"><X className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Emissão de NFe / NFCe">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Modelo">
            <select className="erp-input"><option>NFe (55)</option><option>NFCe (65)</option></select>
          </Field>
          <Field label="Natureza">
            <select className="erp-input"><option>Venda de mercadoria</option><option>Devolução</option><option>Transferência</option></select>
          </Field>
        </div>
        <Field label="Destinatário"><input className="erp-input" defaultValue="Bar do Zé Comércio LTDA" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="CNPJ"><input className="erp-input font-mono" defaultValue="11.234.567/0001-89" /></Field>
          <Field label="IE"><input className="erp-input font-mono" defaultValue="123.456.789.012" /></Field>
        </div>
        <Field label="Pedido vinculado"><input className="erp-input font-mono" defaultValue="PED-10472" /></Field>

        <div className="mt-2 erp-label">Itens</div>
        <table className="erp-table">
          <thead><tr><th>Produto</th><th>NCM</th><th>Qtd</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            <tr><td>Cerveja Skol Lata 350ml</td><td className="font-mono text-[11px]">2203.00.00</td><td>48</td><td className="text-right tabular-nums">R$ 167,52</td></tr>
            <tr><td>Cerveja Heineken 600ml</td><td className="font-mono text-[11px]">2203.00.00</td><td>24</td><td className="text-right tabular-nums">R$ 348,00</td></tr>
            <tr><td>Coca-Cola 2L</td><td className="font-mono text-[11px]">2202.10.00</td><td>60</td><td className="text-right tabular-nums">R$ 714,00</td></tr>
          </tbody>
        </table>
        <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-[12px]">
          <div><span className="text-muted-foreground">ICMS</span><div className="font-bold tabular-nums">R$ 224,64</div></div>
          <div><span className="text-muted-foreground">PIS/COFINS</span><div className="font-bold tabular-nums">R$ 115,44</div></div>
          <div><span className="text-muted-foreground">Total NFe</span><div className="font-bold tabular-nums text-accent">R$ 1.248,00</div></div>
        </div>
        <div className="mt-3 flex justify-end gap-1.5 border-t pt-2">
          <button className="erp-btn">Visualizar DANFE</button>
          <button className="erp-btn erp-btn-primary"><Send className="h-3.5 w-3.5" />Transmitir SEFAZ</button>
        </div>
      </Panel>
    </div>
  );
}
