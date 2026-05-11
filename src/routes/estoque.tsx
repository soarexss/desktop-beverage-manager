import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ClipboardList,
  Filter,
  Lock,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
  Save,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { datePt, dateTimePt, money, numberPt } from "@/lib/format";

export const Route = createFileRoute("/estoque")({ component: Estoque });

type ProductBarcode = {
  id: string;
  code: string;
  type: string;
  source?: string | null;
  isPrimary: boolean;
};

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
  barcodes?: ProductBarcode[];
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

type InventoryMetrics = {
  totalProducts: number;
  totalCostValue: number;
  totalSaleValue: number;
  lowStockCount: number;
  zeroStockCount: number;
  expiringLots: number;
  inbound30: number;
  outbound30: number;
  turnover30: number;
  openCounts: number;
  lowStock: Array<Product & { currentStock: number; reservedStock: number; availableStock: number }>;
  zeroStock: Array<Product & { currentStock: number; reservedStock: number; availableStock: number }>;
  abc: Array<{ productId: string; name: string; value: number; class: "A" | "B" | "C" }>;
};

type InventoryCountItem = {
  id: string;
  productId: string;
  barcode?: string | null;
  expectedQty: string | number;
  countedQty: string | number;
  differenceQty: string | number;
  product: Product;
};

type InventoryCountSession = {
  id: string;
  code?: string | null;
  description?: string | null;
  status: "DRAFT" | "COUNTING" | "CLOSED" | "CANCELLED";
  startedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  items: InventoryCountItem[];
};

type InventoryReservation = {
  id: string;
  productId: string;
  quantity: string | number;
  status: "ACTIVE" | "CONSUMED" | "RELEASED" | "CANCELLED";
  reason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  product: Product;
};

type RegistryEntry = {
  id: string;
  name: string;
};

const statusKind = {
  DRAFT: "muted",
  COUNTING: "info",
  CLOSED: "success",
  CANCELLED: "danger",
  ACTIVE: "success",
  CONSUMED: "info",
  RELEASED: "muted",
} as const;

