# Site de venda com pagamento Pix

Site de produto digital com cobrança Pix criada pela SyncPay. Após a confirmação, a página mostra o link configurado para o produto. O valor é fixado no servidor em R$ 9,90.

## Publicação na Vercel

1. Importe esta pasta como projeto na Vercel.
2. Configure `SYNCPAY_CLIENT_ID` e `SYNCPAY_CLIENT_SECRET` nas variáveis de ambiente. Não coloque credenciais no código ou no navegador.
3. Configure `PRODUCT_ACCESS_URL` com o link de entrega do produto.
4. Configure `KV_REST_API_URL` e `KV_REST_API_TOKEN` para persistir pedidos entre execuções serverless. Sem KV, a confirmação pode não funcionar de forma confiável em produção.
5. Instale as dependências com `npm install` e publique.

O nome e o e-mail fornecidos no checkout são enviados à SyncPay para criar a cobrança. A entrega depende da confirmação do pagamento pela SyncPay.

## Estrutura

- `index.html`, `styles.css`, `app.js`: página e checkout no navegador.
- `api/`: criação do Pix, consulta de status e webhook.
- `lib/`: cliente SyncPay, catálogo de produto e armazenamento de pedidos.
