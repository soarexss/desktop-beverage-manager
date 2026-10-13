# Gravação do ERP web e Android

App Kotlin/Compose em `D:\dsf\distribev-android`, inspirado no EasyCut. Repositório privado: [GuilhermeGms3/distribev-android](https://github.com/GuilhermeGms3/distribev-android).

## Iniciar tudo junto

```powershell
cd D:\dsf\desktop-beverage-manager
docker compose up -d --build --wait
```

Abra **http://127.0.0.1:5188**. Banco, backend e frontend estão no mesmo grupo **distribev** do Docker Desktop. Não execute servidores npm avulsos junto da stack. Configuração, volumes e diagnóstico: [DOCKER.md](DOCKER.md).

Login demo: `demo@distribev.local`, mesma senha informada na entrega Android. Credenciais estão no arquivo local ignorado `backend/.env.recording`; configuração da stack no `.env` da raiz. Não enviar esses arquivos ao GitHub. O banco `erp_demo_gravacao` e os dados gravados foram preservados.

## Android Studio

Abra `D:\dsf\distribev-android`, sincronize e execute `app` no emulador. A API debug continua `http://10.0.2.2:3001/v1/`, com Origin `http://127.0.0.1:5188`. A porta 3001 agora vem do Compose. Não precisa iniciar backend manual.

Em USB físico, `adb reverse tcp:3001 tcp:3001` permite API `http://127.0.0.1:3001/v1/` no debug. Produção exige HTTPS. Gravar pelo Record Screen do emulador/Running Devices.

## Roteiro e limites

Mostre resumo, estoque, cliente, venda Pix, QR, títulos, entregas e compras. Mobile e web usam a mesma API/base; operações persistem de verdade no banco demo. Dados são fictícios e identificados como demonstração. Há entrega atribuída e compra rascunho para mostrar, enquanto não forem concluídas.

Não efetue pagamento do QR demo: a chave é fictícia. Baixa manual não comprova conciliação bancária. O vídeo não deve anunciar emissão fiscal, terminal físico homologado ou prontidão de produção sem essas verificações.

Os helpers antigos `start-recording-demo.ps1` e `seed-recording-demo.cjs` permanecem para execução manual deliberada, com suas restrições de banco local. Não são necessários para iniciar o Docker nem devem rodar em paralelo nas mesmas portas. O seed não é executado automaticamente.
