const routes: Record<string, string[]> = {
  "/": ["admin", "financeiro"],
  "/cadastros": ["admin", "compras", "estoquista", "financeiro", "fiscal", "vendedor"],
  "/empresa": ["admin", "fiscal"],
  "/estoque": ["admin", "estoquista", "compras", "vendedor"],
  "/compras": ["admin", "compras"],
  "/vendas": ["admin", "caixa", "vendedor"],
  "/maquininhas": ["admin", "caixa", "vendedor", "financeiro"],
  "/clientes": ["admin", "caixa", "vendedor"],
  "/entregas": ["admin", "entregador"],
  "/financeiro": ["admin", "caixa", "financeiro"],
  "/notas": ["admin", "fiscal", "financeiro"],
  "/relatorios": ["admin", "financeiro"],
  "/usuarios": ["admin"],
  "/ajuda": [
    "admin",
    "vendedor",
    "caixa",
    "entregador",
    "compras",
    "estoquista",
    "financeiro",
    "fiscal",
  ],
};
export function canAccess(path: string, role: string) {
  return routes[path]?.includes(role) ?? false;
}
