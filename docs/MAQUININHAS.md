# Maquininhas — operação e ativação

## O que está implementado

Uma empresa por instância/banco continua sendo a regra. A tela **Maquininhas** mantém vários aparelhos, modelos, nomes de caixa e situação ativo/inativo. Cadastros e conexão são exclusivos do administrador; operadores consultam aparelhos. Administrador e financeiro consultam a fila de cobranças que exigem acompanhamento.

| Provedora | Modelos sugeridos | Operação neste ERP |
| --- | --- | --- |
| Mercado Pago | Point Smart 1, Smart 2, Pro 2, Pro 3 | Conector Point via Orders API, sujeito à configuração e homologação física; também permite cadastro manual |
| PagBank | Moderninha Smart, Smart 2, Pro 2, Plus 2, Minizinha Chip 3 | Registro manual com referência do comprovante |
| Stone | Stone Smart | Registro manual |
| Ton | T2, T3, T3 Smart | Registro manual |
| Cielo | LIO On, Flash | Registro manual |
| SumUp | Solo, Smart | Registro manual |
| Rede / outra | Modelo informado pelo lojista | Registro manual |

Os modelos são sugestões de cadastro, não um ranking de vendas nem promessa de integração universal. O campo aceita outro nome para operação manual. Não foram adicionados conectores automáticos falsos para as demais marcas. Um futuro conector deve implementar autenticação, identificação de terminais, criação idempotente, consulta, cancelamento e validação de notificações específicos da provedora; ampliar o catálogo sozinho não habilita a integração.

