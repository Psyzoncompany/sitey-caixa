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

    // Ponte token -> oid (somente leitura de documento específico)
    match /order_clients/{token} {
      allow get: if true;
      allow list: if false;
      allow create, update, delete: if request.auth != null;
    }

    // Pedido público por oid (somente leitura do doc)
    match /orders/{oid} {
      allow get: if true;
      allow list: if false;
      allow create, update, delete: if request.auth != null;

      // Feedback do cliente sem login, sem listar
      match /clientFeedback/{feedbackId} {
        allow create: if true;
        allow get, list, update, delete: if request.auth != null;
      }
    }

    // Registro seguro por token (sem listar)
    match /order_feedback/{token} {
      allow get: if false;
      allow list: if false;
      allow create, update: if true;
      allow delete: if request.auth != null;

      match /events/{eventId} {
        allow create: if true;
        allow get, list, update, delete: if request.auth != null;
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
