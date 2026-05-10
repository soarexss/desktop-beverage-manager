import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Mail, MapPin, Phone, Plus, RefreshCw, Search } from "lucide-react";
import { Panel, StatusBadge, Field } from "@/components/erp";
import { apiGet, apiPost } from "@/lib/api";
import { datePt, money } from "@/lib/format";

export const Route = createFileRoute("/clientes")({ component: Clientes });

type Client = {
  id: string;
  tradeName: string;
  legalName: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  address: string;
  creditLimit?: string | number;
  status?: string;
  createdAt: string;
};

type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
};

function Clientes() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    tradeName: "",
    legalName: "",
    document: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: 0,
  });

  const clients = useQuery({ queryKey: ["clients"], queryFn: () => apiGet<Client[]>("/clients") });
  const selected = clients.data?.find((client) => client.id === selectedId) ?? clients.data?.[0];
  const history = useQuery({
    queryKey: ["client-history", selected?.id],
    queryFn: () => apiGet<Order[]>(`/clients/${selected?.id}/history`),
    enabled: Boolean(selected?.id),
  });

  const createClient = useMutation({
    mutationFn: () => apiPost<Client>("/clients", form),
    onSuccess: (client) => {
      setSelectedId(client.id);
      setForm({ tradeName: "", legalName: "", document: "", phone: "", email: "", address: "", creditLimit: 0 });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const filtered = (clients.data ?? []).filter((client) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return [client.tradeName, client.legalName, client.document].some((value) => value.toLowerCase().includes(normalized));
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.tradeName || !form.legalName || !form.document || !form.address) {
      return;
    }
    createClient.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel className="col-span-12" title="Pesquisa de Clientes">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Razao / Nome">
            <input className="erp-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." />
          </Field>
          <Field label="Situacao">
            <select className="erp-input"><option>Todas</option><option>ACTIVE</option><option>BLOCKED</option></select>
          </Field>
          <div className="flex items-end gap-1.5">
            <button className="erp-btn erp-btn-primary" onClick={() => clients.refetch()}><Search className="h-3.5 w-3.5" />Pesquisar</button>
            <button className="erp-btn" onClick={() => setSearch("")}><RefreshCw className="h-3.5 w-3.5" />Limpar</button>
          </div>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title="Clientes cadastrados" actions={<span className="text-[11px] text-muted-foreground">{filtered.length} registros</span>} bodyClassName="p-0">
        <div className="max-h-[440px] overflow-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Razao social</th>
                <th>CNPJ/CPF</th>
                <th>Contato</th>
                <th className="text-right">Limite</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} onClick={() => setSelectedId(client.id)} className={client.id === selected?.id ? "bg-accent/10" : ""}>
                  <td className="font-semibold">{client.tradeName}</td>
                  <td className="font-mono text-[11.5px]">{client.document}</td>
                  <td>{client.phone ?? client.email ?? "-"}</td>
                  <td className="text-right tabular-nums">{money(client.creditLimit)}</td>
                  <td><StatusBadge kind={client.status === "BLOCKED" ? "danger" : "success"}>{client.status ?? "ACTIVE"}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Ficha do cliente">
        {selected ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded bg-accent/15 text-lg font-bold text-accent">
                {selected.tradeName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[14px] font-bold">{selected.legalName}</div>
                <div className="text-[11.5px] text-muted-foreground">CNPJ/CPF {selected.document} - desde {datePt(selected.createdAt)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selected.phone ?? "-"}</div>
              <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selected.email ?? "-"}</div>
              <div className="col-span-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {selected.address}</div>
            </div>
            <div className="my-3 grid grid-cols-3 gap-2 border-y py-2 text-center">
              <div><div className="text-[10.5px] uppercase text-muted-foreground">Limite</div><div className="font-bold tabular-nums">{money(selected.creditLimit)}</div></div>
              <div><div className="text-[10.5px] uppercase text-muted-foreground">Compras</div><div className="font-bold tabular-nums">{history.data?.length ?? 0}</div></div>
              <div><div className="text-[10.5px] uppercase text-muted-foreground">Status</div><div className="font-bold">{selected.status ?? "ACTIVE"}</div></div>
            </div>
            <div className="erp-label">Historico de compras</div>
            <table className="erp-table">
              <thead><tr><th>Pedido</th><th>Data</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
              <tbody>
                {(history.data ?? []).slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono">{order.id.slice(-6)}</td>
                    <td>{datePt(order.createdAt)}</td>
                    <td className="text-right tabular-nums">{money(order.totalAmount)}</td>
                    <td><StatusBadge kind={order.status === "COMPLETED" ? "success" : "info"}>{order.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Nenhum cliente selecionado.</div>
        )}
      </Panel>

      <Panel className="col-span-12" title="Cadastro rapido de cliente">
        <form className="grid gap-2 md:grid-cols-6" onSubmit={submit}>
          <Field label="Fantasia"><input className="erp-input" value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} required /></Field>
          <Field label="Razao social"><input className="erp-input" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} required /></Field>
          <Field label="CNPJ/CPF"><input className="erp-input" value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} required /></Field>
          <Field label="Telefone"><input className="erp-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Limite"><input className="erp-input text-right" type="number" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: Number(event.target.value) })} /></Field>
          <div className="flex items-end">
            <button className="erp-btn erp-btn-primary w-full justify-center" disabled={createClient.isPending}>
              <Plus className="h-3.5 w-3.5" />Salvar
            </button>
          </div>
          <div className="md:col-span-3"><Field label="E-mail"><input className="erp-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field></div>
          <div className="md:col-span-3"><Field label="Endereco"><input className="erp-input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /></Field></div>
        </form>
      </Panel>
    </div>
  );
}
