import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, Wallet,
  FileText, BarChart3, ShieldCheck, Bell, Search, ChevronLeft,
  Settings, LogOut, Wine,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const modules = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/vendas", label: "Vendas / PDV", icon: ShoppingCart },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/entregas", label: "Entregas", icon: Truck },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/notas", label: "Nota Fiscal", icon: FileText },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/usuarios", label: "Usuários", icon: ShieldCheck },
];

export default function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = modules.find((m) => m.to === pathname) ?? modules[0];
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      );
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        style={{ boxShadow: "1px 0 0 oklch(1 0 0 / 0.02)" }}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 12px oklch(0.66 0.18 250 / 0.4)" }}>
            <Wine className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="text-[14px] font-semibold leading-tight text-white">DistriBev</div>
                <div className="text-[10.5px] text-sidebar-foreground/60 uppercase tracking-wider">Enterprise Suite</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/50 font-semibold">
              Módulos
            </div>
          )}
          <ul className="space-y-0.5">
            {modules.map((m) => {
              const active = pathname === m.to;
              const Icon = m.icon;
              return (
                <li key={m.to}>
                  <Link to={m.to} className={`nav-item ${active ? "active" : ""}`} title={collapsed ? m.label : undefined}>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="flex-1"
                        >
                          {m.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer of sidebar */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <button className="nav-item w-full" title="Configurações">
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </button>
          <button className="nav-item w-full" title="Sair">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-16 z-10 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface-elevated text-foreground shadow-md hover:bg-accent hover:text-white transition-all"
          style={{ boxShadow: "var(--shadow-md)" }}
          aria-label="Toggle sidebar"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </motion.div>
        </button>
      </motion.aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-surface px-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Módulo</div>
            <div className="text-[14px] font-semibold text-foreground leading-tight">{current.label}</div>
          </div>

          <div className="ml-6 relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar produto, cliente, pedido…    Ctrl+K"
              className="erp-input pl-9 h-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="erp-btn erp-btn-ghost relative h-9 w-9 !p-0">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" style={{ boxShadow: "0 0 6px oklch(0.62 0.22 25)" }} />
            </button>

            <div className="ml-2 flex items-center gap-3 border-l border-border pl-4">
              <div className="text-right leading-tight">
                <div className="text-[12.5px] font-semibold">João Almeida</div>
                <div className="text-[10.5px] text-muted-foreground">Administrador • Matriz</div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-sm)" }}>
                JA
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main key={pathname} className="flex-1 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="p-5"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Status bar */}
        <footer className="flex h-7 items-center justify-between border-t border-border bg-surface px-5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" style={{ boxShadow: "0 0 6px oklch(0.68 0.16 155 / 0.8)" }} />
              Conectado
            </span>
            <span>Servidor: <b className="text-foreground">SRV-01</b></span>
            <span>Caixa: <b className="text-foreground">#0241</b></span>
            <span>Filial: <b className="text-foreground">Matriz</b></span>
          </div>
          <div className="flex items-center gap-5">
            <span>Distribuidora Sol Bebidas LTDA</span>
            <span>v3.14.2</span>
            <span suppressHydrationWarning>{now}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
