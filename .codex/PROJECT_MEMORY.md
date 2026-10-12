# Contexto do projeto

- ERP React 19/TanStack + NestJS 11/Prisma 6/PostgreSQL 16. Preservar identidade visual e módulos existentes.
- Escopo comercial atual: uma empresa por instância/banco. Company/Branch não isolam dados entre clientes.
- Operações de estoque, pedidos, recebimentos de compra e pagamentos usam transações Serializable com repetição limitada. Request IDs são UUID; IDs das entidades são CUID.
- Sessão de navegador em cookies HttpOnly. JWT revalida usuário ativo, papel e sessionVersion; refresh é rotativo. Não restaurar tokens no localStorage.
- PIX estático local paga a chave do lojista. Não confirma pagamento. Configuração no servidor; conferir banco antes da baixa manual.
- Validapay: contrato/fluxo de integração em docs/OPERACAO_E_PAGAMENTOS.md. Não há gateway/webhook ativado nem credenciais reais. Confirmar modelo de conta recebedora antes de implementar.
- Fiscal é pendência interna; não transmite NF-e/NFC-e nem autoriza documento. Integração e estornos/devoluções estão pendentes.
- Testes de negócio exigem TEST_DATABASE_URL em PostgreSQL descartável migrado. Nunca executar contra produção.
- Migration 0001 teve somente BOM removido para funcionar em banco limpo; conferir histórico/checksum em ambientes antigos. 0004 é aditiva e revoga refresh antigo; não faz backfill de contas históricas.
- Implantação, limites e evidências atuais: README.md, docs/OPERACAO_E_PAGAMENTOS.md e docs/VALIDACAO_E_PRONTIDAO.md. Documentação canônica e código atual prevalecem sobre esta memória.
- 12/10/2026: cadastro de várias maquininhas por instância e conector Point via Orders API/OAuth PKCE, tokens criptografados, webhook verificado, reservas/idempotência e reconciliação periódica. Migration 0005 aditiva. Catálogo de outras provedoras permite somente registro manual com comprovante; nenhum conector automático dessas marcas foi simulado em runtime. Configuração e contratos em docs/MAQUININHAS.md. Homologação com conta/terminal reais permanece pendente.
- Validação dessa entrega: 13 testes unitários e 23 de integração, builds/typechecks e lint focado aprovados; fluxo manual real no navegador e migration limpa/upgrade com histórico verificados. Lint global ainda falha em problemas legados, principalmente formatação/CRLF. Evidências e limitações em docs/MAQUININHAS.md.
