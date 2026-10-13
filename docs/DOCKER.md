# Docker local completo

O projeto `distribev` agrupa PostgreSQL, backend Nest e frontend Vite no Docker Desktop. Um único Compose controla os três serviços. Ambiente local de desenvolvimento/demonstração; o frontend utiliza Vite dev, sem publicação de produção.

## Nesta máquina

```powershell
cd D:\dsf\desktop-beverage-manager
docker compose up -d --build --wait
```

Abra **http://127.0.0.1:5188**. Não execute npm/frontend/backend avulsos junto da stack. Não precisa definir `VITE_API_URL` no PowerShell. O frontend usa `/v1` na mesma origem e encaminha para `backend:3001`, preservando cookies e verificação de Origin.

Login de gravação: `demo@distribev.local`, mesma senha informada na entrega Android, disponível somente no arquivo local ignorado `backend/.env.recording`. O banco foi preservado, sem reset/novo seed. A configuração Docker fica no `.env` da raiz, ignorado no Git; contém segredos e identificação do volume.

## Comandos diários

```powershell
docker compose ps
docker compose logs --tail 100 backend frontend
docker compose stop
docker compose up -d --build --wait
```

Use o último comando após atualizar código: `restart` sozinho não reconstrói imagens. O backend aplica migrations versionadas antes de iniciar. `--wait` exige os healthchecks dos três serviços aprovados. No Docker Desktop, inicie/pare o **grupo distribev**, não apenas um filho individual.

`backend/docker-compose.yml` inclui a stack da raiz, evitando duas definições divergentes. Requer Compose 2.20+; prefira executar na raiz.

## Primeira instalação em outra máquina

```powershell
cd D:\dsf\desktop-beverage-manager
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/configure-docker.ps1
docker compose up -d --build --wait
```

O configurador gera segredos exclusivos e um volume persistente externo, sem sobrescrever `.env` existente. Docker Desktop deve estar iniciado. Banco novo começa vazio, sem usuário/senha padrão e sem dados fictícios. Crie o administrador interativamente, sem colocar senha no histórico:

```powershell
$adminCredential = Get-Credential -UserName 'admin@suaempresa.com' -Message 'Defina a senha do administrador (12+ caracteres)'
$env:ADMIN_EMAIL = $adminCredential.UserName
$env:ADMIN_PASSWORD = $adminCredential.GetNetworkCredential().Password
try {
    docker compose exec -e ADMIN_EMAIL -e ADMIN_PASSWORD backend node scripts/create-admin.cjs
} finally {
    Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
    $adminCredential = $null
}
```

Bootstrap não redefine senha nem substitui conta existente. Para adotar um banco existente, confirme volume/usuário/senha/base antes de preencher `.env`; não use instalação vazia como migração.

## Portas e dados

- Web: `127.0.0.1:5188`.
- API: `127.0.0.1:3001`, mantida para Android; o navegador usa `/v1` no próprio frontend.
- PostgreSQL: rede interna Docker, sem porta publicada no Windows.
- Volume externo indicado por `ERP_POSTGRES_VOLUME`: não é removido por `docker compose down -v`. Não o exclua manualmente se quiser manter os dados.
- Reorganização desta máquina: volume do antigo `erp-card-validation-20261012` reutilizado; backup em `.local-backups/erp-demo-before-compose-20261013.dump`, ignorado no Git. Nunca monte o mesmo volume em dois PostgreSQL ativos.

Android emulador continua com API `http://10.0.2.2:3001/v1/` e Origin `http://127.0.0.1:5188`. Via USB, `adb reverse tcp:3001 tcp:3001` e API `http://127.0.0.1:3001/v1/` no debug. Não houve mudança na autenticação/app.

## Produção

Stack HTTP local com `NODE_ENV=development`, vinculada ao loopback. Publicação ao cliente exige hospedagem de frontend, proxy HTTPS, cookies Secure, origens HTTPS, backups, segredos próprios e ambiente de produção. Não exponha Vite/PostgreSQL na internet.

Referências: [ordem e healthchecks Compose](https://docs.docker.com/compose/how-tos/startup-order/), [volume externo](https://docs.docker.com/reference/compose-file/volumes/) e [proxy Vite](https://vite.dev/config/server-options#server-proxy).

## Validação em 13/10/2026

- `docker compose config --quiet` e inclusão pelo arquivo antigo: aprovados.
- `docker compose up -d --build --wait`: imagens Linux construídas, três serviços saudáveis; repetição preservou dados.
- `docker compose exec -T backend npm test -- --runInBand`: 7 suítes e 32 testes aprovados. A primeira execução identificou fixtures ausentes na imagem; o contexto Docker foi corrigido e a execução completa passou.
- `npx tsc --noEmit`, `npx eslint vite.config.ts` e `npm run build`: aprovados. A formatação CRLF do arquivo Vite alterado foi corrigida para o lint focado; não houve normalização geral do projeto.
- Prisma: seis migrations aplicadas, schema atualizado. Antes/depois: 2 usuários, 12 pedidos e 8 produtos.
- Playwright real: login, sessão após reload e cookie HttpOnly aprovados. Requests web usam `/v1` na mesma origem; API sem login retorna 401 e mutação com Origin externa retorna 403. Sem erros JavaScript. [Captura real](evidencias/docker-stack-desktop.png).
- `.env`, configuração de gravação e backups não entram nas imagens ou no Git. O container PostgreSQL antigo foi removido após confirmar a stack; seu volume continua preservado e ativo na stack.

Não foi repetida a suíte de negócio e2e contra PostgreSQL descartável: não houve mudança nas regras de domínio. Não foram realizados testes de carga, pagamento real, emissão fiscal ou implantação pública. O teste Android completo anterior não foi repetido nesta reorganização; o endpoint publicado permanece o mesmo.
