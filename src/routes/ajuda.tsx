import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { Bug, CheckCircle2, HelpCircle, Lightbulb, MessageSquare, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { Panel, Field, StatusBadge } from "@/components/erp";

export const Route = createFileRoute("/ajuda")({ component: Ajuda });

type Feedback = {
  id: string;
  type: "BUG" | "FEATURE" | "COMMENT";
  title: string;
  message: string;
  priority: "BAIXA" | "MEDIA" | "ALTA";
  createdAt: string;
};

const FEEDBACK_KEY = "distribev-feedback";

function Ajuda() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [form, setForm] = useState({
    type: "BUG" as Feedback["type"],
    title: "",
    message: "",
    priority: "MEDIA" as Feedback["priority"],
  });

  useEffect(() => {
    try {
      setFeedbacks(JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) ?? "[]") as Feedback[]);
    } catch {
      setFeedbacks([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
  }, [feedbacks]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      return;
    }
    setFeedbacks((current) => [
      {
        id: crypto.randomUUID(),
        ...form,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setForm({ type: "BUG", title: "", message: "", priority: "MEDIA" });
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <Panel
        className="col-span-12"
        title={<span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Ajuda, contato e instrucoes</span>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <InfoCard icon={ShieldCheck} title="Operacao diaria" text="Use Dashboard para situacao geral, Vendas para pedidos, Estoque para saldo e Financeiro para caixa, titulos e bancos." />
          <InfoCard icon={CheckCircle2} title="Fluxo recomendado" text="Cadastre base, lance compras/entradas, venda no PDV, acompanhe entregas, baixe financeiro e gere relatorios." />
          <InfoCard icon={Lightbulb} title="Atalhos" text="A busca superior localiza clientes, produtos e pedidos. O sino abre notas pessoais, agenda e alertas criticos." />
          <InfoCard icon={MessageSquare} title="Feedback" text="Registre bugs, ideias de recurso e comentarios. Esta versao salva localmente no navegador para triagem." />
        </div>
      </Panel>

      <Panel className="col-span-12 lg:col-span-5" title="Enviar feedback">
        <form className="space-y-2" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipo">
              <select className="erp-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Feedback["type"] })}>
                <option value="BUG">Bug / erro</option>
                <option value="FEATURE">Nova feature</option>
                <option value="COMMENT">Comentario</option>
              </select>
            </Field>
            <Field label="Prioridade">
              <select className="erp-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Feedback["priority"] })}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
              </select>
            </Field>
          </div>
          <Field label="Titulo">
            <input className="erp-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: erro ao fechar caixa" />
          </Field>
          <Field label="Descricao">
            <textarea className="erp-input min-h-32" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Descreva o que aconteceu, o que esperava ou a melhoria desejada." />
          </Field>
          <button className="erp-btn erp-btn-primary w-full justify-center"><Send className="h-3.5 w-3.5" />Registrar feedback</button>
        </form>
      </Panel>

      <Panel className="col-span-12 lg:col-span-7" title="Historico local de feedback" bodyClassName="p-0">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Titulo</th>
              <th>Descricao</th>
              <th>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((feedback) => (
              <tr key={feedback.id}>
                <td>
                  <span className="inline-flex items-center gap-1">
                    {feedback.type === "BUG" ? <Bug className="h-3.5 w-3.5 text-destructive" /> : feedback.type === "FEATURE" ? <Lightbulb className="h-3.5 w-3.5 text-warning-foreground" /> : <MessageSquare className="h-3.5 w-3.5 text-info" />}
                    {feedback.type}
                  </span>
                </td>
                <td className="font-semibold">{feedback.title}</td>
                <td className="text-muted-foreground">{feedback.message}</td>
                <td><StatusBadge kind={feedback.priority === "ALTA" ? "danger" : feedback.priority === "MEDIA" ? "warning" : "muted"}>{feedback.priority}</StatusBadge></td>
              </tr>
            ))}
            {!feedbacks.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum feedback registrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel className="col-span-12" title="Guia rapido de uso">
        <div className="grid gap-3 text-[12.5px] md:grid-cols-3">
          <Guide title="1. Cadastros" text="Configure estabelecimento, fornecedores, vendedores, clientes, grupos, marcas, unidades, impostos, NCM, CFOP, transportadoras e formas de pagamento." />
          <Guide title="2. Estoque e compras" text="Cadastre produtos, lance entradas, acompanhe estoque minimo, lotes, custo, saldo e ajustes antes das vendas." />
          <Guide title="3. Financeiro" text="Abra caixa, registre movimentos, acompanhe bancos, contas a pagar, contas a receber, comissoes e relatórios." />
        </div>
      </Panel>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded border bg-card p-3">
      <Icon className="mb-2 h-4 w-4 text-info" />
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{text}</div>
    </div>
  );
}

function Guide({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-muted-foreground">{text}</div>
    </div>
  );
}
