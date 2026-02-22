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
  - URL: `/arteonline.html?oid=<OID>&token=<TOKEN>`
  - valida `order_clients/{token}` -> `oid`
  - lê `orders_public/{oid}`
  - envia feedback para `order_feedback/{token}/items/*`.

### 4) Permissões do Firestore no modo sem login
- Se o painel admin estiver sem autenticação Firebase, ele **precisa** de permissão de escrita em:
  - `orders/{oid}`
  - `orders_public/{oid}`
  - `order_clients/{token}`
- Use temporariamente as regras abertas do arquivo `FIRESTORE_RULES.md` para remover os erros de permissão no fluxo atual.
- Depois que estabilizar, faça hardening com Auth ou Cloud Functions.
