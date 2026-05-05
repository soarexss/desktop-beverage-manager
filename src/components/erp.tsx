import type { ReactNode } from "react";

export function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`erp-panel ${className}`}>
      <header className="erp-panel-header">
        <span>{title}</span>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      <div className={`erp-panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function StatusBadge({ kind, children }: { kind: "success" | "warning" | "danger" | "info" | "muted"; children: ReactNode }) {
  const map: Record<string, string> = {
    success: "bg-success/15 text-success border border-success/30",
    warning: "bg-warning/20 text-warning-foreground border border-warning/40",
    danger: "bg-destructive/15 text-destructive border border-destructive/30",
    info: "bg-info/15 text-info border border-info/30",
    muted: "bg-muted text-muted-foreground border border-border",
  };
  return <span className={`erp-status ${map[kind]}`}>{children}</span>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-2 flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="erp-label">{label}</span>
      {children}
    </label>
  );
}
