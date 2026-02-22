# Firestore Rules (modo sem login no admin e no cliente)

Cole as regras abaixo no **Firebase Console → Firestore Database → Rules**.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =========================
    // ADMIN (painel sem login Firebase)
    // =========================
    // Como não há auth no painel, precisa permitir escrita.
    match /orders/{oid} {
      allow read, write: if true;
    }

    match /orders_public/{oid} {
      allow read, write: if true;
    }

    match /order_clients/{token} {
      allow read, write: if true;
    }

    // =========================
    // CLIENTE (link com token)
    // =========================
    match /order_feedback/{token} {
      allow read: if true;

      match /items/{itemId} {
        allow create, read: if true;
        allow update, delete: if false;
        allow list: if false;
      }
    }
  }
}
```

## Observações
- Este conjunto resolve imediatamente os erros `Missing or insufficient permissions` ao criar/atualizar `order_clients` e `orders_public` no painel.
- Como está sem autenticação, as coleções de admin ficam abertas para leitura/escrita.
- Próximo passo recomendado (hardening): migrar escrita de admin para usuário autenticado ou Cloud Functions.
