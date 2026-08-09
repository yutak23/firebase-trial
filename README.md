## firebase-trial

以下を検証。

- firebase emulators を使った開発
  - auth
  - functions
  - firestore

- firebase deploy でインフラ構築

## レシート撮影による自動入力

家計簿の登録ダイアログでレシートを撮影すると、日付・金額・カテゴリ・店名（メモ）を自動補完する。
画像は解析に使うだけで保存しない。

解析は Cloud Functions の `scanReceipt`（callable, App Check 必須）から Gemini API を呼んで行うため、
API キーの設定が必要。

- [Google AI Studio](https://aistudio.google.com/apikey) で API キーを取得

- ローカル（エミュレータ）  
  `firebase-cloud-functions/.env.local` に `GEMINI_API_KEY=<取得したキー>` を記載（gitignore 済み）

- 本番  
  `npx firebase functions:secrets:set GEMINI_API_KEY` でシークレットを登録してから
  `yarn deploy:exclude:hosting` でデプロイ

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
