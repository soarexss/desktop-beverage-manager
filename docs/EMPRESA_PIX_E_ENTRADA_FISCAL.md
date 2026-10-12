# Empresa, Pix e entrada de NF-e

Atualizado em 12/10/2026. Primeiro cenário comercial: DF; cadastro preparado para as demais UFs. Uma empresa operacional por instância/banco continua sendo o limite do produto.

## O que esta entrega permite

- Tela **Empresa e Pix**: razão social, fantasia, CNPJ, inscrição estadual/CFDF, inscrição municipal, CNAE principal/secundários, endereço, CEP, município IBGE e UF.
- Regimes separados: MEI (CRT 4), Simples Nacional (CRT 1), excesso de sublimite (CRT 2), Lucro Presumido, Lucro Real e outro regime normal (CRT 3). A seleção registra enquadramento; não é um motor tributário nem habilita emissão fiscal.
- Validação local dos dígitos de CNPJ numérico e alfanumérico, conforme Receita Federal. Não consulta situação cadastral, CNAEs permitidos ou opção efetiva pelo Simples/SIMEI.
- Configuração administrativa do Pix direto: chave, nome, cidade e habilitação. QR estático usa o saldo do pedido e a chave configurada, sem Validapay. Não verifica titularidade nem confirma recebimento automaticamente.
- Em **Compras**, leitura do XML processado de NF-e modelo 55, revisão de itens e unidades, vínculo a produtos existentes ou cadastro explícito de novos produtos com SKU, unidade e preço de venda. Sugestão por código de barras não substitui conferência.
- XML original armazenado com SHA-256 e download autenticado/auditado. O hash detecta diferenças entre reenvios; não comprova autenticidade fiscal.
- Importação prepara compra em rascunho. **Confirmar recebimento** gera movimentos de entrada e uma conta a pagar, na transação existente. Importar ou receber não registra pagamento.
- Chave única na importação e proteção contra duplicidade, inclusive com entrada manual concorrente. Reenvio da mesma chave/conteúdo retorna a compra existente; conteúdo diferente exige conciliação.

## Fluxo de entrada

1. Administrador configura o CNPJ real da empresa em Empresa e Pix.
2. Comprador obtém o XML com o fornecedor ou no serviço autorizado da Receita. PDF/DANFE e número curto não substituem o XML.
3. Importa o arquivo; ERP confere estrutura, modelo, ambiente informado, chave numérica/DV, emitente, destinatário, número/série, itens e total de produtos.
4. Comprador confere autenticidade e situação atual na consulta oficial, escolhe os produtos, confirma conversão e vencimento. Exemplo: 2 CX × fator 12 = 24 unidades no estoque.
5. ERP prepara o rascunho e preserva o total `vNF` do documento, inclusive valores que não correspondam apenas a produtos/frete/desconto.
6. Após conferência física, operador confirma recebimento. O estoque recebe 24 unidades e o financeiro registra **conta a pagar**, ainda pendente. Compra para revenda não deve virar automaticamente despesa paga: pagamento, estoque e apuração contábil são fatos separados.

O CFOP de saída do fornecedor fica no XML e na revisão; não é copiado como CFOP de venda da loja. NCM e unidade são cadastrados para produtos novos. Regras de saída, CST/CSOSN, CEST, origem, ICMS/ST, PIS/COFINS e IBS/CBS exigem parametrização e validação fiscal próprias.

## Limites explícitos

- Importação operacional, **sem validação criptográfica da assinatura, validação completa XSD ou consulta online de autorização/cancelamento**. O XML pode informar protocolo de autorização e ainda exigir conferência externa. Não usar essa etapa como escrituração fiscal homologada.
- Aceita `nfeProc` 4.00, modelo 55, produção informada, venda normal, status de protocolo informado 100/150; até 100 itens, 512 KiB, profundidade 64 e 20 mil elementos. Rejeita DTD/entidades declaradas, homologação, NFC-e 65, PDF, devolução, complemento e notas fora desses limites.
- O cadastro aceita CNPJ alfanumérico; **a chave desta primeira importação é numérica**. XML com chave alfanumérica não é importado. A ampliação depende de implementação/testes do leiaute aplicável; não anunciar compatibilidade fiscal universal.
- Quantidade em estoque tem até três casas decimais; fator até seis. Custo unitário é valor dos produtos dividido pela quantidade convertida, arredondado a centavos. Não há rateio de frete, seguro, impostos ou crédito tributário no custo. O XML integral é preservado para conciliação.
- Um vencimento/título pelo valor integral. Parcelas de `cobr/dup`, pagamentos já feitos ao fornecedor, adiantamentos, despesas acessórias e créditos tributários não são lançados automaticamente.
- Um lote por item, quando informado; quantidade do lote deve corresponder à comercial. Produto que exige rastreio sem lote/validade no XML é rejeitado. Múltiplos lotes exigem fluxo específico. FEFO e baixa de venda por lote continuam pendentes.
- Não há alteração de compra importada, recebimento parcial, devolução/cancelamento fiscal, captura automática de XML por chave/NSU nem emissão de NF-e/NFC-e nesta entrega.
- CNPJ operacional não pode ser trocado depois de importar documentos. O cadastro Company/Branch continua sem isolamento multiempresa; cada cliente deve ter sua instância/banco.

