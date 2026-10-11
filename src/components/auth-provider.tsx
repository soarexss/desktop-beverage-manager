import { useQueryClient } from "@tanstack/react-query";

import { useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, ServerCrash } from "lucide-react";

import { clearAuth, apiPost, login, restoreSession, storeAuth, type AuthUser } from "@/lib/api";

import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const value = useMemo<AuthContextValue | null>(
    () =>
      user
        ? {
            user,
            logout: () => {
              void apiPost("/auth/logout", {})
                .then(() => {
                  clearAuth();
                  queryClient.clear();
                  setUser(null);
                })
                .catch((err: unknown) =>
                  setError(err instanceof Error ? err.message : "Falha ao encerrar sessão"),
                );
            },
          }
        : null,

    [user, queryClient],
  );

  useEffect(() => {
    clearAuth();

    let active = true;

    const expired = () => {
      queryClient.clear();
      setUser(null);
    };

    window.addEventListener("erp-session-expired", expired);

    void restoreSession()
      .then((record) => {
        if (active) {
          storeAuth({ user: record });
          setUser(record);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setMounted(true);
      });

    return () => {
      active = false;
      window.removeEventListener("erp-session-expired", expired);
    };
  }, [queryClient]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = await login(email, password);
      storeAuth(auth);
      setUser(auth.user);

      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel conectar na API");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="erp-panel p-5 text-[12.5px] text-muted-foreground">
          Carregando sessao...
        </div>
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
              <div className="text-lg font-bold">Acesse sua loja</div>

              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Entre com o acesso fornecido pelo administrador.
              </p>
            </div>
            <label className="block">
              <span className="erp-label">E-mail</span>

              <input
                type="email"
                required
                autoComplete="username"
                className="erp-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="erp-label">Senha</span>
              <input
                className="erp-input"
                type="password"

                required

                autoComplete="current-password"

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

            <button
              className="erp-btn erp-btn-primary w-full justify-center py-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Entrar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {error && (
        <div role="alert" className="border border-destructive bg-background p-3 text-destructive">
          {error}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