function Estoque() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [activeCountId, setActiveCountId] = useState("");
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
  const [barcodeForm, setBarcodeForm] = useState({
    productId: "",
    code: "",
    type: "EAN",
    source: "",
  });
  const [countForm, setCountForm] = useState({
    code: "",
    description: "",
  });
  const [countItemForm, setCountItemForm] = useState({
    barcode: "",
    productId: "",
    countedQty: 1,
  });
  const [reservationForm, setReservationForm] = useState({
    productId: "",
    quantity: 1,
    reason: "",
    expiresAt: "",
  });

  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const movements = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: () => apiGet<InventoryMovement[]>("/inventory/movements"),
  });
  const metrics = useQuery({
    queryKey: ["inventory", "metrics"],
    queryFn: () => apiGet<InventoryMetrics>("/inventory/metrics"),
  });
  const counts = useQuery({
    queryKey: ["inventory", "counts"],
    queryFn: () => apiGet<InventoryCountSession[]>("/inventory/counts"),
  });
  const reservations = useQuery({
    queryKey: ["inventory", "reservations"],
    queryFn: () => apiGet<InventoryReservation[]>("/inventory/reservations"),
  });
  const groups = useQuery({
    queryKey: ["registries", "PRODUCT_GROUP"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=PRODUCT_GROUP"),
  });
  const units = useQuery({
    queryKey: ["registries", "UNIT"],
    queryFn: () => apiGet<RegistryEntry[]>("/registries?type=UNIT"),
  });

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  const createProduct = useMutation({
    mutationFn: () =>
      apiPost<Product>("/products", {
        ...form,
        barcode: form.barcode || undefined,
        maxStock: form.maxStock || undefined,
        groupId: form.groupId || undefined,
        unitId: form.unitId || undefined,
        trackBatch: true,
      }),
    onSuccess: () => {
      setForm({ sku: "", barcode: "", name: "", cost: 0, price: 0, minStock: 0, maxStock: 0, groupId: "", unitId: "" });
      invalidateInventory();
    },
  });

  const lookupBarcode = useMutation({
    mutationFn: () => apiGet<Product>(`/inventory/barcodes/${encodeURIComponent(barcodeSearch.trim())}`),
    onSuccess: (product) => {
      setBarcodeResult(product);
      setSearch(product.barcode ?? product.sku);
    },
  });

  const createBarcode = useMutation({
    mutationFn: () =>
      apiPost<ProductBarcode>("/inventory/barcodes", {
        ...barcodeForm,
        source: barcodeForm.source || undefined,
      }),
    onSuccess: () => {
      setBarcodeForm({ productId: "", code: "", type: "EAN", source: "" });
      invalidateInventory();
    },
  });

  const createCount = useMutation({
    mutationFn: () =>
      apiPost<InventoryCountSession>("/inventory/counts", {
        code: countForm.code || undefined,
        description: countForm.description || undefined,
      }),
    onSuccess: (session) => {
      setCountForm({ code: "", description: "" });
      setActiveCountId(session.id);
      invalidateInventory();
    },
  });

  const addCountItem = useMutation({
    mutationFn: (sessionId: string) =>
      apiPost<InventoryCountItem>(`/inventory/counts/${sessionId}/items`, {
        barcode: countItemForm.barcode || undefined,
        productId: countItemForm.productId || undefined,
        countedQty: countItemForm.countedQty,
      }),
    onSuccess: () => {
      setCountItemForm({ barcode: "", productId: "", countedQty: 1 });
      invalidateInventory();
    },
  });

  const closeCount = useMutation({
    mutationFn: (sessionId: string) => apiPatch<InventoryCountSession>(`/inventory/counts/${sessionId}/close`),
    onSuccess: () => invalidateInventory(),
  });

  const createReservation = useMutation({
    mutationFn: () =>
      apiPost<InventoryReservation>("/inventory/reservations", {
        ...reservationForm,
        expiresAt: reservationForm.expiresAt || undefined,
        reason: reservationForm.reason || undefined,
      }),
    onSuccess: () => {
      setReservationForm({ productId: "", quantity: 1, reason: "", expiresAt: "" });
      invalidateInventory();
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

  const reservedByProduct = useMemo(() => {
    const stock = new Map<string, number>();
    for (const reservation of reservations.data ?? []) {
      if (reservation.status !== "ACTIVE") {
        continue;
      }
      stock.set(reservation.productId, (stock.get(reservation.productId) ?? 0) + Number(reservation.quantity));
    }
    return stock;
  }, [reservations.data]);

  const openCounts = useMemo(
    () => (counts.data ?? []).filter((count) => count.status === "DRAFT" || count.status === "COUNTING"),
    [counts.data],
  );

  const currentCount = useMemo(() => {
    const selectedId = activeCountId || openCounts[0]?.id;
    return (counts.data ?? []).find((count) => count.id === selectedId);
  }, [activeCountId, counts.data, openCounts]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (products.data ?? []).filter((product) => {
      if (!normalized) {
        return true;
      }
      const aliases = product.barcodes?.map((barcode) => barcode.code) ?? [];
      return [product.name, product.sku, product.barcode, ...aliases].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [products.data, search]);

  const metricCards = [
    ["Valor custo", money(metrics.data?.totalCostValue), Warehouse, "text-info"],
    ["Valor venda", money(metrics.data?.totalSaleValue), TrendingUp, "text-success"],
    ["Estoque baixo", `${metrics.data?.lowStockCount ?? 0} itens`, AlertTriangle, "text-warning-foreground"],
    ["Zerados", `${metrics.data?.zeroStockCount ?? 0} itens`, PackageX, "text-destructive"],
    ["Giro 30 dias", numberPt(metrics.data?.turnover30, 2), PackageCheck, "text-info"],
    ["Lotes vencendo", `${metrics.data?.expiringLots ?? 0}`, AlertTriangle, "text-warning-foreground"],
  ] as const;

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.sku || !form.name) {
      return;
    }
    createProduct.mutate();
  }

  function submitBarcodeLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!barcodeSearch.trim()) {
      return;
    }
    lookupBarcode.mutate();
  }

  function submitBarcode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!barcodeForm.productId || !barcodeForm.code) {
      return;
    }
    createBarcode.mutate();
  }

  function submitCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCount.mutate();
  }

  function submitCountItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentCount?.id || (!countItemForm.productId && !countItemForm.barcode)) {
      return;
    }
    setActiveCountId(currentCount.id);
    addCountItem.mutate(currentCount.id);
  }

  function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reservationForm.productId || reservationForm.quantity <= 0) {
      return;
    }
    createReservation.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {metricCards.map(([label, value, Icon, iconClass]) => (
          <div key={label} className="erp-panel flex min-h-20 items-center justify-between p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded bg-muted">
              <Icon className={`h-4.5 w-4.5 ${iconClass}`} />
            </div>
          </div>
        ))}
      </div>

      <Panel className="col-span-12" title="Filtros, codigo de barras e coletor">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Codigo / EAN">
                <input className="erp-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, EAN, alias ou produto" />
              </Field>
              <Field label="Grupo">
                <select className="erp-input">
                  <option>Todos</option>
                  {(groups.data ?? []).map((group) => <option key={group.id}>{group.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className="erp-input"><option>Todos</option><option>OK</option><option>Estoque baixo</option><option>Zerado</option></select>
              </Field>
              <div className="flex items-end gap-1.5 md:col-span-2">
                <button className="erp-btn erp-btn-primary" onClick={() => products.refetch()}><Filter className="h-3.5 w-3.5" />Filtrar</button>
                <button className="erp-btn" onClick={() => setSearch("")}><RefreshCw className="h-3.5 w-3.5" />Limpar</button>
              </div>
            </div>
          </div>
          <form className="xl:col-span-5" onSubmit={submitBarcodeLookup}>
            <Field label="Leitura rapida por codigo de barras">
              <div className="flex gap-1.5">
                <input className="erp-input font-mono" value={barcodeSearch} onChange={(event) => setBarcodeSearch(event.target.value)} placeholder="Bipe ou digite o codigo" />
                <button className="erp-btn erp-btn-primary" disabled={lookupBarcode.isPending}><Barcode className="h-3.5 w-3.5" />Buscar</button>
              </div>
            </Field>
            <div className="mt-1 min-h-5 text-[11px] text-muted-foreground">
              {lookupBarcode.isError ? "Codigo nao localizado no cadastro." : barcodeResult ? `${barcodeResult.name} localizado e aplicado ao filtro.` : "Aceita EAN, SKU e codigos alternativos do produto."}
            </div>
          </form>
        </div>
      </Panel>

      <Panel
        className="col-span-12 xl:col-span-8"
        title={<span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Produtos e disponibilidade</span>}
        actions={<span className="text-[11px] text-muted-foreground">{filteredProducts.length} registros</span>}
        bodyClassName="p-0"
      >
        <div className="max-h-[490px] overflow-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU/EAN</th>
                <th>Descricao</th>
                <th>Grupo</th>
                <th className="text-right">Estoque</th>
                <th className="text-right">Reservado</th>
                <th className="text-right">Disponivel</th>
                <th className="text-right">Venda</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stock = stockByProduct.get(product.id) ?? 0;
                const reserved = reservedByProduct.get(product.id) ?? 0;
                const available = stock - reserved;
                const low = stock <= product.minStock;
                const group = groups.data?.find((item) => item.id === product.groupId)?.name ?? "-";
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="font-mono text-[11.5px]">{product.barcode ?? product.sku}</div>
                      <div className="text-[10.5px] text-muted-foreground">{product.barcodes?.length ?? 0} alternativos</div>
                    </td>
                    <td className="font-medium">{product.name}</td>
                    <td>{group}</td>
                    <td className="text-right tabular-nums font-semibold">{numberPt(stock, 3)}</td>
                    <td className="text-right tabular-nums">{numberPt(reserved, 3)}</td>
                    <td className={`text-right tabular-nums font-semibold ${available <= 0 ? "text-destructive" : ""}`}>{numberPt(available, 3)}</td>
                    <td className="text-right tabular-nums">{money(product.price)}</td>
                    <td><StatusBadge kind={low ? "danger" : "success"}>{low ? "Baixo" : "OK"}</StatusBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="col-span-12 grid grid-cols-1 gap-3 xl:col-span-4">
        <Panel title="Cadastro de produto">
          <form className="space-y-2" onSubmit={submitProduct}>
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
            <div className="grid grid-cols-4 gap-2">
              <Field label="Custo"><input className="erp-input text-right" type="number" step={0.01} value={form.cost} onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })} /></Field>
              <Field label="Venda"><input className="erp-input text-right" type="number" step={0.01} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></Field>
              <Field label="Min."><input className="erp-input text-right" type="number" value={form.minStock} onChange={(event) => setForm({ ...form, minStock: Number(event.target.value) })} /></Field>
              <Field label="Max."><input className="erp-input text-right" type="number" value={form.maxStock} onChange={(event) => setForm({ ...form, maxStock: Number(event.target.value) })} /></Field>
            </div>
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createProduct.isPending}>
              {createProduct.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar produto
            </button>
          </form>
        </Panel>

        <Panel title="Codigo alternativo">
          <form className="space-y-2" onSubmit={submitBarcode}>
            <Field label="Produto">
              <select className="erp-input" value={barcodeForm.productId} onChange={(event) => setBarcodeForm({ ...barcodeForm, productId: event.target.value })}>
                <option value="">Selecione</option>
                {(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Codigo"><input className="erp-input font-mono" value={barcodeForm.code} onChange={(event) => setBarcodeForm({ ...barcodeForm, code: event.target.value })} /></Field>
              <Field label="Tipo">
                <select className="erp-input" value={barcodeForm.type} onChange={(event) => setBarcodeForm({ ...barcodeForm, type: event.target.value })}>
                  <option>EAN</option>
                  <option>DUN14</option>
                  <option>INTERNO</option>
                  <option>BALANCA</option>
                </select>
              </Field>
              <Field label="Origem"><input className="erp-input" value={barcodeForm.source} onChange={(event) => setBarcodeForm({ ...barcodeForm, source: event.target.value })} /></Field>
            </div>
            <button className="erp-btn w-full justify-center" disabled={createBarcode.isPending}><Plus className="h-3.5 w-3.5" />Adicionar codigo</button>
          </form>
        </Panel>
      </div>

      <Panel
        className="col-span-12 xl:col-span-7"
        title={<span className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5" /> Inventario e balanco</span>}
        actions={<span className="text-[11px] text-muted-foreground">{metrics.data?.openCounts ?? 0} abertos</span>}
      >
        <div className="grid gap-3 lg:grid-cols-5">
          <form className="space-y-2 lg:col-span-2" onSubmit={submitCount}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Codigo"><input className="erp-input" value={countForm.code} onChange={(event) => setCountForm({ ...countForm, code: event.target.value })} placeholder="INV-0001" /></Field>
              <Field label="Sessao ativa">
                <select className="erp-input" value={currentCount?.id ?? ""} onChange={(event) => setActiveCountId(event.target.value)}>
                  <option value="">Nova contagem</option>
                  {openCounts.map((count) => <option key={count.id} value={count.id}>{count.code ?? count.id.slice(0, 8)}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Descricao"><input className="erp-input" value={countForm.description} onChange={(event) => setCountForm({ ...countForm, description: event.target.value })} /></Field>
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createCount.isPending}><Plus className="h-3.5 w-3.5" />Abrir inventario</button>
          </form>

          <form className="space-y-2 lg:col-span-3" onSubmit={submitCountItem}>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Bipar codigo"><input className="erp-input font-mono" value={countItemForm.barcode} onChange={(event) => setCountItemForm({ ...countItemForm, barcode: event.target.value })} /></Field>
              <Field label="Ou produto">
                <select className="erp-input" value={countItemForm.productId} onChange={(event) => setCountItemForm({ ...countItemForm, productId: event.target.value })}>
                  <option value="">Buscar pelo codigo</option>
                  {(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </Field>
              <Field label="Contado"><input className="erp-input text-right" type="number" step={0.001} value={countItemForm.countedQty} onChange={(event) => setCountItemForm({ ...countItemForm, countedQty: Number(event.target.value) })} /></Field>
            </div>
            <div className="flex gap-1.5">
              <button className="erp-btn flex-1 justify-center" disabled={!currentCount || addCountItem.isPending}><Barcode className="h-3.5 w-3.5" />Registrar item</button>
              <button type="button" className="erp-btn erp-btn-primary" disabled={!currentCount || closeCount.isPending} onClick={() => currentCount && closeCount.mutate(currentCount.id)}>
                <Lock className="h-3.5 w-3.5" />Fechar
              </button>
            </div>
          </form>
        </div>

        <div className="mt-3 max-h-[250px] overflow-auto border-t border-border pt-2">
          <table className="erp-table">
            <thead><tr><th>Inventario</th><th>Status</th><th>Produto</th><th className="text-right">Esperado</th><th className="text-right">Contado</th><th className="text-right">Diferenca</th></tr></thead>
            <tbody>
              {(counts.data ?? []).slice(0, 5).flatMap((count) =>
                count.items.length
                  ? count.items.map((item) => (
                      <tr key={item.id}>
                        <td>{count.code ?? count.id.slice(0, 8)}</td>
                        <td><StatusBadge kind={statusKind[count.status]}>{count.status}</StatusBadge></td>
                        <td>{item.product.name}</td>
                        <td className="text-right tabular-nums">{numberPt(item.expectedQty, 3)}</td>
                        <td className="text-right tabular-nums">{numberPt(item.countedQty, 3)}</td>
                        <td className={`text-right tabular-nums font-semibold ${Number(item.differenceQty) < 0 ? "text-destructive" : "text-success"}`}>{numberPt(item.differenceQty, 3)}</td>
                      </tr>
                    ))
                  : [
                      <tr key={count.id}>
                        <td>{count.code ?? count.id.slice(0, 8)}</td>
                        <td><StatusBadge kind={statusKind[count.status]}>{count.status}</StatusBadge></td>
                        <td colSpan={4} className="text-muted-foreground">Sem itens contados</td>
                      </tr>,
                    ],
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-5" title="Reserva de mercadorias">
        <form className="grid gap-2 md:grid-cols-5" onSubmit={submitReservation}>
          <Field label="Produto">
            <select className="erp-input" value={reservationForm.productId} onChange={(event) => setReservationForm({ ...reservationForm, productId: event.target.value })}>
              <option value="">Selecione</option>
              {(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </Field>
          <Field label="Qtde"><input className="erp-input text-right" type="number" step={0.001} value={reservationForm.quantity} onChange={(event) => setReservationForm({ ...reservationForm, quantity: Number(event.target.value) })} /></Field>
          <Field label="Validade"><input className="erp-input" type="date" value={reservationForm.expiresAt} onChange={(event) => setReservationForm({ ...reservationForm, expiresAt: event.target.value })} /></Field>
          <Field label="Motivo"><input className="erp-input" value={reservationForm.reason} onChange={(event) => setReservationForm({ ...reservationForm, reason: event.target.value })} /></Field>
          <div className="flex items-end">
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createReservation.isPending}><CheckCircle2 className="h-3.5 w-3.5" />Reservar</button>
          </div>
        </form>
        <div className="mt-3 max-h-[270px] overflow-auto">
          <table className="erp-table">
            <thead><tr><th>Produto</th><th>Validade</th><th className="text-right">Qtde</th><th>Status</th></tr></thead>
            <tbody>
              {(reservations.data ?? []).slice(0, 8).map((reservation) => (
                <tr key={reservation.id}>
                  <td><div className="font-medium">{reservation.product.name}</div><div className="text-[11px] text-muted-foreground">{reservation.reason ?? "Sem motivo"}</div></td>
                  <td>{datePt(reservation.expiresAt)}</td>
                  <td className="text-right tabular-nums font-semibold">{numberPt(reservation.quantity, 3)}</td>
                  <td><StatusBadge kind={statusKind[reservation.status]}>{reservation.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 xl:col-span-5" title="Curva ABC de estoque" bodyClassName="p-0">
        <table className="erp-table">
          <thead><tr><th>Classe</th><th>Produto</th><th className="text-right">Valor venda</th></tr></thead>
          <tbody>
            {(metrics.data?.abc ?? []).map((item) => (
              <tr key={item.productId}>
                <td><StatusBadge kind={item.class === "A" ? "success" : item.class === "B" ? "info" : "muted"}>{item.class}</StatusBadge></td>
                <td>{item.name}</td>
                <td className="text-right tabular-nums font-semibold">{money(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12 xl:col-span-7" title="Historico de movimentacoes" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Lote</th>
              <th>Validade</th>
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
                <td>{datePt(movement.expiresAt)}</td>
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
