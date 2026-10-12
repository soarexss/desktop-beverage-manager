import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Panel, Field } from "@/components/erp";
import { useAuth } from "@/components/auth-context";
import { apiGet, apiRequest } from "@/lib/api";
import { taxRegimes, type CompanyProfile } from "@/lib/company-profile";

export const Route = createFileRoute("/empresa")({ component: Empresa });
function Empresa() {
  const company = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => apiGet<CompanyProfile | null>("/company-profile"),
  });
  return (
    <div className="space-y-3">
      <div className="erp-panel p-3 text-sm">
        Configure a empresa desta instância. MEI também possui CNPJ; CNAE descreve a atividade e não
        determina sozinho a tributação de cada venda. Confirme os dados com o contador.
      </div>
      {company.isPending ? (
        <p role="status">Carregando configuração…</p>
      ) : company.isError ? (
        <p role="alert">
          {company.error.message}{" "}
          <button className="erp-btn" onClick={() => void company.refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : (
        <CompanyForm initial={company.data ?? null} />
      )}
    </div>
  );
}
function CompanyForm({ initial }: { initial: CompanyProfile | null }) {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const cache = useQueryClient();
  const [fields, setFields] = useState({
    legalName: initial?.legalName ?? "",
    tradeName: initial?.tradeName ?? "",
    document: initial?.document ?? "",
    stateRegistration: initial?.stateRegistration ?? "",
    municipalRegistration: initial?.municipalRegistration ?? "",
    taxRegime: initial?.taxRegime ?? "",
    primaryCnae: initial?.primaryCnae ?? "",
    secondaryCnaes: initial?.secondaryCnaes.join(", ") ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "DF",
    municipalityCode: initial?.municipalityCode ?? "",
    postalCode: initial?.postalCode ?? "",
    pixKey: initial?.pixKey ?? "",
    pixMerchantName: initial?.pixMerchantName ?? "",
    pixMerchantCity: initial?.pixMerchantCity ?? "",
  });
  const [pixEnabled, setPixEnabled] = useState(initial?.pixEnabled ?? false);
  const save = useMutation({
    mutationFn: () =>
      apiRequest<CompanyProfile>("/company-profile", {
        method: "PUT",
        body: JSON.stringify({
          ...fields,
          primaryCnae: fields.primaryCnae.replace(/[^\d]/g, ""),
          secondaryCnaes: fields.secondaryCnaes
            .split(/[,;\n]/)
            .map((value) => value.replace(/[^\d]/g, ""))
            .filter(Boolean),
          postalCode: fields.postalCode.replace(/[^\d]/g, ""),
          pixEnabled,
        }),
      }),
    onSuccess: (data) => {
      cache.setQueryData(["company-profile"], data);
    },
  });
  function input(key: keyof typeof fields, label: string, required = false, maxLength = 150) {
    return (
      <Field label={label}>
        <input
          className="erp-input w-full"
          value={fields[key]}
          required={required}
          maxLength={maxLength}
          onChange={(event) => {
            setFields((previous) => ({ ...previous, [key]: event.target.value }));
            save.reset();
          }}
        />
      </Field>
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={!admin || save.isPending} className="space-y-3">
        <Panel title="Empresa e enquadramento">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {input("legalName", "Razão social", true)}
            {input("tradeName", "Nome fantasia", true)}
            {input("document", "CNPJ — numérico ou alfanumérico", true, 20)}
            {input("stateRegistration", "Inscrição estadual / CFDF", false, 30)}
            {input("municipalRegistration", "Inscrição municipal", false, 30)}
            <Field label="Regime tributário">
              <select
                aria-label="Regime tributário"
                className="erp-input w-full"
                required
                value={fields.taxRegime}
                onChange={(event) => {
                  setFields((previous) => ({ ...previous, taxRegime: event.target.value }));
                  save.reset();
                }}
              >
                <option value="">Selecione</option>
                {Object.entries(taxRegimes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {input("primaryCnae", "CNAE principal", true, 10)}
            {input("secondaryCnaes", "CNAEs secundários — separados por vírgula", false, 600)}
          </div>
        </Panel>
        <Panel title="Endereço do estabelecimento">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {input("address", "Endereço completo", true, 250)}
            {input("city", "Cidade", true, 60)}
            <Field label="UF">
              <select
                aria-label="UF"
                className="erp-input w-full"
                value={fields.state}
                onChange={(event) =>
                  setFields((previous) => ({ ...previous, state: event.target.value }))
                }
              >
                {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
                  .split(" ")
                  .map((state) => (
                    <option key={state}>{state}</option>
                  ))}
              </select>
            </Field>
            {input("municipalityCode", "Código IBGE do município — 7 dígitos", true, 7)}
            {input("postalCode", "CEP", true, 9)}
          </div>
        </Panel>
        <Panel title="Pix direto para o lojista">
          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pixEnabled}
              onChange={(event) => {
                setPixEnabled(event.target.checked);
                save.reset();
              }}
            />{" "}
            Habilitar QR Code Pix estático no PDV
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            {input("pixKey", "Chave já cadastrada no banco", pixEnabled, 77)}
            {input("pixMerchantName", "Nome do recebedor", pixEnabled, 100)}
            {input("pixMerchantCity", "Cidade do recebedor", pixEnabled, 60)}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            O pagamento vai para a conta vinculada à chave. Não depende da Validapay. Confira
            titularidade e recebimento no aplicativo bancário: gerar o QR Code não confirma
            pagamento.
          </p>
        </Panel>
        {admin && (
          <button className="erp-btn erp-btn-primary" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar configuração"}
          </button>
        )}
      </fieldset>
      {!admin && (
        <p className="text-sm">
          Consulta fiscal. Somente o administrador altera esta configuração.
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-destructive">
          {save.error.message}
        </p>
      )}
      {save.isSuccess && <p role="status">Configuração salva.</p>}
      <p className="erp-panel p-3 text-sm">
        Emissão fiscal ainda não habilitada. Este cadastro prepara a empresa, mas não calcula
        impostos nem transmite NF-e/NFC-e. Credenciamento, certificado, CSC quando exigido, regras
        de produtos e homologação fazem parte da próxima integração.
      </p>
    </form>
  );
}