Fontes: [Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/mp-point/overview), [PagBank](https://faq.pagbank.com.br/duvida/manual-da-maquininha-pagbank/1090), [Stone](https://www.stone.com.br/maquina-de-cartao), [Ton](https://blog.ton.com.br/maquininha-ton-conheca-todos-os-modelos/), [Cielo](https://blog.cielo.com.br/produtos-e-servicos/maquineta-de-cartao/), [SumUp](https://www.sumup.com/pt-br/maquininhas/).

## Ativar Mercado Pago Point

O conector não vem com uma conta recebedora nem credenciais de produção. O fornecedor do ERP cadastra uma aplicação Mercado Pago; cada lojista autoriza a própria conta. Não compartilhar a senha do lojista com o ERP. A cobrança usa o token OAuth dessa conta, sem split/comissão da plataforma; a liquidação e as taxas continuam sujeitas ao contrato do lojista com o Mercado Pago. A mensalidade do ERP é independente.

1. Publique frontend e backend em HTTPS, preferencialmente no mesmo domínio, com `/v1` encaminhado à API. Configure `CORS_ORIGIN` com a origem exata do frontend.
2. No painel da aplicação Mercado Pago, habilite OAuth Authorization Code com PKCE S256. Cadastre a URL exata `https://SEU-DOMINIO/v1/card-payments/mercado-pago/callback`.
3. No servidor/secret store, configure `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI` (callback), `MP_RETURN_URL=https://SEU-DOMINIO/maquininhas` e `MP_WEBHOOK_SECRET`. A origem de retorno precisa constar em `CORS_ORIGIN`; URLs de redirecionamento não são aceitas da requisição.
4. Gere uma chave exclusiva de criptografia, por exemplo com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Armazene em `CARD_CREDENTIALS_KEY`, fora do código. Faça backup protegido da chave junto à estratégia de recuperação do banco. Perder/trocar essa chave sem recriptografar os dados impede a leitura das autorizações existentes.
5. Mantenha `MP_TEST_MODE=true` para testes. Use as contas/credenciais e o terminal conforme o procedimento de teste da provedora. **Somente após homologar**, configure `MP_TEST_MODE=false` e autorize novamente a conta real. Não troque conta ou ambiente de uma instância com cobranças históricas: preserve o recebedor e use instância de teste separada.
6. Cadastre no painel Mercado Pago o webhook HTTPS `https://SEU-DOMINIO/v1/card-payments/mercado-pago/webhook` para o evento **Order (Mercado Pago)**. Copie o segredo gerado para `MP_WEBHOOK_SECRET`; ele é diferente do segredo OAuth.
7. Entre no ERP como administrador → **Maquininhas → Conectar Mercado Pago**. O navegador abre a autorização oficial e retorna ao ERP. O estado de autorização dura dez minutos, é de uso único e está vinculado a cookie HttpOnly/Secure/SameSite=Lax daquele navegador.
8. Configure loja/caixa e associe o terminal à conta recebedora no aplicativo Mercado Pago. Ative o modo **PDV** seguindo a documentação. O ERP não muda silenciosamente o modo de um aparelho que pode estar sendo usado por outro sistema.
9. No cadastro, escolha um dos modelos Point suportados, modo **Integrado**, clique em **Buscar terminais da conta** e selecione o aparelho pelo número de série. Apenas aparelhos da conta consultada e em modo PDV são aceitos.
10. No PDV, grave a venda em cartão, selecione o aparelho e use **Enviar valor à maquininha**. O ERP envia o saldo pendente calculado no servidor. A geração da cobrança mantém o título pendente; a baixa ocorre após consultar confirmação válida no Mercado Pago.

Fontes de contrato: [OAuth/PKCE](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation), [configuração do terminal](https://www.mercadopago.com.br/developers/pt/docs/mp-point/configure-terminal), [criação, consulta e cancelamento](https://www.mercadopago.com.br/developers/pt/docs/mp-point/payment-processing), [assinatura/notificações](https://www.mercadopago.com.br/developers/pt/docs/mp-point/notifications).

## Operação e falhas

- Cada cobrança reserva o pedido e o aparelho antes da chamada externa, com UUID idempotente persistido. Falha de rede não significa cobrança recusada. Consultar uma criação sem resposta repete a mesma solicitação/chave, sem inventar outra cobrança.
- Cobranças conhecidas são atualizadas por webhook, consulta do operador e reconciliação em segundo plano a cada minuto, em lotes de até 20. O processo do backend deve permanecer ativo; não há garantia de execução desse trabalho num ambiente que encerra o processo entre requisições. Em múltiplas réplicas a mesma chave e as constraints evitam baixa duplicada, mas consultas podem se repetir.
- O webhook valida HMAC-SHA256, ID da URL, request ID e timestamp com tolerância de cinco minutos. Dados de aprovação no corpo não bastam: o ERP consulta a order com as credenciais da conta vinculada. Relógio do servidor precisa estar sincronizado. Um evento antigo rejeitado pode ser recuperado pela consulta/reconciliação; repetições válidas não duplicam o pagamento.
- Valor, referência do pedido, terminal quando informado e recebedor quando informado precisam corresponder. A baixa exige uma única transação `processed/accredited` e valor pago igual ao saldo reservado. Segredos OAuth são criptografados com AES-256-GCM no banco, omitidos das respostas e protegidos nos logs.
- Outra cobrança, baixa manual e cancelamento do pedido ficam bloqueados enquanto a cobrança estiver criando, pendente ou em revisão. Depois da confirmação de cancelamento/falha/expiração, o operador pode preparar outra tentativa explicitamente. Cancelar a cobrança não cancela automaticamente o pedido.
- Um cancelamento solicitado em `at_terminal` pode retornar HTTP 202 e ainda terminar em pagamento aprovado. O ERP mantém a reserva até consultar o desfecho. Esse cancelamento via API depende também do modelo/firmware: a documentação o disponibiliza para Smart 1/2 atualizados. Se o aparelho rejeitar, cancele nele e consulte o status; não interprete erro da API como cancelamento efetivado.
- Criações sem ID externo há mais de 20 horas ficam bloqueadas para nova emissão automática, pois a chave idempotente do provedor tem retenção limitada. Exigem suporte e conferência no provedor. O ERP não possui uma ação para liberar esse estado sem evidência nem uma reconciliação assistida por importação de extrato nesta versão.
- Divergência, reembolso ou contestação detectados ficam em **Revisão** e aparecem na fila de acompanhamento. Pagamentos históricos são preservados. Estorno financeiro/fiscal e devolução continuam exigindo tratamento específico; não há botão que apaga uma venda paga ou estorna dinheiro real silenciosamente.
- A conta pode ser desconectada se não houver cobranças em andamento/revisão; isso apaga suas credenciais locais e desativa os terminais integrados. Revogação da autorização no provedor também pode ser feita na conta Mercado Pago. Reconectar não reativa automaticamente os aparelhos.

## Operação manual nas outras marcas

Cadastre a provedora/modelo no modo **Manual**. Selecione o pedido gravado no PDV e o aparelho. O ERP mostra o saldo; o operador digita esse valor na maquininha e, após conferir a aprovação, informa NSU/referência do comprovante e confirma a conferência. O servidor exige o mesmo valor de saldo e registra uma única baixa vinculada ao aparelho, preservando a chave ao repetir uma requisição.

Essa confirmação é responsabilidade do operador: não é uma notificação bancária automática. PIX estático e assinatura via Validapay continuam separados; webhook Validapay não atesta uma venda Point.

## Contratos novos

Todos os caminhos abaixo usam prefixo `/v1/card-payments`. As respostas seguem o envelope `success/data` existente. Mutações do navegador exigem a origem autorizada. IDs locais são CUID; `requestId` é UUID v4. Parâmetros inválidos retornam 400; sessão ausente 401; perfil/pedido não autorizado 403; duplicidade/conflito de estado 409; indisponibilidade externa/configuração incompleta 503.

| Método / caminho | Perfil | Entrada / resultado |
| --- | --- | --- |
| GET `/catalog` | admin/caixa/vendedor/financeiro | Provedoras, modelos sugeridos e capacidade do conector |
| GET `/terminals` | operadores | Aparelhos sem credenciais |
| POST `/terminals` | admin | `provider, model, label, mode`, `externalId` somente integrado |
| PATCH `/terminals/:id` | admin | `isActive`; preserva histórico |
| GET `/connection` | admin | Configurada/conectada, ID da conta e ambiente; sem tokens |
| POST `/connection/disconnect` | admin | Desconecta localmente após checar pendências |
| POST `/mercado-pago/authorize` | admin | URL oficial de autorização e cookie OAuth |
| GET `/mercado-pago/callback` | público com estado+cookie válidos | OAuth; redireciona 303 à URL fixa do ERP |
| GET `/mercado-pago/terminals` | admin | Terminais consultados na conta autorizada, até 1000 |
| GET `/balance?orderId=...` | operadores; vendedor somente próprio pedido | Saldo pendente e status do pedido |
| GET `/charges?orderId=...` | operadores; vendedor somente próprio pedido | Até 50 cobranças recentes daquele pedido |
| GET `/charges/pending` | admin/financeiro | Até 100 pendências, mais antigas primeiro |
| POST `/charges` | operadores; vendedor somente próprio pedido | `requestId, orderId, terminalId`; valor calculado no servidor |
| POST `/charges/:id/sync` | operadores autorizados ao pedido | Consulta/reconcilia; mantém idempotência e histórico |
| POST `/charges/:id/cancel` | operadores autorizados ao pedido | Solicita cancelamento; consulta desfecho |
| POST `/manual` | operadores; vendedor somente próprio pedido | `requestId, orderId, terminalId, amount, nsu, confirmed:true` |
| POST `/mercado-pago/webhook?data.id=...` | público com assinatura válida | `x-signature, x-request-id`; consulta o provedor, confirmação 200 |

`POST /operations/payments` também aceita `terminalId` opcional para cartão manual; exige aparelho manual ativo e referência de comprovante. Títulos com cobrança integrada pendente não aceitam baixa manual.

## Migration e implantação

`0005_card_payments` é aditiva: cria conexões OAuth, tentativas de autorização, aparelhos e cobranças; acrescenta vínculo opcional de aparelho aos pagamentos existentes. Nenhum pagamento histórico recebe um aparelho fictício. Constraints preservam referências, valor positivo, modos válidos e reserva única por pedido/aparelho.

Faça backup, aplique `npm run prisma:deploy`, gere o cliente e publique backend/frontend correspondentes. Não execute reset em produção. Depois de começar a emitir cobranças, o backend antigo não deve operar concorrendo com o novo: ele desconhece as reservas e pode permitir baixa manual indevida. Rollback exige parar operações, conciliar pendências e preservar o banco; não remover tabelas com cobranças ou credenciais. O teste local de migration/QA não habilita a integração em produção.

## Evidência local — 12/10/2026

- PostgreSQL 16 descartável: cinco migrations aplicadas em banco limpo; testes de integração usam persistência real e transporte Mercado Pago substituído somente nos testes.
- Upgrade 0004 → 0005 em outra base descartável com pedido/título/pagamento pré-existentes: valor histórico preservado e novo vínculo de terminal nulo, sem backfill fictício.
- Testes unitários incluem AES-GCM, assinatura expirada/falsa e contrato HTTP do provedor; testes de integração incluem OAuth/PKCE, autorização, terminais inválidos, idempotência, webhook repetido/concorrente, perda de resposta, divergência e registro manual.
- Resultado: 13 testes unitários e 23 de integração aprovados. Builds e TypeScript de frontend/backend aprovados; lint focado nos arquivos novos e nas alterações funcionais aprovado. O lint global permanece reprovado por problemas legados, principalmente formatação/CRLF; não houve normalização de arquivos alheios à integração.
- Navegador Playwright Chromium em `http://127.0.0.1:5188`, desktop 1440×1000 e largura 390×844. Browser plugin específico indisponível; utilizado Playwright do runtime já instalado, sem adicionar dependência ao projeto.
- Fluxo real: login → cadastro PagBank → desativar/reativar → selecionar pedido no PDV → conferir referência → registrar manualmente → saldo zero e exatamente um pagamento no banco. Sem overlay/framework error ou erro JavaScript. O 401 de `/auth/refresh` antes do login é o comportamento de sessão ausente existente.
- Tela nova sem transbordamento horizontal do documento em 390px. O cabeçalho/sidebar antigos ainda ocupam muito espaço e recortam controles em tela estreita; a operação comercial principal permanece desktop. Não foi refeito o shell global.
- Evidências: [desktop](evidencias/maquininhas-desktop.jpg), [largura estreita](evidencias/maquininhas-mobile.jpg), [baixa manual no PDV](evidencias/maquininhas-pdv-manual.jpg).
- **Não executado:** OAuth real, transação de cartão real, testes físicos Smart/Pro, validação do firmware/cancelamento e homologação da provedora. Faltam aplicação/credenciais e terminal reais. Não anunciar essas verificações como concluídas.
