import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  FileText,
  BarChart3,
  ShieldCheck,
  Bell,
  Search,
  User,
  Wifi,
  Database,
  HelpCircle,
  Sparkles,
  Building2,
  ClipboardList,
  LogOut,
  CalendarDays,
  MessageSquarePlus,
  Settings,
  Moon,
  Sun,
  Type,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { numberPt } from "@/lib/format";
import { useAppearance } from "./appearance-provider";
import { useAuth } from "./auth-provider";

const modules = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, key: "F1" },
  { to: "/cadastros", label: "Cadastros", icon: Building2, key: "F2" },
  { to: "/estoque", label: "Estoque", icon: Package, key: "F3" },
  { to: "/compras", label: "Compras", icon: ClipboardList, key: "F4" },
  { to: "/vendas", label: "Vendas / PDV", icon: ShoppingCart, key: "F5" },
  { to: "/clientes", label: "Clientes", icon: Users, key: "F6" },
  { to: "/entregas", label: "Entregas", icon: Truck, key: "F7" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, key: "F8" },
  { to: "/notas", label: "Nota Fiscal", icon: FileText, key: "F9" },
  { to: "/relatorios", label: "Relatorios", icon: BarChart3, key: "F10" },
  { to: "/usuarios", label: "Usuarios", icon: ShieldCheck, key: "F11" },
];

type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  minStock: number;
};

type Client = {
  id: string;
  tradeName: string;
  document: string;
  phone?: string | null;
};

type Order = {
  id: string;
  status: string;
  totalAmount: string | number;
  client?: { tradeName: string } | null;
};

type InventoryMovement = {
  productId: string;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  quantity: string | number;
};

type PersonalNote = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
  done?: boolean;
};

type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  notes?: string;
  done?: boolean;
};

const NOTES_KEY = "distribev-alert-notes";
const AGENDA_KEY = "distribev-alert-agenda";

