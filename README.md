# Sitey Caixa

## Correções de produção importantes

### 1) Domínio OAuth autorizado (erro `domain not authorized`)
Se usar login Google popup/redirect:

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. Adicione:
   - domínio de produção (ex: `seudominio.com`)
   - domínio preview da Vercel (ex: `*.vercel.app`)
   - se necessário, o domínio específico do projeto na Vercel.

### 2) Manifest público (erro 401)
- O projeto usa `<link rel="manifest" href="/manifest.webmanifest">`.
- Garanta que `manifest.webmanifest` e ícones (`/icons/*`) estejam públicos sem autenticação.

### 3) Firestore sem login para cliente
- Regras recomendadas estão em `FIRESTORE_RULES.md`.
- Fluxo público do cliente:
  - URL: `/arteonline.html?token=<TOKEN>`
  - resolve `order_clients/{token}` -> `oid`
  - lê `orders/{oid}`
  - envia feedback para `orders/{oid}/clientFeedback/*` e `order_feedback/{token}/events/*`.
