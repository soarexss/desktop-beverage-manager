import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { ClipboardList, PackageCheck, Plus, RefreshCw } from "lucide-react";
import { Panel, Field, StatusBadge } from "@/components/erp";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { datePt, money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/compras")({ component: Compras });

type Product = {
  id: string;
  sku: string;
  name: string;
  cost: string | number;
};

type RegistryEntry = {
  id: string;
  name: string;
};

type PurchaseOrder = {
  id: string;
  supplierName: string;
  status: "DRAFT" | "RECEIVED" | "CANCELLED";
  invoiceNumber?: string | null;
  totalAmount: string | number;
  receivedAt?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: string | number;
    unitCost: string | number;
    totalCost: string | number;
    product: Product;
  }>;
};

type PriceTable = {
  id: string;
  code?: string | null;
  name: string;
  isDefault: boolean;
  items: Array<{ id: string; price: string | number; product: Product }>;
};

function Compras() {
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const suppliers = useQuery({
    queryKey: ["registries", "SUPPLIER"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=SUPPLIER"),
  });
  const purchases = useQuery({
    queryKey: ["operations", "purchases"],
    queryFn: () => apiGet<PurchaseOrder[]>("/operations/purchases"),
  });
  const priceTables = useQuery({
    queryKey: ["operations", "price-tables"],
    queryFn: () => apiGet<PriceTable[]>("/operations/price-tables"),
  });

  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(24);
  const [unitCost, setUnitCost] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const selectedSupplier = suppliers.data?.find((supplier) => supplier.id === supplierId);
  const selectedProduct = products.data?.find((product) => product.id === productId);
  const total = quantity * unitCost;

  const createPurchase = useMutation({
    mutationFn: () =>
      apiPost<PurchaseOrder>("/operations/purchases", {
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier?.name ?? "Fornecedor avulso",
        invoiceNumber: invoiceNumber || undefined,
        receiveNow: true,
        items: [{ productId, quantity, unitCost }],
      }),
    onSuccess: () => {
      setInvoiceNumber("");
      queryClient.invalidateQueries({ queryKey: ["operations", "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const receivePurchase = useMutation({
    mutationFn: (id: string) => apiPatch<PurchaseOrder>(`/operations/purchases/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations", "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    },
  });

  const totals = useMemo(() => {
    const rows = purchases.data ?? [];
    return {
      count: rows.length,
      received: rows.filter((row) => row.status === "RECEIVED").length,
      value: rows.reduce((sum, row) => sum + Number(row.totalAmount), 0),
    };
  }, [purchases.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId || !supplierId || quantity <= 0 || unitCost < 0) {
      return;
    }

    createPurchase.mutate();
  }

  function chooseProduct(id: string) {
    setProductId(id);
    const product = products.data?.find((item) => item.id === id);
    setUnitCost(Number(product?.cost ?? 0));
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="erp-panel p-3">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Compras</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{totals.count}</div>
        </div>
        <div className="erp-panel p-3">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Recebidas</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{totals.received}</div>
        </div>
        <div className="erp-panel p-3">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Valor comprado</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{money(totals.value)}</div>
        </div>
        <div className="erp-panel p-3">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Tabelas de preco</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{priceTables.data?.length ?? 0}</div>
        </div>
      </div>

      <Panel className="col-span-12 lg:col-span-4" title="Entrada de mercadorias">
        <form className="space-y-2" onSubmit={submit}>
          <Field label="Fornecedor">
            <select className="erp-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
              <option value="">Selecione</option>
              {(suppliers.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Produto">
            <select className="erp-input" value={productId} onChange={(event) => chooseProduct(event.target.value)} required>
              <option value="">Selecione</option>
              {(products.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Quantidade">
              <input className="erp-input text-right" type="number" value={quantity} min={0.001} step={0.001} onChange={(event) => setQuantity(Number(event.target.value))} />
            </Field>
            <Field label="Custo unitario">
              <input className="erp-input text-right" type="number" value={unitCost} min={0} step={0.01} onChange={(event) => setUnitCost(Number(event.target.value))} />
            </Field>
          </div>
          <Field label="Nota fiscal de entrada">
            <input className="erp-input" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
          </Field>
          <div className="rounded border bg-muted p-2 text-[12.5px]">
            <div className="text-muted-foreground">Total da entrada</div>
            <div className="text-xl font-bold tabular-nums">{money(total)}</div>
          </div>
          <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createPurchase.isPending}>
            {createPurchase.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Receber e gerar estoque
          </button>
        </form>
      </Panel>

      <Panel
        className="col-span-12 lg:col-span-8"
        title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Compras e entradas</span>}
        bodyClassName="p-0"
      >
        <table className="erp-table">
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>Itens</th>
              <th>Emissao</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(purchases.data ?? []).map((purchase) => (
              <tr key={purchase.id}>
                <td className="font-semibold">{purchase.supplierName}</td>
                <td className="font-mono">{purchase.invoiceNumber ?? "-"}</td>
                <td>{purchase.items.length}</td>
                <td>{datePt(purchase.createdAt)}</td>
                <td className="text-right font-semibold tabular-nums">{money(purchase.totalAmount)}</td>
                <td><StatusBadge kind={purchase.status === "RECEIVED" ? "success" : "warning"}>{purchase.status}</StatusBadge></td>
                <td>
                  {purchase.status !== "RECEIVED" && (
                    <button className="erp-btn px-2 py-0.5" onClick={() => receivePurchase.mutate(purchase.id)}>
                      <PackageCheck className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12" title="Tabelas de preco e multiplos precos" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Tabela</th>
              <th>Padrao</th>
              <th>Itens precificados</th>
              <th>Exemplo</th>
            </tr>
          </thead>
          <tbody>
            {(priceTables.data ?? []).map((table) => (
              <tr key={table.id}>
                <td className="font-mono">{table.code ?? "-"}</td>
                <td className="font-semibold">{table.name}</td>
                <td>{table.isDefault ? "Sim" : "Nao"}</td>
                <td>{numberPt(table.items.length)}</td>
                <td>{table.items[0] ? `${table.items[0].product.name} - ${money(table.items[0].price)}` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