## Pix e Validapay

A configuração na interface prevalece sobre `PIX_KEY`, `PIX_MERCHANT_NAME` e `PIX_MERCHANT_CITY`. Essas variáveis continuam como compatibilidade **somente enquanto não houver empresa operacional configurada**. Ao criar a configuração, habilite e informe o Pix nessa tela se quiser continuar usando QR; desativar na tela bloqueia a geração, sem retornar silenciosamente à chave antiga.

O recebedor efetivo é aquele vinculado à chave no banco. Conferir nome/cidade no ERP não verifica titularidade no DICT. Uma API só confirma pagamentos aos quais possui acesso autorizado: a Validapay não confirma qualquer chave de qualquer banco. Condições de conta/subconta, liquidação e repasse precisam ser confirmadas no contrato da provedora. Veja [operação e pagamentos](OPERACAO_E_PAGAMENTOS.md).

## Próxima integração fiscal — DF

O cenário lembrado pelo usuário geralmente envolve **NF-e de entrada (55)**. NFC-e (65) é outro modelo, comum no varejo ao consumidor. Recuperar todos os itens exige o XML completo; uma consulta pública de situação e o número curto não fornecem, por si, acesso irrestrito a esse conteúdo.

Para captura automática: implementar Distribuição DF-e conforme NT 2014.002 vigente, com certificado/identidade autorizada do destinatário, persistência do NSU/cursor, limites de consumo, controle de concorrência, disponibilidade de XML/resumo e manifestação quando cabível. Ciência de uma operação não deve ser confundida com confirmação de recebimento físico. O ERP não deve confirmar operações fiscais silenciosamente. No DF também existe download autenticado no Agenci@net.

Para emissão: credenciamento por estabelecimento/modelo, certificado da empresa no caminho direto documentado pelo DF, configuração de CSC para NFC-e conforme regras aplicáveis, séries/numeração, ambiente, regras tributárias e schemas atuais. Implementar assinatura, transmissão, consulta após timeout, protocolo, DANFE, guarda, eventos/cancelamento, contingência e homologação. Não gerar PDF com aparência de nota e apresentá-lo como documento autorizado.

Há duas alternativas técnicas ainda não selecionadas: conector próprio Sefaz ou API fiscal contratada. O primeiro exige manter protocolos/schemas/eventos; o segundo também exige onboarding, credenciais, custos, regras e testes. Não foi escolhido provedor nem criada integração fictícia. Certificados/senhas/CSC devem ser configurados em armazenamento seguro do servidor, nunca enviados pelo chat ou expostos no frontend.

MEI tem CNPJ, mas aceitar MEI no cadastro não significa que toda atividade de distribuição/atacado seja permitida nesse enquadramento. Conferir a atividade real e as ocupações permitidas com o contador. Também não é correto inferir toda tributação apenas pelo CNAE.

## Contratos

Prefixo `/v1`; sessão e controles de origem existentes. Swagger continua disponível no ambiente de desenvolvimento. Sem sessão: 401; papel sem acesso: 403; campos/nota inválidos: 400; chave/conteúdo/concorrência incompatíveis: 409; Pix desativado/incompleto: 503; XML ausente: 404. JSON tem limite global de 768 KiB; XML tem limite adicional de 512 KiB.

| Endpoint | Acesso | Contrato |
| --- | --- | --- |
| GET `/company-profile` | admin/fiscal | Perfil ou `null`, CRT derivado e `fiscalEmissionEnabled:false`; não expõe `settings` genérico |
| PUT `/company-profile` | admin | Dados completos: nomes, documento, inscrições opcionais, regime, CNAEs, endereço/UF/IBGE/CEP, `pixEnabled` e dados Pix opcionais; retorna perfil salvo |
| POST `/fiscal-imports/preview` | admin/compras | `xmlContent`; retorna dados da nota, itens/candidatos, compra anterior e `authenticity:NOT_VERIFIED` |
| POST `/fiscal-imports` | admin/compras | `xmlContent`, UUID v4 `requestId`, `authenticityChecked:true` literal, `dueDate` ISO, `items` com `line`, `stockFactor` e produto existente `productId` **ou** `newSku/salePrice/stockUnit`; retorna `purchaseOrderId, alreadyImported` |
| GET `/fiscal-imports/:purchaseOrderId/xml` | admin/compras/fiscal | XML original e chave; acesso auditado |
| GET `/operations/purchases` | perfis existentes | Acrescenta `fiscalImport:{id}` quando disponível, sem retornar XML inteiro |
| PATCH `/operations/purchases/:id/receive` | perfis existentes | Mantém idempotência; usa vencimento importado para gerar conta a pagar |
| GET `/orders/:id/pix` | perfis/propriedade existentes | Mantém contrato; agora usa a configuração administrativa da empresa |

Em criação de produto, preço de venda é explícito e positivo; SKU existente exige seleção do produto. Produtos inativos, mappings incompletos/repetidos, precisão incompatível e lote exigido ausente abortam a transação inteira, sem cadastro/entrada parcial. Reenvio de chave idêntica não altera mapeamento nem vencimento já importados: revisar a compra existente.

