# Sitey Caixa — Hotfix 1.5.1

## OAuth em domínio preview (Vercel)
Em previews `*.vercel.app`, o login por popup/redirect do Firebase Auth pode falhar se o domínio não estiver autorizado.

Adicione este domínio em **Firebase Console → Authentication → Settings → Authorized domains**:

- `sitey-caixa-git-codex-implementa-99a3db-psyzoncompanys-projects.vercel.app`

> Neste projeto, o fluxo principal usa login por e-mail/senha (`signInWithEmailAndPassword`) para evitar bloqueio em preview.

## Firebase rules (MVP / hotfix)
Aplicar as regras do arquivo `firebase-rules-mvp.md` no Firebase Console para liberar o fluxo de Artes no MVP.
