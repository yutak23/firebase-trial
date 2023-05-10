## firebase-trial

以下を検証。

- firebase emulators を使った開発

  - auth
  - functions
  - firestore

- firebase deploy でインフラ構築

## システム構成

- Hosting  
  Cloudflare Pages

- Access Management  
  Cloudflare Access(Cloudflare Zero Trust)

## 本番リリース時の対応

- Cloudflare Pages のドメインを Firebase Authentication の`承認済みのドメイン`に追加
- App Check でのエラー解消のために、Cloudflare Pages のドメインを reCAPTCHA の`ドメイン`に追加
- Firebase Cloud Functions の`...has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.`エラー解消のために、Google Clould Functions の`アクセス権限`に`allUser`を追加
  - App Check あり前提の対応
