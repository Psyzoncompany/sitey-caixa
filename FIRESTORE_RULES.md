# Firestore Rules (modo sem backend próprio, com módulo Arte Online)

Cole as regras abaixo no **Firebase Console → Firestore Database → Rules**.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =========================
    // ADMIN (painel interno)
    // =========================
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
    // ARTE ONLINE (cliente + admin)
    // =========================
    match /pedidos_arte/{pedidoId} {
      allow read, write: if true;
    }

    match /users/{uid}/pedidos_arte/{pedidoId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // =========================
    // CLIENTE (feedback legado)
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
- Inclui a coleção `pedidos_arte` para suportar geração de links, pedidos, envio de versões e revisões em tempo real.
- Como a arquitetura atual é 100% client-side, as coleções ficam abertas para leitura/escrita.
- Recomenda-se hardening posterior com Firebase Auth obrigatório por perfil e regras condicionais por claim.
