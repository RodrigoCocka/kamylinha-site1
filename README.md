# Mini site de contribuição via Pix

Site estático com uma API serverless para criar uma cobrança Pix na SyncPay. O valor é fixado no servidor em R$ 9,90. O navegador recebe apenas o QR Code e o Pix copia e cola.

## Publicação na Vercel

1. Importe esta pasta como projeto na Vercel.
2. Configure `SYNCPAY_CLIENT_ID` e `SYNCPAY_CLIENT_SECRET` nas variáveis de ambiente do projeto. Use credenciais novas; credenciais anteriormente compartilhadas devem ser revogadas.
3. Configure `KV_REST_API_URL` e `KV_REST_API_TOKEN` para persistir pedidos entre execuções serverless. Sem KV, a confirmação de pagamento pode não funcionar em produção.
4. Instale as dependências com `npm install` e publique.

O pagamento apoia iniciativas de privacidade e segurança digital, mas não garante que conteúdos não sejam copiados ou divulgados. Nome e e-mail são enviados à SyncPay para criar a cobrança.

## Estrutura

- `index.html`, `styles.css`, `app.js`: página e checkout no navegador.
- `api/`: criação do Pix, consulta de status e webhook.
- `lib/`: cliente SyncPay, catálogo de produto e armazenamento de pedidos.

## Testar o redirecionamento sem cobrança

1. Instale o Node.js, se ainda não estiver instalado.
2. Abra o PowerShell nesta pasta e execute `node test-server.mjs`.
3. No navegador, abra `http://127.0.0.1:4173/?teste_fluxo=1`.
4. Preencha os campos e clique em **Simular Pix aprovado**. O navegador abre `/site2-teste/`.
5. A segunda página é apenas uma tela de teste, com a cobrança desativada. O servidor local não chama a SyncPay e não envia os dados digitados.
6. Para parar o servidor, volte ao PowerShell e pressione `Ctrl+C`.

Esse modo só é ativado em `localhost` ou `127.0.0.1`; ele não simula pagamentos no site publicado.
