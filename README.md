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

### 使用するモデルの切り替え

ドロワーの`設定`から解析に使うモデルを選べる。選択はブラウザの localStorage
（キー: `settings.aiModel`）に保存されるため、端末・ブラウザごとの設定になる。

| 選択肢                | モデルID                | 用途                       |
| --------------------- | ----------------------- | -------------------------- |
| Gemini 3.6 Flash      | `gemini-3.6-flash`      | 読み取り精度を優先（既定） |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` | 速度とコストを優先         |

選択肢は画面側の `src/constants/ai-model.js` と Cloud Functions 側の
`RECEIPT_MODELS` の両方で持っている。呼び出し元が指定したモデル名をそのまま
Gemini に渡さないよう、サーバ側でも一覧に無いモデルは `invalid-argument` で弾くため、
モデルを追加・変更するときは両方を合わせること。

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

### 解析に失敗する場合

失敗時は登録ダイアログのアラートにエラーの詳細（`code` / `message` / `details`）が表示されるので、
まずそれを見る。`details.stage` が `gemini` ならモデル呼び出し、`parse` なら応答の解析で失敗している。

`404 NOT_FOUND` が出る場合はモデルが使えなくなっている可能性がある。
古いモデルは ListModels には残ったまま、`generateContent` すると
`This model ... is no longer available to new users` で 404 になることがある
（`gemini-2.5-flash` がこれに該当したため `index.js` の `RECEIPT_MODELS` から外した）。
実際に使えるモデルは以下で確認できる。

```bash
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" \
  | jq -r '.models[] | select(.supportedGenerationMethods[]? == "generateContent") | .name'
```

ただしこのリストに載っていても上記の理由で 404 になることがあるため、
差し替え後は実際に 1 回呼び出して確認すること。

## CI からの Cloud Functions デプロイ

`.github/workflows/deploy.yaml` が main への push と手動実行(`workflow_dispatch`)で
`firebase deploy --only functions` を実行する。認証は Workload Identity 連携を使い、
長期の認証情報は GitHub に置かない。

### GCP 側のセットアップ（初回のみ）

```bash
PROJECT_ID=fir-cloud-functions-trial
PROJECT_NUMBER=830437244276
REPO=yutak23/firebase-trial
SA=github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com

# Cloud Billing API（Firebase CLI が functions デプロイ時に課金状態を確認するため必要）
# cloudfunctions / cloudbuild / artifactregistry / secretmanager は CLI が自動で
# 有効化するが、これだけは事前に有効化しておく必要がある
gcloud services enable cloudbilling.googleapis.com --project=$PROJECT_ID

# デプロイ用サービスアカウント
gcloud iam service-accounts create github-actions-deployer \
  --project=$PROJECT_ID --display-name="GitHub Actions Deployer"

# ロール付与
for ROLE in \
  roles/firebase.admin \
  roles/cloudfunctions.admin \
  roles/iam.serviceAccountUser \
  roles/artifactregistry.writer \
  roles/cloudbuild.builds.editor \
  roles/serviceusage.serviceUsageConsumer \
  roles/secretmanager.admin
do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA}" --role="$ROLE"
done

# Workload Identity プール / プロバイダ（attribute-condition は必須）
gcloud iam workload-identity-pools create github \
  --project=$PROJECT_ID --location=global --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc firebase-trial \
  --project=$PROJECT_ID --location=global \
  --workload-identity-pool=github --display-name="firebase-trial" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'yutak23'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# このリポジトリからのみ SA を借用できるようにバインド
gcloud iam service-accounts add-iam-policy-binding $SA \
  --project=$PROJECT_ID --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}"
```

`iam.serviceAccountUser` はランタイムSAとして関数を動かすため、`secretmanager.admin` は
デプロイ時に `GEMINI_API_KEY` のバージョン解決とバインドを行うために必要。

### プールやプロバイダが既に存在する場合

`ALREADY_EXISTS` が返る場合、`create` は既存の設定を上書きしないため、中身が
意図したものになっているかを確認する。特に `attributeMapping` に
`attribute.repository` が無いと、上記のバインドと一致せず認証に失敗する。

```bash
gcloud iam workload-identity-pools providers describe firebase-trial \
  --project=$PROJECT_ID --location=global --workload-identity-pool=github \
  --format="yaml(attributeMapping, attributeCondition, state, disabled, oidc)"

# デプロイSAに実際に付いているロールの一覧
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:${SA}" \
  --format="value(bindings.role)"
```

設定が異なっていれば `update-oidc` で合わせる。

```bash
gcloud iam workload-identity-pools providers update-oidc firebase-trial \
  --project=$PROJECT_ID --location=global --workload-identity-pool=github \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'yutak23'"
```

`state` が `DELETED` の場合は削除済みの名前が30日間予約されている状態。
`undelete` するか、別名で作り直してバインドと GitHub Variables を貼り替える。

### GitHub 側のセットアップ

`Settings` →`Secrets and variables` →`Actions` →`Variables`タブに登録する
（秘密情報ではないので Secrets ではなく Variables）。

| 名前                             | 値                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/830437244276/locations/global/workloadIdentityPools/github/providers/firebase-trial` |
| `GCP_DEPLOY_SERVICE_ACCOUNT`     | `github-actions-deployer@fir-cloud-functions-trial.iam.gserviceaccount.com`                    |

### デプロイ対象について

CI では `--only functions` のみを対象にしている。BigQuery 拡張機能5個は CI で触ると
パラメータ入力待ちや意図しない再構成のリスクがあるため除外している。
Hosting は Cloudflare Pages なので元々対象外。

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
