# Operação, pagamentos e preparação comercial

## QR Code direto para o lojista

Configure no backend `PIX_KEY`, `PIX_MERCHANT_NAME` e `PIX_MERCHANT_CITY`. O nome deve corresponder ao recebedor e a chave deve estar cadastrada no banco dele. O aplicativo bancário consulta o recebedor real associado à chave; o ERP não verifica titularidade no DICT.

`GET /v1/orders/:id/pix` exige sessão, autorização sobre o pedido e saldo em aberto. Retorna `copyPaste`, `qrCode` (PNG data URL), `amount`, `txid`, `merchantName`, `confirmation: MANUAL` e mensagem de conferência. Usa o saldo restante e ID do pedido como txid. Gerar/copiar/exibir código não registra pagamento. QR estático não expira automaticamente e pode ser reutilizado: sempre conferir valor, identificação e recebimento no banco. Um código antigo pode ter valor diferente depois de pagamento parcial.

Referência: [Manual do Banco Central, BR Code e QR estático](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf). O CRC usa o exemplo oficial como teste de regressão. Não há chamada externa para gerar a imagem e nenhuma chave é enviada a gerador de QR de terceiros.

## Validapay: encaminhamento da integração

A documentação pública de [cobrança com split](https://docs.validapay.com.br/referencia/post-cobranca-imediata-com-split) descreve `POST /v1/charges/pix`, OAuth2 com escopo `charges/write`, valor e `externalTxid`, retornando `chargeId`, `emv` e `qrCode`. O split documentado é entre contas Validapay. A [referência de saques](https://docs.validapay.com.br/referencia/saques/overview) descreve transferência de saldo para conta bancária: não equivale a depósito direto na conta externa no ato do pagamento.

Não foi ativado um gateway nem criado webhook público sem credenciais/validação. Para automatizar mantendo o destinatário correto:

1. Confirmar com a Validapay se o lojista deve abrir conta/subconta, como ocorre liquidação e se há recebimento direto no banco externo desejado. Não foi encontrado contrato público que comprove essa última possibilidade para qualquer banco.
2. Se for conta/subconta, usar credenciais/identificação daquele recebedor, sem misturar vendas de lojas na conta do fornecedor do ERP. Confirmar taxas, onboarding, limites e política de saque.
3. Persistir cobrança externa vinculada ao pedido, valor, moeda, conta recebedora, identificador externo, estado e chave idempotente. Um timeout de criação exige consulta/reconciliação antes de criar novamente.
4. Implementar OAuth no servidor; segredos em gerenciador de segredos, nunca no frontend. Escolher sandbox/produção por configuração e host permitido, sem URL arbitrária do cliente.
5. Verificar assinatura HMAC conforme [documentação de webhooks](https://docs.validapay.com.br/webhooks), preservar corpo bruto, validar timestamp, impedir replay e deduplicar evento. Conferir também cobrança, valor, moeda e recebedor antes de registrar pagamento atomicamente.
6. Homologar pagamentos, atraso/repetição de eventos, indisponibilidade, estorno e recuperação após falhas no sandbox. Só depois habilitar produção.

Se a exigência for permanecer no banco atual, usar o QR estático já disponível com conferência manual, ou a API Pix do banco/PSP que mantém a conta. Uma API de terceiro não consegue atestar o recebimento em qualquer banco apenas por conhecer a chave.

A mensalidade do software é uma cobrança separada: a Validapay pode cobrar a assinatura em favor do fornecedor do ERP. Não descontar a mensalidade das vendas do lojista sem contrato/consentimento específico.

## Contratos alterados

- Login/refresh entregam cookies HttpOnly, sem tokens no JSON. `GET /auth/me` restaura o usuário. `POST /auth/refresh` lê cookie, rotaciona e invalida o anterior. `POST /auth/logout` invalida sessões e limpa cookies. Acesso antigo é rejeitado após desativação/troca de perfil. Mutações do navegador exigem Origin permitido; usar proxy de mesma origem em produção.
- `POST /orders` exige `requestId` UUID e `paymentMethod` (`DINHEIRO`, `PIX`, `CARTAO`, `PRAZO`). IDs de entidades são CUID. Valores são recalculados no servidor com Decimal.
- `POST /operations/purchases` e `/operations/payments` exigem `requestId` UUID. Preserve a mesma chave ao repetir uma operação após falha de rede. Nunca reutilize uma chave para outra operação. Recebimento de compra é idempotente pelo ID da compra.
- Pagamentos exigem título financeiro e valor positivo, limitado ao saldo. São confirmações de operador, não confirmação automática de gateway. Dinheiro atualiza o caixa do operador; outros meios não alteram saldo bancário automaticamente.
- Ajuste de estoque é uma diferença assinada, não saldo absoluto. Entrada/saída exigem quantidade positiva; nenhum movimento pode deixar saldo negativo.
- Sangria/suprimento/ajuste são movimentos manuais. Recebimentos/pagamentos usam baixa de título; transferência entre contas requer fluxo próprio.
- Exclusão de usuário é desativação com histórico preservado; o último administrador ativo é protegido. Senhas novas exigem 12 caracteres e no máximo 72 bytes UTF-8.
- Status fiscal não pode ser marcado como autorizado/processado manualmente nesta versão.

## Migration 0004

Adiciona versão de sessão, identificadores idempotentes e vínculo único compra/título. Revoga refresh tokens antigos; usuários precisam entrar novamente. Constraints NOT VALID impedem novos valores inválidos sem reescrever histórico: auditar registros antigos antes de executar VALIDATE CONSTRAINT. Não faz backfill de contas a pagar para compras históricas; reconciliar com o cliente antes de criá-las, para evitar duplicação.

Foi removido somente o BOM da migration 0001, que falhava em banco limpo. Se já houver ambiente com essa migration aplicada, compare o checksum/histórico antes de implantar e siga o procedimento Prisma para reconciliação; não executar reset ou editar `_prisma_migrations` em produção. A migration 0004 é aditiva; rollback operacional deve restaurar backup em banco separado e retornar a versão correspondente da aplicação, pois sessões e novos registros não podem ser descartados indiscriminadamente.

## Implantação e backup

Uma instância e banco por cliente. HTTPS, origens explícitas, JWTs fortes e diferentes, usuário de runtime com privilégio mínimo, banco em rede privada, migrações com credencial administrativa separada. O Compose é desenvolvimento local, não infraestrutura de produção.

Backups: usar `pg_dump --format=custom --file=...` com credenciais fornecidas por ambiente/secret store; criptografar e enviar para armazenamento restrito fora da máquina. Restaurar periodicamente com `pg_restore --exit-on-error --no-owner --dbname=...` **em banco separado vazio**, comparar contagens e totais, validar login/consulta e registrar evidência. Definir retenção, RPO, RTO, alerta de falha e responsável de suporte antes de vender continuidade operacional.

## Pendências de produto

- Provedor NF-e/NFC-e e parametrização fiscal homologada com o contador/cliente.
- Estorno/devolução de pedidos pagos e fluxo de devolução fiscal. O cancelamento é bloqueado para evitar perda de rastreabilidade.
- API de pagamentos/TEF, webhook e conciliação; banco não é atualizado automaticamente por baixa manual de PIX/cartão.
- Multiempresa e multiestoque reais, conversão unidade/caixa, seleção/baixa por lote e validade, troco, múltiplos meios e parcelamento.
- Paginação/filtros no servidor, importação e exportação operacional, sincronização de agenda/feedback.
- Hospedagem SSR, backup automatizado criptografado, monitoramento e atendimento com compromissos definidos.
- Revisão das dependências residuais apontadas pelo npm audit; não usar atualização forçada com downgrade/migração de framework.

O ERP não deve ser anunciado como universal para qualquer CNPJ nem como emissor fiscal completo enquanto essas integrações não estiverem homologadas.
