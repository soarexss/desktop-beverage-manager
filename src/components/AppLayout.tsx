import { Link, Outlet, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
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

export default function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = modules.find((m) => m.to === pathname) ?? modules[0];
  const { appearance, setAppearance } = useAppearance();
  const { user, logout } = useAuth();

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
          <span>v4.0.0</span>
        </div>
      </div>

      <div className="flex h-7 items-center gap-1 border-b bg-panel-header px-2 text-[12px]">
        {["Arquivo", "Editar", "Cadastros", "Movimentos", "Fiscal", "Relatorios", "Ferramentas", "Janela", "Ajuda"].map((m) => (
          <button key={m} className="rounded-sm px-2 py-0.5 hover:bg-accent/15">{m}</button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-muted-foreground">
          <span>Caixa: <b className="text-foreground">#0241</b></span>
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
              <input placeholder="Buscar produto, cliente, pedido... (Ctrl+K)" className="erp-input w-80 pl-7" />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                className="erp-btn"
                onClick={() => setAppearance(appearance === "modern" ? "classic" : "modern")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {appearance === "modern" ? "Visual Original" : "Visual Moderno"}
              </button>
              <button className="erp-btn relative">
                <Bell className="h-3.5 w-3.5" />
                Alertas
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">5</span>
              </button>
              <button className="erp-btn"><HelpCircle className="h-3.5 w-3.5" />Ajuda</button>
              <button className="erp-btn" onClick={logout}><LogOut className="h-3.5 w-3.5" />Sair</button>
              <div className="ml-1 flex items-center gap-2 border-l pl-3 text-[12px]">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-[10.5px] text-muted-foreground">{user.role} - Matriz</div>
                </div>
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
