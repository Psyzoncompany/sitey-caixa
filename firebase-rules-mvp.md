# Regras Firebase (MVP) — Hotfix 1.5.1

> Objetivo: destravar Controle de Artes / Processos / Aprovação / Arte-Online.
> **Atenção:** regras permissivas para MVP. Fazer hardening depois.

## Firestore rules (sugestão)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin autenticado (Processos + Controle)
    match /users/{uid} {
      allow read, write: if request.auth != null;
    }

    // Portal + controle de artes (MVP)
    match /artRequests/{id4} {
      allow read, write: if true;

      match /versions/{versionId} {
        allow read, write: if true;
      }

      match /events/{eventId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Storage rules (sugestão)

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Uploads do portal de arte (MVP)
    match /artRequests/{id4}/versions/{versionId}/{fileName} {
      allow read: if true;
      allow write: if request.resource != null
                   && request.resource.size < 8 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## TODO de hardening (pós-hotfix)

- Trocar `allow ... if true` por validação com token do documento (`id4 + secret`) para portal público.
- Restringir escrita em `/artRequests/{id4}` para campos específicos no portal.
- Criar claim `admin=true` e restringir `/users/*` e `/artRequests/*` administrativos a admin.
