import { createFileRoute } from "@tanstack/react-router";
import { Panel, Field } from "@/components/erp";
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Receipt } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/vendas")({ component: Vendas });

const catalog = [
  { id: 1, name: "Cerveja Skol Lata 350ml", price: 3.49 },
  { id: 2, name: "Cerveja Heineken 600ml", price: 14.50 },
  { id: 3, name: "Coca-Cola 2L", price: 11.90 },
  { id: 4, name: "Água Mineral 500ml", price: 2.50 },
  { id: 5, name: "Vinho Tinto Reservado", price: 49.90 },
  { id: 6, name: "Energético Red Bull 250ml", price: 12.50 },
  { id: 7, name: "Whisky Black 1L", price: 139.90 },
  { id: 8, name: "Vodka Smirnoff 998ml", price: 64.90 },
  { id: 9, name: "Cerveja Brahma 1L", price: 10.50 },
];

function Vendas() {
  const [cart, setCart] = useState([
    { id: 1, name: "Cerveja Skol Lata 350ml", price: 3.49, qty: 12 },
    { id: 3, name: "Coca-Cola 2L", price: 11.90, qty: 4 },
    { id: 4, name: "Água Mineral 500ml", price: 2.50, qty: 6 },
  ]);
  const [discount, setDiscount] = useState(5);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal - (subtotal * discount) / 100;

  const add = (p: typeof catalog[0]) => {
    setCart((c) => {
      const f = c.find((i) => i.id === p.id);
      return f ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { ...p, qty: 1 }];
    });
  };
  const inc = (id: number, d: number) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
  const rm = (id: number) => setCart((c) => c.filter((i) => i.id !== id));

  return (
    <div className="grid grid-cols-12 gap-3" style={{ minHeight: "calc(100vh - 220px)" }}>
      <Panel className="col-span-12 lg:col-span-8 flex flex-col" title="PDV — Frente de Caixa" actions={<span className="text-[11px] text-muted-foreground">Operador: jalmeida • Caixa #0241</span>}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="erp-input pl-8 text-base py-2" placeholder="Bipar código de barras ou buscar produto... (F2)" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {catalog.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="erp-panel flex flex-col items-start gap-1 p-2.5 text-left hover:border-accent hover:shadow-md transition">
              <div className="grid h-12 w-full place-items-center rounded bg-muted text-2xl">🍺</div>
              <div className="text-[12px] font-semibold leading-tight">{p.name}</div>
              <div className="text-[13px] font-bold text-accent tabular-nums">R$ {p.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        <Panel title={<span className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5" /> Carrinho</span>} actions={<span className="text-[11px] text-muted-foreground">{cart.length} itens</span>} bodyClassName="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="erp-table">
              <thead><tr><th>Produto</th><th className="text-center">Qtd</th><th className="text-right">Total</th><th></th></tr></thead>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="font-semibold text-[12px]">{i.name}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">R$ {i.price.toFixed(2)}/un</div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => inc(i.id, -1)} className="erp-btn px-1 py-0.5"><Minus className="h-3 w-3" /></button>
                        <span className="w-7 text-center tabular-nums font-semibold">{i.qty}</span>
                        <button onClick={() => inc(i.id, 1)} className="erp-btn px-1 py-0.5"><Plus className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td className="text-right tabular-nums font-bold">R$ {(i.price * i.qty).toFixed(2)}</td>
                    <td><button onClick={() => rm(i.id)} className="text-destructive hover:text-destructive/70"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Totalização" className="flex-1">
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">R$ {subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Desconto %</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="erp-input w-20 py-0.5 text-right" />
            </div>
            <div className="flex justify-between text-destructive"><span>Desconto R$</span><span className="tabular-nums">- R$ {((subtotal * discount) / 100).toFixed(2)}</span></div>
            <div className="my-2 border-t" />
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold uppercase">Total a pagar</span>
              <span className="text-2xl font-bold tabular-nums text-accent">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 border-t pt-2">
            <div className="erp-label">Forma de pagamento</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button className="erp-btn flex-col py-2"><Banknote className="h-4 w-4" /><span className="text-[11px]">Dinheiro</span></button>
              <button className="erp-btn flex-col py-2"><QrCode className="h-4 w-4" /><span className="text-[11px]">PIX</span></button>
              <button className="erp-btn flex-col py-2"><CreditCard className="h-4 w-4" /><span className="text-[11px]">Cartão</span></button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Cliente"><input className="erp-input" placeholder="Consumidor" /></Field>
            <Field label="Vendedor"><input className="erp-input" defaultValue="João A." /></Field>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="erp-btn">Cancelar (Esc)</button>
            <button className="erp-btn erp-btn-primary text-base font-bold py-2">Finalizar (F10)</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