## Migration e implantação

`0006_company_fiscal_imports` é aditiva. Acrescenta campos à Company e vencimento opcional à compra, cria arquivo fiscal com FKs restritivas e chaves únicas, índice de consulta por chave e constraints de tamanho/formato. Não seleciona empresa fictícia nem altera pagamentos/compras históricos. Fazer backup e aplicar `npm run prisma:deploy` antes de publicar o backend correspondente; depois conferir Empresa e Pix. A dependência adicionada `fast-xml-parser@5.11.2` foi necessária porque não havia parser XML no backend; está fixada no lockfile.

Rollback operacional exige parar entradas e retornar versões coerentes frontend/backend, preservando banco e XMLs. O backend antigo não entende a configuração administrativa Pix e o vencimento importado; não operá-lo em paralelo durante entradas/recebimentos. Não apagar documentos para desfazer deploy. Em recuperação, restaurar backup em base separada e conciliar fatos posteriores.

## Validação local

- 32 testes unitários e 32 de integração com PostgreSQL descartável. Cobrem CNPJ numérico/alfanumérico, regimes, Pix configurado/desativado, permissão, outro destinatário, protocolo inválido, DTD, tamanho/profundidade, total, confirmação literal, reenvio/concorrência, cadastro, download, conversão e conta a pagar. Incluem regressões do conector Point e operações existentes.
- Seis migrations aplicadas em banco limpo; upgrade de 0005 com empresa e pagamento históricos preservou CNPJ e valor 10,00, sem ativar perfil/Pix fictícios.
- Fluxo Chromium/Playwright com backend real: login → configurar empresa/Pix → upload de XML sintético de teste → cadastrar produto/conversão 12 → preparar rascunho → baixar XML → receber. Resultado: 24 unidades e compra de 28,00. Sem erro JavaScript/framework overlay. O único 401 observado foi restauração de sessão ausente antes do login.
- Desktop 1440×1100 e formulário de empresa em 390×844, sem overflow horizontal do documento. O shell global continua apertado no mobile; não foi redesenhado. Browser plugin específico indisponível, utilizado Playwright já instalado.
- Evidências: [empresa/Pix](evidencias/empresa-pix-desktop.jpg), [largura estreita](evidencias/empresa-pix-mobile.jpg), [revisão do XML](evidencias/importacao-xml-revisao.jpg), [recebimento](evidencias/importacao-xml-recebida.jpg). Dados/nota dessas imagens são exclusivos de QA, sem validade fiscal.
- `npm run build` e `npx tsc --noEmit` aprovados em frontend/backend. ESLint focado nos novos módulos, telas e alterações funcionais de compras/Pix aprovado. `npm test -- --runInBand` e `npm run test:e2e -- --runInBand` executados com os resultados acima; `git diff --check` aprovado.
- `npm run lint` global permanece reprovado: 5695 erros/8 avisos na raiz (inclui arquivos backend) e 353 erros no backend, principalmente convenções de formatação/CRLF em arquivos legados. Não houve normalização geral. `npm audit --json` não apontou advisory para `fast-xml-parser`/builder adicionado; o passivo das outras dependências permanece e está descrito em VALIDACAO_E_PRONTIDAO.md.
- Não foram executados emissão/captura Sefaz reais, validação criptográfica/XSD, uso de certificado real nem escrituração com contador.

## Fontes oficiais consultadas

- [Receita Federal — CNPJ alfanumérico e documentação técnica](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico), [cálculo do DV](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf).
- [Portal do Empreendedor — ocupações permitidas](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/servicos-para-mei).
- [Receita DF — credenciamento NF-e](https://www.receita.fazenda.df.gov.br/aplicacoes/CartaServicos/servico.cfm?codServico=766&codSubCategoria=216&codTipoPessoa=7), [NFC-e](https://www.receita.fazenda.df.gov.br/aplicacoes/CartaServicos/servico.cfm?codServico=773&codSubCategoria=218&codTipoPessoa=7), [CSC](https://mobile.receita.fazenda.df.gov.br/aplicacoes/CartaServicos/servico.cfm?codServico=791&codSubCategoria=218&codTipoPessoa=7), [download de XML](https://www.receita.fazenda.df.gov.br/aplicacoes/CartaServicos/servico.cfm?codServico=774&codSubCategoria=216&codTipoPessoa=7).
- [Portal NF-e — notas técnicas vigentes](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=04BIflQt1aY%3D): verificar NT 2014.002 v1.40 (distribuição), NT 2026.004 (CNPJ) e NT 2025.002-RTC/atualizações IBS/CBS. Não congelar regras fiscais pela versão deste documento.
- [Aviso oficial de 05/10/2026](https://www.nfe.fazenda.gov.br/POrtal/informe.aspx?AspxAutoDetectCookieSupport=1&Informe=GyPA%2FcEjrMk%3D&ehCTG=false): mudança de datas de homologação/produção de NTs; conferir cronograma vigente ao implementar emissão.
- [Banco Central — padrões de iniciação Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).
