import { useEffect, useState } from "react";
import { useIsFetching, useMutationState, useQueryClient } from "@tanstack/react-query";

export function DataStatus() {
  const client = useQueryClient();
  const loading = useIsFetching();
  const [queryError, setQueryError] = useState("");
  useEffect(
    () =>
      client.getQueryCache().subscribe(() => {
        const failed = client
          .getQueryCache()
          .getAll()
          .find((query) => query.isActive() && query.state.status === "error");
        setQueryError(failed?.state.error?.message ?? "");
      }),
    [client],
  );
  const errors = useMutationState({
    filters: { status: "error" },
    select: (mutation) =>
      mutation.state.error instanceof Error
        ? mutation.state.error.message
        : "Operação não concluída",
  });
  const message = errors.at(-1) || queryError;
  return (
    <>
      {loading > 0 && (
        <div role="status" className="mb-2 text-sm text-muted-foreground">
          Atualizando dados...
        </div>
      )}
      {message && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          <span>{message}</span>
          <button
            className="erp-btn"
            onClick={() => {
              const cache = client.getMutationCache();
              cache
                .getAll()
                .filter((mutation) => mutation.state.status === "error")
                .forEach((mutation) => cache.remove(mutation));
              void client.invalidateQueries();
            }}
          >
            Tentar novamente / dispensar
          </button>
        </div>
      )}
    </>
  );
}
