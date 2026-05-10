import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, ServerCrash } from "lucide-react";
import { clearAuth, getStoredAuth, login, storeAuth, type AuthUser } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("admin@distribev.local");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const value = useMemo<AuthContextValue | null>(
    () =>
      user
        ? {
            user,
            logout: () => {
              clearAuth();
              setUser(null);
            },
          }
        : null,
    [user],
  );

  useEffect(() => {
    const stored = getStoredAuth();
    setUser(stored.user);
    setMounted(true);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = await login(email, password);
      storeAuth(auth);
      setUser(auth.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel conectar na API");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="erp-panel p-5 text-[12.5px] text-muted-foreground">Carregando sessao...</div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <form onSubmit={handleSubmit} className="erp-panel w-full max-w-md">
          <div className="erp-panel-header">
            <span>Entrar no DistriBev ERP</span>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <div className="text-lg font-bold">Conexao com API</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Use o usuario semeado do backend para acessar os dados reais do sistema.
              </p>
            </div>
            <label className="block">
              <span className="erp-label">E-mail</span>
              <input className="erp-input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="erp-label">Senha</span>
              <input
                className="erp-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-[12.5px] text-destructive">
                <ServerCrash className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <button className="erp-btn erp-btn-primary w-full justify-center py-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Entrar
            </button>
            <div className="rounded bg-muted p-2 text-[11.5px] text-muted-foreground">
              Rode no backend: npm install, npm run prisma:migrate, npm run prisma:seed e npm run start:dev.
            </div>
          </div>
        </form>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
