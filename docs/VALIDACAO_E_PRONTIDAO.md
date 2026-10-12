# Validação e prontidão — 11/10/2026

Atualizações de 12/10/2026: conector e limites de cartão em [Maquininhas](MAQUININHAS.md); configuração de empresa/Pix e importação operacional XML em [Empresa, Pix e entrada fiscal](EMPRESA_PIX_E_ENTRADA_FISCAL.md), com 32 testes unitários e 32 de integração aprovados. As evidências de 11/10 abaixo são históricas e não substituem os limites dessas entregas. Emissão/captura fiscal homologadas continuam pendentes.

## Resultado

A base operacional foi corrigida e exercitada com PostgreSQL real descartável. Isso permite avançar para homologação de um piloto da distribuidora. Não é uma declaração de ERP completo, segurança absoluta ou homologação fiscal/bancária.

## Correções principais

- IDs CUID aceitos nos vínculos; UUID reservado aos identificadores idempotentes.
- Venda, baixa de estoque e título financeiro em transação; estoque insuficiente e desconto excessivo rejeitados. Venda em dinheiro exige caixa do operador e grava pagamento/movimento conjuntamente.
- Recebimento concorrente de compra não duplica entrada nem conta a pagar. Pagamento parcial preserva saldo e repetição com a mesma chave não duplica baixa.
- Cancelamento não pago repõe estoque uma vez, cancela títulos, comissões e pendências fiscais internas; pagamento existente ou documento fiscal em processamento/autorizado bloqueia cancelamento até existir fluxo de devolução/estorno.
- Sessões em cookies HttpOnly, rotação de refresh, revogação no logout/desativação/alteração do usuário, perfil revalidado, bloqueio de origem não autorizada e remoção da exposição de hash em pedidos.
- Sem login preenchido ou senha de administrador padrão; bootstrap explícito e seed de demonstração opcional e bloqueado em produção.
- PIX por pedido gera PNG/copia e cola localmente para a chave configurada do lojista. Saldo e recebedor são exibidos; geração não grava pagamento.
- Busca/atalhos do PDV, fluxo de entregas, baixa financeira manual, visibilidade por perfil e feedback global de erros/carregamento.
- Retiradas as alíquotas fixas do fiscal e os relatórios que anunciavam apuração/SPED/DRE sem implementação. Relatórios disponíveis mostram vendas válidas, alertas de estoque e títulos/saldos; impressão/PDF usa o diálogo do navegador.
- Versões compatíveis de dependências atualizadas, sem `audit fix --force`. Configuração de banco local restringe bind a 127.0.0.1 e exige senha explícita.

## Evidências

Verificações executadas no ambiente local, sem banco ou credenciais de cliente:

- `npm run build` em backend e frontend; `npx tsc --noEmit` no frontend.
- `npm test -- --runInBand`: 7 testes aprovados, cobrindo de sanitizer, validação CUID e PIX/CRC oficial.
- `npm run test:e2e -- --runInBand`, com `TEST_DATABASE_URL`: 14 testes aprovados, incluindo cenários reais de cadastro, recebimento simultâneo, vendas concorrentes, PIX sem baixa, pagamento parcial/idempotente/excessivo, desconto, cancelamento, caixa, permissões, entregas, fiscal e sessão.
- Migration limpa aplicada em PostgreSQL 16. API iniciou por `npm run start:prod` e frontend foi operado no navegador autenticado.
- Venda PIX no navegador gravou pedido e exibiu QR/copia e cola. Screenshot de dados exclusivamente de teste em [evidência](evidencias/pdv-pix-teste.jpg). Nenhum PIX bancário real foi pago ou homologado.
- Backup custom com `pg_dump`, restauração com `pg_restore --exit-on-error --no-owner` em **outro banco vazio**, comparação de usuários/pedidos/pagamentos/movimentos e somas de pagamentos/pedidos: valores iguais. Isso testa o procedimento local, não backup automático de produção.
- Bootstrap criou administrador no banco descartável sem credenciais padrão.
- ESLint geral continua com passivo de formatação/código em arquivos antigos. Verificação focada nos arquivos TypeScript alterados sem erros; avisos de Fast Refresh permanecem. Não foi feita normalização de todo o repositório.

`npm audit --omit=dev` ainda aponta dependências transitivas: frontend esbuild (baixa); backend cadeia Prisma/config/deepmerge-ts (alta) e Swagger/js-yaml (moderada). A sugestão automática inclui downgrade incompatível; não foi aplicada. Avaliar alcance e correção compatível antes de exposição pública. O audit completo também inclui ferramentas de desenvolvimento.

## Antes de colocar um cliente pagante

1. Homologar as rotinas reais do lojista e cadastrar produtos/clientes reais em banco exclusivo, sem seed demonstrativo. Validar unidades, volumes, preços, crédito e necessidades de lote/validade.
2. Definir provedor fiscal e operação com contador/cliente; implementar e homologar emissão quando necessária. Os registros atuais não substituem documento fiscal.
3. Completar devolução/estorno de vendas pagas, troco, pagamento misto e parcelamento conforme a necessidade do piloto. As restrições atuais são explícitas.
4. Configurar chave PIX real e conferir titularidade no aplicativo bancário. Para baixa automática, integrar API do banco/PSP ou Validapay após confirmar o modelo de recebimento e obter sandbox/credenciais.
5. Resolver/mitigar dependências residuais, validar HTTPS/proxy/cookies/hospedagem SSR no destino e configurar usuário de banco com privilégio mínimo.
6. Implantar backup automático externo criptografado, alertas, restauração periódica, monitoramento e processo de suporte. Definir retenção e continuidade operacional.
7. Homologar os perfis em todos os fluxos do cliente, teclado/leitor/impressora e tamanhos de tela usados na loja. A inspeção visual realizada foi em desktop; dispositivos móveis e hardware comercial ainda não foram homologados.

## Evolução posterior

Multiempresa com isolamento real; multiestoque; conversão unidade/caixa; seleção/baixa FEFO por lote e validade; crédito/prazos; conciliação bancária automatizada; importação/exportação completa; paginação e testes de carga; agenda e chamados sincronizados; cobrança recorrente da assinatura; integração fiscal e tributação por operação. Esses itens não estão concluídos nesta entrega.
