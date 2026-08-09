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
  `firebase-cloud-functions/.secret.local` に `GEMINI_API_KEY=<取得したキー>` を記載（gitignore 済み）。
  `runWith({ secrets: [...] })` で宣言したシークレットは `.env.local` からは読み込まれず、
  エミュレータは `.secret.local` を参照する

- 本番  
  `npx firebase functions:secrets:set GEMINI_API_KEY` でシークレットを登録してから
  `yarn deploy:exclude:hosting` でデプロイ

キーはリポジトリが public のためソースコードに直書きしないこと。
`src/`配下に置くと Vite がバンドルに埋め込み、全訪問者に配布されるので特に不可。

### CLI を使わずコンソールから設定する場合

Firebase コンソールにシークレットの管理画面はないが、実体は Google Cloud Secret Manager なので
GCP コンソールから設定できる。コード側の変更は不要
（`runWith({ secrets: ['GEMINI_API_KEY'] })` がそのまま参照する）。

1. [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=fir-cloud-functions-trial)
   を開く（初回は Secret Manager API の有効化が必要）
2. `シークレットを作成`をクリックし、名前に `GEMINI_API_KEY`（コード内の参照名と完全一致させる）、
   値に取得した API キーを入力して作成
3. 作成したシークレットの`権限`タブ →`アクセスを許可`で、Cloud Functions の
   ランタイムサービスアカウント `fir-cloud-functions-trial@appspot.gserviceaccount.com` に
   `Secret Manager のシークレット アクセサー`(`roles/secretmanager.secretAccessor`)を付与する。
   `ロール別に表示`に切り替えて`シークレット アクセサー`の下に当該サービスアカウントが
   入っていれば設定完了
4. `yarn deploy:exclude:hosting` でデプロイし、Cloud Functions のログに
   `scanReceipt` の起動エラー（シークレット参照失敗）が出ていないことを確認

App Engine のデフォルトサービスアカウントはプロジェクトレベルで`編集者`を継承しているため、
権限タブに`編集者`として表示されることがあるが、**これではシークレットの値を読めない**。
[公式ドキュメント](https://docs.cloud.google.com/secret-manager/docs/access-control)のとおり
`secretmanager.versions.access` はオーナーには含まれるが編集者・閲覧者には含まれないため、
手順3の`シークレット アクセサー`の付与は必須。

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
