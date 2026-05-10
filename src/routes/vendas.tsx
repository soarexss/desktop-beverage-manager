import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, CreditCard, Minus, Plus, QrCode, Receipt, Search, Trash2 } from "lucide-react";
import { Panel, Field, StatusBadge } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { money } from "@/lib/format";

export const Route = createFileRoute("/vendas")({ component: Vendas });

type Product = {
  id: string;
  sku: string;
  name: string;
  price: string | number;
};

type Client = {
  id: string;
  tradeName: string;
};

type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
};

type CartItem = Product & {
  qty: number;
};

function Vendas() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => apiGet<Client[]>("/clients") });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => apiGet<Order[]>("/orders") });

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const createOrder = useMutation({
    mutationFn: () =>
      apiPost<Order>("/orders", {
        clientId,
        discountAmount,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
        notes: `Pagamento: ${paymentMethod}`,
      }),
    onSuccess: (order) => {
      setLastOrder(order);
      setCart([]);
      setDiscount(0);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
    },
  });

  const add = (product: Product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      return found
        ? current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
        : [...current, { ...product, qty: 1 }];
    });
  };

  const inc = (id: string, delta: number) =>
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item)));
  const rm = (id: string) => setCart((current) => current.filter((item) => item.id !== id));

  function finish() {
    if (!clientId || !cart.length) {
      return;
    }
    createOrder.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3" style={{ minHeight: "calc(100vh - 220px)" }}>
      <Panel className="col-span-12 lg:col-span-8 flex flex-col" title="PDV - Frente de Caixa" actions={<span className="text-[11px] text-muted-foreground">{orders.data?.length ?? 0} pedidos no banco</span>}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="erp-input py-2 pl-8 text-base" placeholder="Bipar codigo de barras ou buscar produto... (F2)" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(products.data ?? []).map((product) => (
            <button key={product.id} onClick={() => add(product)} className="erp-panel flex flex-col items-start gap-1 p-2.5 text-left transition hover:border-accent hover:shadow-md">
              <div className="grid h-12 w-full place-items-center rounded bg-muted text-lg font-bold text-accent">BEV</div>
              <div className="text-[12px] font-semibold leading-tight">{product.name}</div>
              <div className="text-[13px] font-bold text-accent tabular-nums">{money(product.price)}</div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="col-span-12 flex flex-col gap-3 lg:col-span-4">
        <Panel title={<span className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5" /> Carrinho</span>} actions={<span className="text-[11px] text-muted-foreground">{cart.length} itens</span>} bodyClassName="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="erp-table">
              <thead><tr><th>Produto</th><th className="text-center">Qtd</th><th className="text-right">Total</th><th></th></tr></thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="text-[12px] font-semibold">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">{money(item.price)}/un</div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => inc(item.id, -1)} className="erp-btn px-1 py-0.5"><Minus className="h-3 w-3" /></button>
                        <span className="w-7 text-center font-semibold tabular-nums">{item.qty}</span>
                        <button onClick={() => inc(item.id, 1)} className="erp-btn px-1 py-0.5"><Plus className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td className="text-right font-bold tabular-nums">{money(Number(item.price) * item.qty)}</td>
                    <td><button onClick={() => rm(item.id)} className="text-destructive hover:text-destructive/70"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Totalizacao" className="flex-1">
          {lastOrder && (
            <div className="mb-2 rounded border border-success/30 bg-success/10 p-2 text-[12.5px]">
              Pedido {lastOrder.id.slice(-6)} gravado com status <StatusBadge kind="success">{lastOrder.status}</StatusBadge>
            </div>
          )}
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Desconto %</span>
              <input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} className="erp-input w-20 py-0.5 text-right" />
            </div>
            <div className="flex justify-between text-destructive"><span>Desconto R$</span><span className="tabular-nums">- {money(discountAmount)}</span></div>
            <div className="my-2 border-t" />
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold uppercase">Total a pagar</span>
              <span className="text-2xl font-bold tabular-nums text-accent">{money(total)}</span>
            </div>
          </div>

          <div className="mt-3 border-t pt-2">
            <div className="erp-label">Forma de pagamento</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button className={`erp-btn flex-col py-2 ${paymentMethod === "DINHEIRO" ? "border-accent" : ""}`} onClick={() => setPaymentMethod("DINHEIRO")}><Banknote className="h-4 w-4" /><span className="text-[11px]">Dinheiro</span></button>
              <button className={`erp-btn flex-col py-2 ${paymentMethod === "PIX" ? "border-accent" : ""}`} onClick={() => setPaymentMethod("PIX")}><QrCode className="h-4 w-4" /><span className="text-[11px]">PIX</span></button>
              <button className={`erp-btn flex-col py-2 ${paymentMethod === "CARTAO" ? "border-accent" : ""}`} onClick={() => setPaymentMethod("CARTAO")}><CreditCard className="h-4 w-4" /><span className="text-[11px]">Cartao</span></button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Cliente">
              <select className="erp-input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Selecione</option>
                {(clients.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.tradeName}</option>)}
              </select>
            </Field>
            <Field label="Vendedor"><input className="erp-input" defaultValue="Usuario logado" /></Field>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="erp-btn" onClick={() => setCart([])}>Cancelar (Esc)</button>
            <button className="erp-btn erp-btn-primary py-2 text-base font-bold" onClick={finish} disabled={!cart.length || !clientId || createOrder.isPending}>
              {createOrder.isPending ? "Gravando..." : "Finalizar (F10)"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
