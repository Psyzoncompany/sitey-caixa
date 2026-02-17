# Firestore Rules (cliente sem login)

Cole as regras abaixo no **Firebase Console → Firestore Database → Rules**.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Bloqueia tudo por padrão
    match /{document=**} {
      allow read, write: if false;
    }

    // Ponte token -> oid (cliente lê apenas o próprio token)
    match /order_clients/{token} {
      allow get: if true;
      allow list: if false;
      allow create, update, delete: if request.auth != null;
    }

    // Dados públicos do pedido (sem listar)
    match /orders_public/{oid} {
      allow get: if true;
      allow list: if false;
      allow create, update, delete: if request.auth != null;
    }

    // Feedback do cliente via token
    match /order_feedback/{token} {
      allow get: if true;
      allow list: if false;
      allow create, update: if true;
      allow delete: if request.auth != null;

      match /items/{itemId} {
        allow create: if true;
        allow get: if true;
        allow list: if false;
        allow update, delete: if false;
      }
    }

    // Dados internos do app
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Observação
- O fluxo público usa token em URL e **não exige login** para cliente.
- O token precisa existir em `order_clients/{token}` (gerado no admin ao abrir/copiar link de arte).
- O cliente nunca lê `orders/{oid}` privado: lê apenas `orders_public/{oid}`.
