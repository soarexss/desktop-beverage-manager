import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Filter, Package, Plus, RefreshCw, Save } from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { dateTimePt, money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/estoque")({ component: Estoque });

type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  price: string | number;
  cost: string | number;
  minStock: number;
  maxStock?: number | null;
  trackBatch: boolean;
  groupId?: string | null;
  unitId?: string | null;
  brandId?: string | null;
  ncmId?: string | null;
};

type InventoryMovement = {
  id: string;
  productId: string;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  quantity: string | number;
  unitCost?: string | number | null;
  batchNumber?: string | null;
  expiresAt?: string | null;
  reason?: string | null;
  createdAt: string;
  product: Product;
  createdBy: { name: string };
};

type RegistryEntry = {
  id: string;
  name: string;
};

function Estoque() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    sku: "",
    barcode: "",
    name: "",
    cost: 0,
    price: 0,
    minStock: 0,
    maxStock: 0,
    groupId: "",
    unitId: "",
  });

  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const movements = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: () => apiGet<InventoryMovement[]>("/inventory/movements"),
  });
  const groups = useQuery({
    queryKey: ["registries", "PRODUCT_GROUP"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=PRODUCT_GROUP"),
  });
  const units = useQuery({
    queryKey: ["registries", "UNIT"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=UNIT"),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      apiPost<Product>("/products", {
        ...form,
        barcode: form.barcode || undefined,
        groupId: form.groupId || undefined,
        unitId: form.unitId || undefined,
        trackBatch: true,
      }),
    onSuccess: () => {
      setForm({ sku: "", barcode: "", name: "", cost: 0, price: 0, minStock: 0, maxStock: 0, groupId: "", unitId: "" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const stockByProduct = useMemo(() => {
    const stock = new Map<string, number>();
    for (const movement of movements.data ?? []) {
      const quantity = Number(movement.quantity);
      const current = stock.get(movement.productId) ?? 0;
      stock.set(movement.productId, current + (movement.type === "OUTBOUND" ? -quantity : quantity));
    }
    return stock;
  }, [movements.data]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (products.data ?? []).filter((product) => {
      if (!normalized) {
        return true;
      }
      return [product.name, product.sku, product.barcode].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [products.data, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.sku || !form.name) {
      return;
    }
    createProduct.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12" title="Filtros de Pesquisa">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Codigo / EAN">
            <input className="erp-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, EAN ou produto" />
          </Field>
          <Field label="Grupo">
            <select className="erp-input">
              <option>Todos</option>
              {(groups.data ?? []).map((group) => <option key={group.id}>{group.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="erp-input"><option>Todos</option><option>OK</option><option>Estoque baixo</option></select>
          </Field>
          <div className="flex items-end gap-1.5">
            <button className="erp-btn erp-btn-primary" onClick={() => products.refetch()}><Filter className="h-3.5 w-3.5" />Filtrar</button>
            <button className="erp-btn" onClick={() => setSearch("")}><RefreshCw className="h-3.5 w-3.5" />Limpar</button>
          </div>
        </div>
      </Panel>

      <Panel
        className="col-span-12 lg:col-span-8"
        title={<span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Produtos cadastrados</span>}
        actions={<span className="text-[11px] text-muted-foreground">{filteredProducts.length} registros</span>}
        bodyClassName="p-0"
      >
        <div className="max-h-[480px] overflow-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU/EAN</th>
                <th>Descricao</th>
                <th>Grupo</th>
                <th className="text-right">Estoque</th>
                <th className="text-right">Custo</th>
                <th className="text-right">Venda</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stock = stockByProduct.get(product.id) ?? 0;
                const low = stock <= product.minStock;
                const group = groups.data?.find((item) => item.id === product.groupId)?.name ?? "-";
                return (
                  <tr key={product.id}>
                    <td className="font-mono text-[11.5px]">{product.barcode ?? product.sku}</td>
                    <td className="font-medium">{product.name}</td>
                    <td>{group}</td>
                    <td className="text-right tabular-nums font-semibold">{numberPt(stock, 3)}</td>
                    <td className="text-right tabular-nums">{money(product.cost)}</td>
                    <td className="text-right tabular-nums">{money(product.price)}</td>
                    <td><StatusBadge kind={low ? "danger" : "success"}>{low ? "Baixo" : "OK"}</StatusBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-4" title="Cadastro de produto">
        <form className="space-y-2" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="SKU"><input className="erp-input" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required /></Field>
            <Field label="EAN"><input className="erp-input" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></Field>
          </div>
          <Field label="Descricao"><input className="erp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Grupo">
              <select className="erp-input" value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}>
                <option value="">Selecione</option>
                {(groups.data ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </Field>
            <Field label="Unidade">
              <select className="erp-input" value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })}>
                <option value="">Selecione</option>
                {(units.data ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Custo"><input className="erp-input text-right" type="number" step={0.01} value={form.cost} onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })} /></Field>
            <Field label="Venda"><input className="erp-input text-right" type="number" step={0.01} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></Field>
            <Field label="Min."><input className="erp-input text-right" type="number" value={form.minStock} onChange={(event) => setForm({ ...form, minStock: Number(event.target.value) })} /></Field>
          </div>
          <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createProduct.isPending}>
            {createProduct.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar produto
          </button>
        </form>
      </Panel>

      <Panel className="col-span-12" title="Historico de movimentacoes" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Lote</th>
              <th className="text-right">Qtde</th>
              <th className="text-right">Custo Un.</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {(movements.data ?? []).slice(0, 12).map((movement) => (
              <tr key={movement.id}>
                <td className="font-mono text-[11.5px]">{dateTimePt(movement.createdAt)}</td>
                <td>{movement.type}</td>
                <td>{movement.product.name}</td>
                <td className="font-mono">{movement.batchNumber ?? "-"}</td>
                <td className={`text-right tabular-nums font-semibold ${movement.type === "OUTBOUND" ? "text-destructive" : "text-success"}`}>
                  {movement.type === "OUTBOUND" ? "-" : "+"}{numberPt(movement.quantity, 3)}
                </td>
                <td className="text-right tabular-nums">{money(movement.unitCost)}</td>
                <td className="text-muted-foreground">{movement.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