function readStoredList<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export default function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = modules.find((m) => m.to === pathname) ?? modules[0];
  const {
    appearance,
    colorScheme,
    fontScale,
    fontFamily,
    setAppearance,
    setColorScheme,
    setFontScale,
    setFontFamily,
  } = useAppearance();
  const { user, logout } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notes, setNotes] = useState<PersonalNote[]>(() => readStoredList<PersonalNote>(NOTES_KEY));
  const [agenda, setAgenda] = useState<AgendaEvent[]>(() => readStoredList<AgendaEvent>(AGENDA_KEY));
  const [noteForm, setNoteForm] = useState({ title: "", note: "" });
  const [agendaForm, setAgendaForm] = useState({ title: "", date: new Date().toISOString().slice(0, 10), notes: "" });

  const products = useQuery({ queryKey: ["layout-products"], queryFn: () => apiGet<Product[]>("/products") });
  const clients = useQuery({ queryKey: ["layout-clients"], queryFn: () => apiGet<Client[]>("/clients") });
  const orders = useQuery({ queryKey: ["layout-orders"], queryFn: () => apiGet<Order[]>("/orders") });
  const movements = useQuery({ queryKey: ["layout-inventory"], queryFn: () => apiGet<InventoryMovement[]>("/inventory/movements") });

  useEffect(() => {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    window.localStorage.setItem(AGENDA_KEY, JSON.stringify(agenda));
  }, [agenda]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const lowStock = useMemo(() => {
    const stock = new Map<string, number>();
    for (const movement of movements.data ?? []) {
      const quantity = Number(movement.quantity);
      stock.set(movement.productId, (stock.get(movement.productId) ?? 0) + (movement.type === "OUTBOUND" ? -quantity : quantity));
    }

    return (products.data ?? [])
      .map((product) => ({ ...product, currentStock: stock.get(product.id) ?? 0 }))
      .filter((product) => product.currentStock <= product.minStock)
      .slice(0, 5);
  }, [movements.data, products.data]);

  const globalResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    const productResults = (products.data ?? [])
      .filter((product) => [product.name, product.sku, product.barcode].some((value) => value?.toLowerCase().includes(term)))
      .slice(0, 5)
      .map((product) => ({
        id: `product-${product.id}`,
        title: product.name,
        subtitle: `Produto - ${product.sku}`,
        to: "/estoque",
      }));

    const clientResults = (clients.data ?? [])
      .filter((client) => [client.tradeName, client.document, client.phone].some((value) => value?.toLowerCase().includes(term)))
      .slice(0, 5)
      .map((client) => ({
        id: `client-${client.id}`,
        title: client.tradeName,
        subtitle: `Cliente - ${client.document}`,
        to: "/clientes",
      }));

    const orderResults = (orders.data ?? [])
      .filter((order) => [order.id, order.status, order.client?.tradeName].some((value) => value?.toLowerCase().includes(term)))
      .slice(0, 5)
      .map((order) => ({
        id: `order-${order.id}`,
        title: `Pedido ${order.id.slice(-6)}`,
        subtitle: `${order.client?.tradeName ?? "Sem cliente"} - ${order.status}`,
        to: "/vendas",
      }));

    return [...productResults, ...clientResults, ...orderResults].slice(0, 10);
  }, [clients.data, orders.data, products.data, search]);

  const pendingAgenda = agenda.filter((event) => !event.done);
  const pendingNotes = notes.filter((note) => !note.done);
  const alertCount = lowStock.length + pendingAgenda.length + pendingNotes.length;

  function addNote() {
    if (!noteForm.title.trim()) {
      return;
    }
    setNotes((currentNotes) => [
      {
        id: crypto.randomUUID(),
        title: noteForm.title,
        note: noteForm.note,
        createdAt: new Date().toISOString(),
      },
      ...currentNotes,
    ]);
    setNoteForm({ title: "", note: "" });
  }

  function addAgendaEvent() {
    if (!agendaForm.title.trim() || !agendaForm.date) {
      return;
    }
    setAgenda((currentAgenda) => [
      {
        id: crypto.randomUUID(),
        title: agendaForm.title,
        date: agendaForm.date,
        notes: agendaForm.notes,
      },
      ...currentAgenda,
    ]);
    setAgendaForm({ title: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex h-9 items-center justify-between bg-titlebar px-3 text-titlebar-foreground select-none">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold">
          <div className="grid h-5 w-5 place-items-center rounded-sm bg-accent text-[11px] font-bold">DB</div>
          <span>DistriBev ERP</span>
          <span className="opacity-60">- Sistema de Gestao de Distribuidora</span>
        </div>
        <div className="flex items-center gap-3 text-[11.5px] opacity-90">
          <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Online</span>
          <span className="flex items-center gap-1"><Database className="h-3 w-3" /> API v1</span>
          <span>v4.1.0</span>
        </div>
      </div>

      <div className="flex h-7 items-center gap-1 border-b bg-panel-header px-2 text-[12px]">
        <Link to="/" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Arquivo</Link>
        <Link to="/cadastros" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Cadastros</Link>
        <Link to="/vendas" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Movimentos</Link>
        <Link to="/notas" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Fiscal</Link>
        <Link to="/relatorios" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Relatorios</Link>
        <button className="rounded-sm px-2 py-0.5 hover:bg-accent/15" onClick={() => setUserOpen(true)}>Ferramentas</button>
        <Link to="/ajuda" className="rounded-sm px-2 py-0.5 hover:bg-accent/15">Ajuda</Link>
        <div className="ml-auto flex items-center gap-3 text-muted-foreground">
          <span>Caixa: <b className="text-foreground">{alertCount ? "Atenção" : "OK"}</b></span>
          <span>Filial: <b className="text-foreground">Matriz</b></span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wider opacity-60">Modulos</div>
          <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
            {modules.map((m) => {
              const active = pathname === m.to;
              const Icon = m.icon;
              return (
                <Link
                  key={m.to}
                  to={m.to}
                  className={`mb-0.5 flex items-center gap-2 rounded px-2.5 py-1.5 text-[12.5px] transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-accent"
                      : "hover:bg-sidebar-accent/60"
                  }`}
                >
                  <Icon className="h-4 w-4 opacity-90" />
                  <span className="flex-1">{m.label}</span>
                  <span className="text-[10px] opacity-50">{m.key}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-2">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider opacity-60">Atalhos</div>
            <div className="grid grid-cols-2 gap-1 text-[11.5px]">
              <Link to="/vendas" className="rounded bg-sidebar-accent/40 px-2 py-1 text-left hover:bg-sidebar-accent">+ Pedido</Link>
              <Link to="/clientes" className="rounded bg-sidebar-accent/40 px-2 py-1 text-left hover:bg-sidebar-accent">+ Cliente</Link>
              <Link to="/estoque" className="rounded bg-sidebar-accent/40 px-2 py-1 text-left hover:bg-sidebar-accent">+ Produto</Link>
              <Link to="/notas" className="rounded bg-sidebar-accent/40 px-2 py-1 text-left hover:bg-sidebar-accent">+ NFe</Link>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-11 items-center gap-3 border-b bg-card px-3">
            <div className="text-[12.5px] text-muted-foreground">
              <span>Voce esta em:</span>{" "}
              <span className="font-semibold text-foreground">{current.label}</span>
            </div>

            <div className="relative ml-4">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar produto, cliente, pedido... (Ctrl+K)"
                className="erp-input w-80 pl-7"
              />
              {searchOpen && search.trim().length >= 2 && (
                <div className="absolute left-0 top-9 z-50 w-[520px] overflow-hidden rounded border border-border bg-card shadow-lg">
                  <div className="border-b bg-panel-header px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">Resultados da busca</div>
                  <div className="max-h-80 overflow-auto">
                    {globalResults.map((result) => (
                      <Link
                        key={result.id}
                        to={result.to}
                        className="block border-b px-3 py-2 hover:bg-muted"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearch("");
                        }}
                      >
                        <div className="font-semibold">{result.title}</div>
                        <div className="text-[11px] text-muted-foreground">{result.subtitle}</div>
                      </Link>
                    ))}
                    {!globalResults.length && (
                      <div className="px-3 py-6 text-center text-muted-foreground">Nenhum resultado encontrado.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                className="erp-btn"
                onClick={() => setAppearance(appearance === "modern" ? "classic" : "modern")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {appearance === "modern" ? "Visual Original" : "Visual Moderno"}
              </button>
              <div className="relative">
                <button className="erp-btn relative" onClick={() => setAlertsOpen((open) => !open)}>
                  <Bell className="h-3.5 w-3.5" />
                  Alertas
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{alertCount}</span>
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-9 z-50 w-[560px] rounded border border-border bg-card shadow-lg">
                    <div className="flex items-center justify-between border-b bg-panel-header px-3 py-2">
                      <span className="text-[12px] font-semibold uppercase">Alertas, notas e agenda</span>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setAlertsOpen(false)}>Fechar</button>
                    </div>
                    <div className="grid gap-3 p-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><Bell className="h-3.5 w-3.5" />Sistema</div>
                        <div className="max-h-40 overflow-auto rounded border">
                          {lowStock.map((product) => (
                            <div key={product.id} className="border-b p-2">
                              <div className="font-semibold">Estoque baixo: {product.name}</div>
                              <div className="text-[11px] text-muted-foreground">{numberPt(product.currentStock, 3)} em estoque</div>
                            </div>
                          ))}
                          {!lowStock.length && <div className="p-4 text-center text-muted-foreground">Sem alertas criticos.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Agenda</div>
                        <div className="grid grid-cols-2 gap-1">
                          <input className="erp-input" value={agendaForm.title} onChange={(event) => setAgendaForm({ ...agendaForm, title: event.target.value })} placeholder="Compromisso" />
                          <input className="erp-input" type="date" value={agendaForm.date} onChange={(event) => setAgendaForm({ ...agendaForm, date: event.target.value })} />
                          <input className="erp-input col-span-2" value={agendaForm.notes} onChange={(event) => setAgendaForm({ ...agendaForm, notes: event.target.value })} placeholder="Observacao" />
                          <button className="erp-btn erp-btn-primary col-span-2 justify-center" onClick={addAgendaEvent}>Adicionar agenda</button>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><MessageSquarePlus className="h-3.5 w-3.5" />Notas pessoais</div>
                        <div className="grid gap-1">
                          <input className="erp-input" value={noteForm.title} onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })} placeholder="Titulo da nota" />
                          <textarea className="erp-input min-h-16" value={noteForm.note} onChange={(event) => setNoteForm({ ...noteForm, note: event.target.value })} placeholder="Anotacao rapida" />
                          <button className="erp-btn justify-center" onClick={addNote}>Salvar nota</button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-auto rounded border">
                        {[...pendingAgenda.map((item) => ({ ...item, kind: "agenda" as const })), ...pendingNotes.map((item) => ({ ...item, kind: "note" as const }))].map((item) => (
                          <div key={item.id} className="border-b p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">{item.title}</div>
                              <button
                                className="text-[11px] text-success"
                                onClick={() => {
                                  if (item.kind === "agenda") {
                                    setAgenda((rows) => rows.map((row) => row.id === item.id ? { ...row, done: true } : row));
                                  } else {
                                    setNotes((rows) => rows.map((row) => row.id === item.id ? { ...row, done: true } : row));
                                  }
                                }}
                              >
                                concluir
                              </button>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.kind === "agenda" ? item.date : item.note}
                            </div>
                          </div>
                        ))}
                        {!pendingAgenda.length && !pendingNotes.length && <div className="p-4 text-center text-muted-foreground">Sem notas ou agenda pendente.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link to="/ajuda" className="erp-btn"><HelpCircle className="h-3.5 w-3.5" />Ajuda</Link>
              <button className="erp-btn" onClick={logout}><LogOut className="h-3.5 w-3.5" />Sair</button>
              <div className="relative">
                <button className="ml-1 flex items-center gap-2 border-l pl-3 text-left text-[12px]" onClick={() => setUserOpen((open) => !open)}>
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-[10.5px] text-muted-foreground">{user.role} - Matriz</div>
                  </div>
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-9 z-50 w-80 rounded border border-border bg-card p-3 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 border-b pb-2 font-semibold"><Settings className="h-4 w-4" />Preferencias do usuario</div>
                    <div className="space-y-2">
                      <label className="block">
                        <span className="erp-label">Tema</span>
                        <div className="grid grid-cols-2 gap-1">
                          <button className={`erp-btn justify-center ${colorScheme === "light" ? "erp-btn-primary" : ""}`} onClick={() => setColorScheme("light")}><Sun className="h-3.5 w-3.5" />Claro</button>
                          <button className={`erp-btn justify-center ${colorScheme === "dark" ? "erp-btn-primary" : ""}`} onClick={() => setColorScheme("dark")}><Moon className="h-3.5 w-3.5" />Escuro</button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="erp-label">Tamanho das letras</span>
                        <select className="erp-input" value={fontScale} onChange={(event) => setFontScale(event.target.value as typeof fontScale)}>
                          <option value="compact">Compacto</option>
                          <option value="normal">Normal</option>
                          <option value="large">Grande</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="erp-label">Fonte</span>
                        <select className="erp-input" value={fontFamily} onChange={(event) => setFontFamily(event.target.value as typeof fontFamily)}>
                          <option value="system">Sistema</option>
                          <option value="inter">Inter / Segoe</option>
                          <option value="mono">Monoespacada</option>
                        </select>
                      </label>
                      <button className="erp-btn w-full justify-center" onClick={() => setAppearance(appearance === "modern" ? "classic" : "modern")}>
                        <Type className="h-3.5 w-3.5" />Alternar visual {appearance === "modern" ? "original" : "moderno"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex items-center gap-2 border-b bg-muted px-3 py-1 text-[11.5px] text-muted-foreground">
            <span>Inicio</span>
            <span>/</span>
            <span className="font-semibold text-foreground">{current.label}</span>
          </div>

          <main className="flex-1 overflow-auto p-3">
            <Outlet />
          </main>

          <footer className="flex h-6 items-center justify-between border-t bg-panel-header px-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span><span className="text-success">OK</span> Conectado</span>
              <span>Usuario: <b className="text-foreground">{user.email}</b></span>
              <span>Empresa: <b className="text-foreground">Distribuidora Sol Bebidas LTDA</b></span>
            </div>
            <div className="flex items-center gap-4">
              <span>CAPS</span>
              <span>NUM</span>
              <span>{new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
