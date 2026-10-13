# Demonstração para gravação e Android

App Kotlin/Compose em `D:\dsf\distribev-android`, com referência visual no EasyCut Android. O app usa as APIs existentes; não foi criada autenticação paralela nem alterada segurança do backend para acomodá-lo. Repositório privado: [GuilhermeGms3/distribev-android](https://github.com/GuilhermeGms3/distribev-android).

## Docker e processos

`backend/docker-compose.yml` contém somente PostgreSQL (5432). Backend Nest e frontend Vite são processos npm, não containers. O ambiente de QA/gravação desta máquina usa outro container, `erp-card-validation-20261012`, PostgreSQL local em **55439**. O banco **erp_demo_gravacao** é separado das bases de testes e de qualquer cliente.

Arquivo local ignorado `backend/.env.recording`: DATABASE_URL do banco demo, NODE_ENV=development, ALLOW_DEMO_SEED=true, administrador/senha exclusivos, JWTs exclusivos, PORT=3001 e CORS_ORIGIN incluindo `http://127.0.0.1:5188`. O arquivo foi preparado nesta máquina e não será enviado ao GitHub.

Para preparar outra instalação, copie a estrutura de `.env.example` para `.env.recording`, configure um banco **local erp_demo_*** e credenciais exclusivas. O seed recusa produção, banco fora desse nome, host externo e senha ausente/curta. Nunca aponte esses scripts para uma base de cliente.

Terminal 1:

```powershell
cd D:\dsf\desktop-beverage-manager
docker start erp-card-validation-20261012
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/start-recording-demo.ps1
```

O launcher lê a configuração local, aplica migrations e inicia o backend. Se o build ainda não existe, compila. Após alterações no código backend, execute `npm run build` em backend antes de reiniciar; o launcher não promete detectar builds antigos.

Terminal 2, somente se precisar preencher/repetir os dados iniciais:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/start-recording-demo.ps1 -Seed
```

Espere a API iniciar antes do seed. O seed usa as APIs reais para compras/vendas/pagamentos/entregas, depois do bootstrap local de administrador. É repetível pelos códigos/marcadores dos dados iniciais; não apaga gravações feitas durante QA. A senha no arquivo deve corresponder ao administrador já criado. Trocar o texto do arquivo não altera automaticamente a senha existente.

Terminal 3:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:3001/v1'
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
```

Web: **http://127.0.0.1:5188**. Login: `demo@distribev.local`, senha exclusiva no `.env.recording` local. O usuário foi criado somente para demonstração. Evite alternar localhost/127.0.0.1, por causa dos cookies.

## Android Studio

O launcher de gravação força `HOST=127.0.0.1`, para não publicar a API demo na rede. O bootstrap do backend aceita `HOST` opcional; sem a variável, mantém o comportamento anterior. Em uma implantação com container de backend próprio, configure o bind explicitamente conforme a rede/proxy desejados.

Abra `D:\dsf\distribev-android`, sincronize o Gradle e execute `app` no emulador. O debug aponta para `http://10.0.2.2:3001/v1/` com Origin `http://127.0.0.1:5188`. Esse endereço acessa o host do emulador; não serve para um aparelho físico sem ajustes.

Via USB físico, `adb reverse tcp:3001 tcp:3001` permite usar API `http://127.0.0.1:3001/v1/` no debug, sem expor porta na rede. Produção usa HTTPS real e configuração correspondente. Gravar pelo Record Screen do emulador/Running Devices. Detalhes no README do app.

## Dados e limites do vídeo

Base inicial: oito produtos, quatro clientes, sete pedidos, compra recebida, encomenda e entregas atribuídas. Cadastros e comprovantes são fictícios, identificados como demonstração. Operações do app são persistidas de verdade nesse banco demo, por isso novos pedidos/cadastros aumentam as contagens.

O QR Pix demonstra o fluxo visual, com chave de exemplo **sem recebimento bancário real**; não efetuar pagamento. Registros manuais de QA não são comprovação bancária. O vídeo não deve anunciar emissão fiscal, maquininha física homologada ou disponibilidade de produção que não foram testadas.
