import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Field, Panel } from "@/components/erp";
import { apiPost } from "@/lib/api";
import { money } from "@/lib/format";

type NfeItem = {
  line: number;
  code: string;
  name: string;
  unit: string;
  barcode: string | null;
  ncm: string;
  cfop: string;
  quantity: string;
  unitCost: string;
  total: string;
  batchNumber: string | null;
  expiresAt: string | null;
  candidates: Array<{ id: string; name: string; barcode: string | null }>;
};
type NfePreview = {
  accessKey: string;
  number: string;
  series: string;
  issuedAt: string;
  issuerDocument: string;
  supplierName: string;
  recipientDocument: string;
  totalAmount: string;
  subtotal: string;
  freightAmount: string;
  discountAmount: string;
  existingPurchaseId: string | null;
  authenticity: "NOT_VERIFIED";
  items: NfeItem[];
};
type Mapping = {
  line: number;
  productId: string;
  newSku: string;
  salePrice: string;
  stockFactor: string;
  stockUnit: string;
};
export function NfeImportPanel({
  products,
}: {
  products: Array<{ id: string; name: string; sku: string }>;
}) {
  const cache = useQueryClient();
  const [xml, setXml] = useState("");
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState<NfePreview | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [checked, setChecked] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [requestId, setRequestId] = useState("");
  const read = useMutation({
    mutationFn: (xmlContent: string) =>
      apiPost<NfePreview>("/fiscal-imports/preview", { xmlContent }),
    onSuccess: (data) => {
      setPreview(data);
      setRequestId(crypto.randomUUID());
      setChecked(false);
      setMappings(
        data.items.map((item) => ({
          line: item.line,
          productId: item.candidates.length === 1 ? item.candidates[0].id : "",
          newSku: "",
          salePrice: "",
          stockFactor: "1",
          stockUnit: item.unit,
        })),
      );
    },
  });
  const save = useMutation({
    mutationFn: () =>
      apiPost<{ purchaseOrderId: string; alreadyImported: boolean }>("/fiscal-imports", {
        xmlContent: xml,
        requestId,
        authenticityChecked: checked,
        dueDate: `${dueDate}T12:00:00-03:00`,
        items: mappings.map((item) => ({
          line: item.line,
          stockFactor: Number(item.stockFactor),
          ...(item.productId === "NEW"
            ? { newSku: item.newSku, salePrice: Number(item.salePrice), stockUnit: item.stockUnit }
            : { productId: item.productId }),
        })),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["operations", "purchases"] });
      void cache.invalidateQueries({ queryKey: ["products"] });
      void cache.invalidateQueries({ queryKey: ["registries"] });
    },
  });
  async function fileSelected(file?: File) {
    setPreview(null);
    setXml("");
    setFileError("");
    read.reset();
    save.reset();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml") || file.size > 512 * 1024) {
      setFileError(
        "Selecione um arquivo .xml de até 512 KiB. PDF/DANFE não contém os dados estruturados necessários.",
      );
      return;
    }
    try {
      const content = await file.text();
      setXml(content);
      read.mutate(content);
    } catch {
      setFileError("Não foi possível ler o arquivo.");
    }
  }
  function update(line: number, values: Partial<Mapping>) {
    setMappings((previous) =>
      previous.map((item) => (item.line === line ? { ...item, ...values } : item)),
    );
    save.reset();
  }
  const busy = read.isPending || save.isPending;
  return (
    <Panel className="col-span-12" title="Importar compra por XML de NF-e">
      <p className="mb-3 text-sm text-muted-foreground">
        Importe o XML modelo 55 enviado pelo fornecedor. Só o número curto da nota não permite
        recuperar os itens. Configure antes o CNPJ em{" "}
        <Link to="/empresa" className="underline">
          Empresa e Pix
        </Link>{" "}
        (administrador).
      </p>
      <Field label="Arquivo XML da NF-e — até 100 itens e 512 KiB">
        <input
          type="file"
          accept=".xml,application/xml,text/xml"
          className="erp-input w-full"
          disabled={busy}
          onChange={(event) => void fileSelected(event.target.files?.[0])}
        />
      </Field>
      {read.isPending && (
        <p role="status" className="mt-2">
          Lendo e conferindo estrutura da nota…
        </p>
      )}
      {(fileError || read.isError) && (
        <p role="alert" className="mt-2 text-destructive">
          {fileError || read.error?.message}
        </p>
      )}
      {preview && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <strong>{preview.supplierName}</strong>
              <br />
              CNPJ {preview.issuerDocument}
            </p>
            <p>
              NF-e {preview.number} / série {preview.series}
              <br />
              Total da nota: <strong>{money(preview.totalAmount)}</strong>
            </p>
            <p className="min-w-0 break-all md:col-span-2">Chave: {preview.accessKey}</p>
          </div>
          {preview.existingPurchaseId ? (
            <p role="status">
              Esta nota já foi importada. Confira a compra existente na lista abaixo; não será
              criada outra entrada.
            </p>
          ) : save.isSuccess ? (
            <p role="status">
              Compra preparada. Confira a mercadoria e clique em “Confirmar recebimento” na lista
              abaixo para gerar estoque e conta a pagar. Nenhum pagamento foi registrado.
            </p>
          ) : (
            <>
              <p className="text-sm">
                Confira cada vínculo e a conversão. Exemplo: 10 caixas com fator 12 entram como 120
                unidades. Sugestões por código de barras exigem sua conferência; códigos do
                fornecedor não são usados como SKU interno automaticamente.
              </p>
              <fieldset disabled={busy} className="space-y-2">
                {preview.items.map((item) => {
                  const mapping = mappings.find((row) => row.line === item.line)!;
                  return (
                    <div key={item.line} className="border border-border p-3">
                      <p className="mb-2 text-sm">
                        <strong>
                          {item.line}. {item.name}
                        </strong>{" "}
                        — {item.quantity} {item.unit} · {money(item.total)}
                        <br />
                        <span className="text-muted-foreground">
                          Fornecedor: {item.code} · NCM {item.ncm} · CFOP de origem {item.cfop}
                          {item.batchNumber
                            ? ` · Lote ${item.batchNumber} / validade ${item.expiresAt}`
                            : ""}
                        </span>
                      </p>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        <Field label={`Produto no estoque — item ${item.line}`}>
                          <select
                            aria-label={`Produto no estoque — item ${item.line}`}
                            className="erp-input w-full"
                            required
                            value={mapping.productId}
                            onChange={(event) =>
                              update(item.line, { productId: event.target.value })
                            }
                          >
                            <option value="">Selecione</option>
                            <option value="NEW">Cadastrar novo produto</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.sku} — {product.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={`Fator para unidade de estoque — item ${item.line}`}>
                          <input
                            type="number"
                            min="0.000001"
                            max="1000000"
                            step="0.000001"
                            className="erp-input w-full"
                            value={mapping.stockFactor}
                            onChange={(event) =>
                              update(item.line, { stockFactor: event.target.value })
                            }
                          />
                        </Field>
                        {mapping.productId === "NEW" && (
                          <>
                            <Field label={`SKU interno — item ${item.line}`}>
                              <input
                                required
                                maxLength={80}
                                className="erp-input w-full"
                                value={mapping.newSku}
                                onChange={(event) =>
                                  update(item.line, { newSku: event.target.value })
                                }
                              />
                            </Field>
                            <Field
                              label={`Preço de venda por unidade de estoque — item ${item.line}`}
                            >
                              <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                className="erp-input w-full"
                                value={mapping.salePrice}
                                onChange={(event) =>
                                  update(item.line, { salePrice: event.target.value })
                                }
                              />
                            </Field>
                            <Field label={`Unidade do novo produto — item ${item.line}`}>
                              <input
                                required
                                maxLength={6}
                                className="erp-input w-full"
                                value={mapping.stockUnit}
                                onChange={(event) =>
                                  update(item.line, { stockUnit: event.target.value })
                                }
                              />
                            </Field>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="max-w-sm">
                  <Field label="Vencimento da conta a pagar">
                    <input
                      className="erp-input w-full"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(event) => {
                        setDueDate(event.target.value);
                        save.reset();
                      }}
                    />
                  </Field>
                </div>
                <p className="text-sm text-muted-foreground">
                  Será criado um título pelo total da nota ({money(preview.totalAmount)}). Parcelas,
                  créditos tributários e impostos recuperáveis precisam de conciliação específica. O
                  custo unitário usa o valor dos produtos; frete/tributos não são rateados
                  automaticamente.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                  />
                  Conferi a autenticidade e a situação atual da nota na consulta oficial, os
                  produtos e suas unidades. O ERP não valida a assinatura digital nem consulta
                  cancelamentos na Sefaz nesta etapa.
                </label>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary"
                  disabled={
                    !checked ||
                    !dueDate ||
                    mappings.some(
                      (item) =>
                        !item.productId ||
                        !Number(item.stockFactor) ||
                        (item.productId === "NEW" &&
                          (!item.newSku.trim() ||
                            Number(item.salePrice) <= 0 ||
                            !item.stockUnit.trim())),
                    )
                  }
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Importando…" : "Preparar compra — sem movimentar estoque"}
                </button>
              </fieldset>
              {save.isError && (
                <p role="alert" className="text-destructive">
                  {save.error.message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
