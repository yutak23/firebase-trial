# AWS ブログにおけるセキュリティ成熟度モデル関連記事 調査レポート

調査日: 2026-08-13
調査対象: <https://aws.amazon.com/blogs/>（英語・全チャネル） および <https://aws.amazon.com/jp/blogs/news/>（日本語）

---

## 0. 調査方法と制約（先に必ずお読みください）

### 制約: aws.amazon.com への直接アクセス不可

調査を実施した実行環境では、`aws.amazon.com` がネットワーク egress ポリシーによって**ドメイン単位でブロック**されていました。

| 手段 | 結果 |
| --- | --- |
| `curl https://aws.amazon.com/...` | `curl: (56) CONNECT tunnel failed, response 403` |
| `WebFetch` | `{"error_type":"EGRESS_BLOCKED","domain":"aws.amazon.com"}` |

プロキシの運用規約上、ブロックされたホストへの迂回は行っていません。このため、**当初想定していた「一覧ページを `page/2/`, `page/3/` … と辿って全記事を確認する」方式は実行できていません。**

### 実際に採った方法

Web 検索を大量のクエリで回す方式に切り替え、4 つのサブエージェントに領域を分担させました。

| 担当 | 範囲 | 実行クエリ数 |
| --- | --- | --- |
| エージェント① | 英語 AWS Security Blog（`/blogs/security/`） | 24 |
| エージェント② | 英語のその他全チャネル（`/blogs/security/` 以外） | 34 |
| エージェント③ | 日本語ブログ（`/jp/blogs/` 配下） | 32 |
| エージェント④ | CMMC 等の名前付き成熟度フレームワーク（英日横断） | 38 |
| 統括（本体） | 中核キーワードの裏取り | 10 |
| **合計** | | **138** |

### 本レポートの確度

- **URL とタイトル**: 複数クエリで再現的に出現したものは確度が高い。
- **公開日・要約**: 記事本文を取得できていないため、**すべて検索スニペットからの再構成**です。「推定」と記したものは特に確度が低いです。
- **網羅性**: 検索インデックスに依存するため、**「全件」は保証できません。** ただし `"levels of maturity"` のような完全一致クエリで 1 件しか返らないなど、母集団が実際に小さいことを示す傍証は複数得られています。
- 記事の分類（HIGH / MEDIUM / LOW）も本文未読のため、特に LOW 層は誤分類の可能性があります。

---

## 1. 結論サマリ

1. **「セキュリティ成熟度モデルそのもの」を主題にした AWS ブログ記事は、英語版に 2 本しか存在しません。**
   - [OT/IT convergence security maturity model](https://aws.amazon.com/blogs/security/ot-it-convergence-security-maturity-model/)（2024-01-18）
   - [Operationalizing AWS security: A maturity roadmap](https://aws.amazon.com/blogs/security/operationalizing-aws-security-a-maturity-roadmap/)（2026-06-08）

2. **AWS 公式の「セキュリティ成熟度モデル」本体はブログ記事ではありません。** 実体は次の 2 つです。ブログ記事群はここから 4 フェーズ（quick wins / foundational / efficient / optimized）の語彙を借りています。
   - 専用サイト [AWS Security Maturity Model](https://maturitymodel.security.aws.dev/)（日本語版・自己評価ツールあり）
   - AWS 規範ガイダンス [Crawl, walk, run: Accelerating security maturity in the AWS Cloud](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-accelerating-security-maturity/introduction.html)（re:Inforce 2022 の同名セッション由来）

3. **`/blogs/security/` 以外で成熟度コンテンツが集中するのは Public Sector Blog です。** ただしその動機は AWS 独自モデルではなく、**外部の規制・要求**（CMMC、OMB M-21-31 / M-26-14、ACSC Essential Eight、CISA ゼロトラスト成熟度モデル、CIS Controls IG）への対応です。

4. **日本語ブログには、セキュリティ成熟度モデルを単独主題とした記事が事実上ありません。** 上記の英語版 2 本はいずれも日本語訳が公開されていないと見られます。一方 **2026 年以降、日本語ブログのセミナー／ワークショップ開催報告で「AWS セキュリティ成熟度モデル」を次の一歩として案内する定型パターンが確立**しています。

5. **AWS ブログに一切登場しない隣接フレームワーク**: C2M2（DOE サイバーセキュリティ能力成熟度モデル）、OWASP SAMM、BSIMM、IANS/CSA Cloud Security Maturity Model。

---

## 2. 英語ブログ（<https://aws.amazon.com/blogs/>）

### 2-1. HIGH — 成熟度モデルが記事の主題

#### AWS 独自のセキュリティ成熟度モデル

| タイトル | チャネル | 公開日 | 内容 |
| --- | --- | --- | --- |
| [OT/IT convergence security maturity model](https://aws.amazon.com/blogs/security/ot-it-convergence-security-maturity-model/) | security | 2024-01-18 | **本調査で最も中心的な記事。** 4 段階（quick wins → foundational → efficient → optimized）の成熟度モデルを OT/IT 融合に適用。12 の診断設問（ISA/IEC 62443 リスクアセスメントの実施時期、接続資産インベントリの有無など）への回答で自組織の現在地を判定する。AWS Security Maturity Model 本体への参照あり。 |
| [Operationalizing AWS security: A maturity roadmap](https://aws.amazon.com/blogs/security/operationalizing-aws-security-a-maturity-roadmap/) | security | 2026-06-08 | Security Hub と GuardDuty を有効化済みの組織が「サービスが有効」から「サービスがセキュリティ運用を駆動する」状態へ進むための **Phase 0〜5 の 6 段階ロードマップ**。ベースライン／チューニング、通知パイプライン（CRITICAL・HIGH は数分でルーティング、MEDIUM は追跡可能な作業項目、LOW はバッチ）、自動修復、運用サイクルを扱う。Phase 0-1 で約 3〜5 週、Phase 2-3 でさらに 5〜7 週。 |

#### 外部フレームワーク準拠の成熟度モデル

| タイトル | チャネル | 公開日 | フレームワーク／内容 |
| --- | --- | --- | --- |
| [Updated Essential Eight guidance for Australian customers](https://aws.amazon.com/blogs/security/updated-essential-eight-guidance-for-australian-customers/) | security | 2023-10-23 | ACSC Essential Eight 成熟度モデル（ML0〜ML3）。規範ガイダンス「Reaching Essential Eight Maturity on AWS」の公開告知。 |
| [Introducing the AWS Zero Trust Accelerator for Government](https://aws.amazon.com/blogs/security/introducing-the-aws-zero-trust-accelerator-for-government/) | security | 2025-05-06 | CISA ゼロトラスト成熟度モデル（ZTMM）と DoD ゼロトラスト戦略の柱構造を直接対比（DoD は可視化/分析・自動化/オーケストレーションを独立した柱とするが、CISA は横断的能力として埋め込む）。 |
| [How to plan for Cybersecurity Maturity Model Certification (CMMC)](https://aws.amazon.com/blogs/publicsector/how-plan-cybersecurity-maturity-model-certification-cmmc/) | publicsector | 2020 頃 | CMMC 1.0 を成熟度モデルとして解説。17 のセキュリティドメイン、NIST SP 800-171 r2 / 800-53 r4 準拠、当初 5 レベル。 |
| [Building your CMMC strategy using cloud technologies](https://aws.amazon.com/blogs/publicsector/building-your-cybersecurity-maturity-model-certification-cmmc-strategy-using-cloud-technologies/) | publicsector | 2020〜2021 頃 | 防衛産業基盤（DIB）事業者が責任共有モデルで CMMC 成熟度レベルを積み上げる方法。 |
| [How to accelerate CMMC compliance with the new AWS Compliant Framework](https://aws.amazon.com/blogs/publicsector/how-to-accelerate-cmmc-compliance-with-new-aws-compliant-framework/) | publicsector | 2021 頃 | GovCloud (US) 向け AWS Compliant Framework の紹介。 |
| [Accelerate CMMC compliance with the AWS CMMC Customer Responsibility Matrix](https://aws.amazon.com/blogs/publicsector/accelerate-cmmc-compliance-with-the-aws-cmmc-customer-responsibility-matrix/) | publicsector | 2021-11-16 | CMMC プラクティスのうち AWS から継承できるものと顧客責任のものを分解した CRM の公開。 |
| [Support FedRAMP and CMMC compliance with the Landing Zone Accelerator on AWS](https://aws.amazon.com/blogs/publicsector/support-fedramp-cmmc-compliance-landing-zone-accelerator-aws/) | publicsector | 2022 頃 | LZA による FedRAMP / CMMC 準拠環境の構築パターン。 |
| [Preparing for CMMC 2.0 compliance: What contractors can do today](https://aws.amazon.com/blogs/publicsector/preparing-for-cmmc-2-0-compliance-what-contractors-can-do-today/) | publicsector | 2024-11 | CMMC 2.0 の 3 レベルモデル。Level 2 以上は C3PAO による第三者認証が必要。 |
| [AWS achieves DoD's CMMC Level 2 certification for Controlled Working Environment](https://aws.amazon.com/blogs/publicsector/aws-achieves-u-s-department-of-defenses-cmmc-level-2-certification-for-controlled-working-environment/) | publicsector | 2025-07 | AWS 自身が CWE で CMMC Level 2 認証を取得（審査は Coalfire）。 |
| [Accelerating CMMC readiness: How AWS and Wiz help public sector organizations](https://aws.amazon.com/blogs/publicsector/accelerating-cmmc-readiness-how-aws-and-wiz-help-public-sector-organizations/) | publicsector | 2025-11 | CMMC 最終規則（32 CFR Part 170）の 3 レベル。L1 と一部 L2 は自己評価、一部 L2 と全 L3 は C3PAO 審査。 |
| [CMMC Level 2 compliance on AWS: Why control ownership is where organizations struggle](https://aws.amazon.com/blogs/publicsector/cmmc-level-2-compliance-on-aws-why-control-ownership-is-where-organizations-struggle/) | publicsector | 2026-04 | CRM、認可境界の定義、複数プロバイダにまたがるコントロール所有権の整理。 |
| [CMMC implementation begins: A new era for defense contractors](https://aws.amazon.com/blogs/publicsector/cmmc-implementation-begins-a-new-era-for-defense-contractors/) | publicsector | 2026-05-04 | 32 CFR / 48 CFR 規則の確定。Phase 1（2025-11〜2026-11）は SPRS への自己評価、Phase 2（2026-11〜）は C3PAO による L2 認証が受注条件に。 |
| [What US federal agencies need to know about OMB memorandum M-26-14: Part 1](https://aws.amazon.com/blogs/publicsector/what-us-federal-agencies-need-to-know-about-omb-memorandum-m-26-14-part-1/) | publicsector | 2026-08 頃 | M-26-14 の改訂ログ成熟度モデル **5 段階（Level 0 Ineffective → Level 4 Optimal）× 5 要素**（インベントリ可視性、収集カバレッジ、収集運用、データ保持、ログ管理）。最低水準方式で採点。 |
| [What US federal customers need to know about memorandum M-21-31](https://aws.amazon.com/blogs/publicsector/aws-federal-customers-memorandum-m-21-31/) | publicsector | 2021〜2022 頃 | OMB M-21-31 のイベントログ成熟度 **EL0〜EL3** と AWS ログサービスの対応。ホット 12 か月 / コールド 18 か月の保持要件。 |
| [Navigating ISM and Essential Eight compliance with AWS Config for Australian government agencies](https://aws.amazon.com/blogs/publicsector/how-australian-government-agencies-can-navigate-ism-essential-8-compliance-aws/) | publicsector | 不明 | ACSC Essential Eight 成熟度モデル（レベル 0〜3）向けの AWS Config コンフォーマンスパック。 |
| [ZTAG-I, a reference zero trust architecture for the US federal government](https://aws.amazon.com/blogs/publicsector/ztag-i-a-reference-zero-trust-architecture-for-the-us-federal-government/) | publicsector | 2025〜2026 | CISA ZTMM の柱と DoD の 7 柱・91 のターゲットアクティビティにマッピングした参照アーキテクチャ。 |
| [A Checklist for Assessing the Cybersecurity Needs of Your Small or Medium Business](https://aws.amazon.com/blogs/smb/a-checklist-for-assessing-the-cybersecurity-needs-of-your-small-or-medium-business/) | smb | 不明 | 中小企業の経営層向けに **「AWS Security Maturity Model」を明示的に参照**し、投資の段階付けの指針として提示。 |

### 2-2. MEDIUM — 成熟度モデルが主要な一節として登場

| タイトル | チャネル | 公開日 | 成熟度に関する内容 |
| --- | --- | --- | --- |
| [Prevent data exfiltration: AWS egress controls for cloud workloads](https://aws.amazon.com/blogs/security/prevent-data-exfiltration-aws-egress-controls-for-cloud-workloads/) | security | 2026 頃（推定） | OT/IT モデルと同じフェーズ語彙を使用。Phase 1 Quick wins（Route 53 DNS Firewall、GuardDuty）、Phase 2 Foundational（組織全体のデータ境界、Network Firewall）、Phase 3 Efficient（IAM Access Analyzer、EventBridge/Lambda 自動修復）。 |
| [Minimize risk through defense in depth: Building a comprehensive AWS control framework](https://aws.amazon.com/blogs/security/minimize-risk-through-defense-in-depth-building-a-comprehensive-aws-control-framework/) | security | 2025-09-23 | 検知中心の体制から、予防的・事前対応的・検出的・対応的の多層コントロールへ成熟する道筋。成熟度 KPI（検出件数の減少、修復時間の短縮、自動修復率の上昇）を提示。 |
| [Announcing the AWS Blueprint for Ransomware Defense](https://aws.amazon.com/blogs/security/announcing-the-aws-blueprint-for-ransomware-defense/) | security | 2022-11 | CIS Critical Security Controls の 40 セーフガードを AWS サービスにマッピング。**IG1 を「必須のサイバー衛生」、IG2 / IG3 を上位層とする段階論**を明示。AWS ブログにおける CIS IG の成熟度的扱いとしては最も明快。 |
| [Updated whitepaper available: Aligning to the NIST Cybersecurity Framework in the AWS Cloud](https://aws.amazon.com/blogs/security/updated-whitepaper-available-aligning-to-the-nist-cybersecurity-framework-in-the-aws-cloud/) | security | 2024（CSF 2.0 版） | NIST CSF 2.0 の 3 構成要素（Core / Profiles / **Implementation Tiers**）を解説。Tiers はリスク管理の厳格さの度合いを示す。 |
| [Updated whitepaper now available: Aligning to the NIST Cybersecurity Framework in the AWS Cloud](https://aws.amazon.com/blogs/security/updated-whitepaper-now-available-aligning-to-the-nist-cybersecurity-framework-in-the-aws-cloud/) | security | CSF 1.1 期 | 上記の旧版（スラッグが `available` / `now-available` で別記事）。 |
| [Optimizing cloud governance on AWS: Integrating the NIST CSF, AWS CAF, and AWS Well-Architected](https://aws.amazon.com/blogs/security/optimizing-cloud-governance-on-aws-integrating-the-nist-cybersecurity-framework-aws-cloud-adoption-framework-and-aws-well-architected/) | security | 不明 | 3 フレームワークを統合したガバナンスモデル。成熟度は CAF ケイパビリティの進展として暗黙に表現。 |
| [New Whitepaper Now Available: The Security Perspective of the AWS Cloud Adoption Framework](https://aws.amazon.com/blogs/security/new-whitepaper-now-available-the-security-perspective-of-the-aws-cloud-adoption-framework/) | security | 2016 頃 | 「反復を通じて成熟するセキュリティプログラム」の構築を説く。AWS の成熟度モデル思想の源流。 |
| [Considerations for the security operations center in the cloud: deployment using AWS security services](https://aws.amazon.com/blogs/security/considerations-for-the-security-operations-center-in-the-cloud-deployment-using-aws-security-services/) | security | 不明 | 集中型／分散型／ハイブリッドの SOC 運用モデル。散発的なローカルログ収集から自動プレイブック駆動の対応まで、組織成熟度を段階付け。 |
| [Operationalizing cloud adoption with the AWS Cloud Maturity Assessment](https://aws.amazon.com/blogs/publicsector/operationalizing-cloud-adoption-with-the-aws-cloud-maturity-assessment/) | publicsector | 2024-06 頃 | AWS Cloud Maturity Assessment (CMA)。**77 問**で AWS CAF の 6 パースペクティブ（**Security を含む**）の成熟度を採点し、レベルごとの次アクションを提示。 |
| [AWS Unified Operations: Building Resilient Operations for Mission-Critical Workloads](https://aws.amazon.com/blogs/mt/aws-unified-operations-building-resilient-operations-for-mission-critical-workloads/) | mt | 2026-04 頃 | IAM・検知・監査/ログ・インフラ保護・データ保護・インシデント対応の **6 軸を各 1〜3 で採点する成熟度ルーブリック**を掲載。 |
| [Managed Cloud Security Starts at Level 1 with AWS Level 1 MSSP Competency Partners](https://aws.amazon.com/blogs/apn/managed-cloud-security-starts-at-level-1-with-aws-level-1-mssp-competency-partners/) | apn | 2020〜2021 頃 | マネージドセキュリティを段階的な水準（「Level 1」= 10 のマネージドセキュリティサービスのベースライン）として提示。 |
| [Cloud Transformation Maturity Model: Guidelines to develop effective strategies for your cloud adoption journey](https://aws.amazon.com/blogs/publicsector/cloud-adoption-maturity-model-guidelines-to-develop-effective-strategies-for-your-cloud-adoption-journey/) | publicsector | 不明 | 4 段階（project → foundation → migration → optimization）。セキュリティは構成要素の 1 つ。 |
| [Updated conformance packs for Australian government security frameworks](https://aws.amazon.com/blogs/publicsector/updated-conformance-packs-for-australian-government-security-frameworks/) | publicsector | 不明 | Essential Eight / ACSC ISM 向け Config コンフォーマンスパックの更新。 |
| [Best Practices for Manufacturing OT Security](https://aws.amazon.com/blogs/industries/best-practices-for-manufacturing-ot-security/) | industries | 不明 | インダストリー 4.0 の IT/OT 融合における OT セキュリティのベストプラクティス段階論。OT/IT 成熟度モデル記事と相互参照関係。 |
| [Building zero trust for the DoD: Insights from Les Call (DoD CIO ZT PfMO)](https://aws.amazon.com/blogs/publicsector/building-zero-trust-for-the-department-of-defense-insights-from-les-call-director-of-the-dod-cio-zt-pfmo/) | publicsector | 不明 | DoD ゼロトラスト戦略の Target レベル / Advanced レベル。 |
| [Zero Trust architectures: An AWS perspective](https://aws.amazon.com/blogs/security/zero-trust-architectures-an-aws-perspective/) | security | 2021-06 | AWS のゼロトラスト基本方針。名前付きの階層ではなく多層防御の漸進的成熟として論じる。 |
| [Scaling a governance, risk, and compliance program for the cloud](https://aws.amazon.com/blogs/security/scaling-a-governance-risk-and-compliance-program-for-the-cloud/) | security | 不明 | GRC のベストプラクティスとして「現在のケイパビリティ成熟度を評価し、目標状態を定め、ギャップを文書化する」。 |

### 2-3. LOW — 言及のみ／隣接概念

| タイトル | チャネル | 備考 |
| --- | --- | --- |
| [Security posture improvement in the AI era](https://aws.amazon.com/blogs/security/security-posture-improvement-in-the-ai-era/) | security | SHIP（Security Health Improvement Program）。10 のコアセキュリティユースケース横断の評価。段階モデルではなくアセスメント型。 |
| [ICYMI: June 2026 @AWS Security](https://aws.amazon.com/blogs/security/icymi-june-2026-aws-security/) | security | 月次まとめ。maturity roadmap 記事を紹介。 |
| [How to think about cloud security governance](https://aws.amazon.com/blogs/security/how-to-think-about-cloud-security-governance/) | security | ガバナンスモデルとガードレールの進展。明示的なレベルはなし。 |
| [Considerations for security operations in the cloud](https://aws.amazon.com/blogs/security/considerations-for-security-operations-in-the-cloud/) | security | SOC 運用モデル。 |
| [Introducing SRA Verify – an AWS Security Reference Architecture assessment tool](https://aws.amazon.com/blogs/security/introducing-sra-verify-an-aws-security-reference-architecture-assessment-tool/) | security | SRA 整合性の評価ツール。ギャップ分析であり段階モデルではない。 |
| [AWS Security Reference Architecture: A guide to designing with AWS security services](https://aws.amazon.com/blogs/security/aws-security-reference-architecture-a-guide-to-designing-with-aws-security-services/) | security | 段階的なアーキテクチャ採用。 |
| [How AWS is simplifying security at scale: four keys… re:Inforce 2025](https://aws.amazon.com/blogs/security/how-aws-is-simplifying-security-at-scale-four-keys-to-faster-innovation-from-aws-reinforce-2025/) | security | 「成熟したセキュリティモデルを持つ組織が最速で動く」との言及のみ。 |
| [Establishing a data perimeter on AWS: Analyze your account activity…](https://aws.amazon.com/blogs/security/establishing-a-data-perimeter-on-aws-analyze-your-account-activity-to-evaluate-impact-and-refine-controls/) | security | データ境界導入の番号付きフェーズ。 |
| [Announcing the Cloud Security Alliance on AWS Compliance Guide](https://aws.amazon.com/blogs/security/announcing-the-cloud-security-alliance-on-aws-compliance-guide/) | security | CSA Cloud Controls Matrix。コントロールフレームワークであり成熟度モデルではない。 |
| [Empowering zero trust in public sector with Cisco Umbrella for Government on AWS](https://aws.amazon.com/blogs/publicsector/empowering-zero-trust-in-public-sector-with-cisco-umbrella-for-government-on-aws/) | publicsector | OMB M-22-09 対応のパートナーソリューション。 |
| [Prepare for your GovRAMP Progressing Snapshot with AWS](https://aws.amazon.com/blogs/publicsector/prepare-for-your-govramp-progressing-snapshot-with-aws/) | publicsector | GovRAMP の Progressing → Authorized の段階的経路。 |
| [Cloud security design considerations for state and local government](https://aws.amazon.com/blogs/publicsector/cloud-security-design-considerations-for-state-and-local-government/) | publicsector | 継続的改善の文脈でセキュリティ体制に言及。 |
| [Embracing OT-IT Convergence: How Automation Software Management Can Enhance OT Security](https://aws.amazon.com/blogs/industries/convergence/) | industries | ソフトウェア定義アーキテクチャによる OT/IT 融合の進展。 |
| [Industrial digital transformation: Using AWS to win freedom from pilot purgatory](https://aws.amazon.com/blogs/industries/industrial-digital-transformation-using-aws-to-win-freedom-from-pilot-purgatory/) | industries | プロセス・技術・人材の成熟度／準備状況評価を推奨。セキュリティは付随的。 |
| [Improve your IoT security posture using AWS](https://aws.amazon.com/blogs/mt/improve-your-iot-security-posture-using-aws/) | mt | AWS IoT Security Baseline (AISB)。最小限の基礎コントロール集＝「foundational」層に相当。 |
| [How Cloud-Mature Enterprises Succeed](https://aws.amazon.com/blogs/mt/how-cloud-mature-enterprises-succeed/) | mt | クラウド成熟度全般。セキュリティ成熟度モデルではない。 |
| [Assessing OT and IIoT cybersecurity risk](https://aws.amazon.com/blogs/iot/assessing-ot-and-iiot-cybersecurity-risk/) | iot | OT / IIoT のサイバーリスク評価。 |
| [Managing organizational transformation for successful OT/IT convergence](https://aws.amazon.com/blogs/iot/managing-organizational-transformation-for-successful-ot-it-convergence/) | iot | OT/IT 融合に伴う組織変革。上記 OT/IT 成熟度モデル記事の姉妹記事。 |
| [Architect a mature generative AI foundation on AWS](https://aws.amazon.com/blogs/machine-learning/architect-a-mature-generative-ai-foundation-on-aws/) | machine-learning | 生成 AI 基盤の成熟度モデル。セキュリティ／ガバナンスは一次元にすぎない。 |
| [Aligning AWS security services to MovieLabs CSAP](https://aws.amazon.com/blogs/media/aligning-aws-security-services-to-movielabs-common-security-architecture-for-production-csap/) | media | CSAP 整合シリーズ。アーキテクチャフレームワークであり段階論ではない。 |
| [Assessing Application Resilience: A getting started guide for AWS Partners](https://aws.amazon.com/blogs/apn/assessing-application-resilience-a-getting-started-guide-for-aws-partners/) | apn | RA2: 8 原則 85 問、各項目に成熟度ガイドと評価あり。ただし対象はレジリエンス。 |
| [Introducing New Categories of AWS Security Competency Partners](https://aws.amazon.com/blogs/apn/introducing-new-categories-of-aws-security-competency-partners/) | apn | パートナー認定の分類であり顧客側の成熟度レベルではない。 |
| [Strengthening application security: How Detectify and AWS help enterprises control their attack surface](https://aws.amazon.com/blogs/apn/strengthening-application-security-how-detectify-and-aws-help-enterprises-control-their-attack-surface/) | apn | 「事業とともに成熟するセキュリティ体制」への言及。 |
| [Navigating your way into cloud security: Skills, roles, and career trajectories](https://aws.amazon.com/blogs/training-and-certification/navigating-your-way-into-cloud-security-skills-roles-and-career-trajectories/) | training-and-certification | 人材のキャリア段階であり組織の成熟度ではない。 |
| [Building a culture of security](https://aws.amazon.com/blogs/enterprise-strategy/building-a-culture-of-security/) | enterprise-strategy | セキュリティ文化の醸成。段階フレームワークなし。 |

### 2-4. 該当記事が見つからなかったチャネル

`devops` / `opensource` / `containers` / `big-data` / `networking-and-content-delivery` / `database` / `compute` / `storage` / `startups` / `gametech` / `hpc` / `quantum-computing` / `awsmarketplace` / `aws-cloud-financial-management` / `modernizing-with-aws` / `migration-and-modernization` / `security-bulletins` / **`architecture`**

特筆すべき点として、**AWS Architecture Blog と AWS Cloud Enterprise Strategy Blog（Executive in Residence）にはセキュリティ成熟度モデルの記事が存在しません。** これらを狙ったクエリはすべて Security Blog または規範ガイダンスに解決されました。

---

## 3. 日本語ブログ（<https://aws.amazon.com/jp/blogs/>）

### 3-1. HIGH — 成熟度モデルが記事の主題

| タイトル | チャネル | 公開日 | 内容 |
| --- | --- | --- | --- |
| [DoD Cybersecurity Maturity Model Certification (CMMC) にみるクラウドコンプライアンスのトレンド（AWS Public Sector Summit Online より）](https://aws.amazon.com/jp/blogs/news/dod-cmmc-intro/) | news | 2021-04-23 | 米国防総省の CMMC（サイバーセキュリティ成熟度モデル認証）を主題に、目的・レベル体系と、クラウド技術による CMMC 準拠へのアプローチを解説。 |

> **日本語 AWS ブログでタイトルに「成熟度モデル」が入るのは、確認できた限りこの 1 本のみです。**

### 3-2. MEDIUM — AWS セキュリティ成熟度モデルを施策紹介の中で提示

2026 年以降、AWS Japan パブリックセクター技術統括本部が実施する月次セキュリティワークショップの開催報告で、「AWS セキュリティ成熟度モデル＝組織のセキュリティ対策の現在地を把握し、次の施策を明確にするフレームワーク」として紹介し、セルフチェック用の評価シートへ誘導する定型パターンが確立しています。

| タイトル | チャネル | 公開日 | 成熟度モデルの扱い |
| --- | --- | --- | --- |
| [ランサムウェア対策ワークショップ開催報告 ＆ ワークショップ緊急開催のご案内](https://aws.amazon.com/jp/blogs/news/aws-ransomware-workshop-report-claude-mythos-workshop-upcoming/) | news | 2026-05 頃（推定） | 第 1 回（脅威検知 / GuardDuty）・第 2 回（統合セキュリティ管理 / Security Hub）の報告。AWS セキュリティ成熟度モデルを定義し、GuardDuty（Detect）と Security Hub（Identify / Detect）を段階上に位置付け。シナリオは MITRE ATT&CK にマッピング。 |
| [【公共向け】脅威対策ワークショップ開催報告 ＆ 耐障害性ライフサイクル実践ワークショップのご案内](https://aws.amazon.com/jp/blogs/news/claude-mythos-workshop-report-resilience-workshop-upcoming/) | news | 2026-07 頃（推定） | 同シリーズ第 3 回（Amazon Inspector）・第 4 回（AWS Security Agent）の報告。脆弱性管理・ポスチャ管理が自組織でどの段階にあるかを確認する枠組みとして提示。 |
| [ヘルスケア業界のエンジニア 46 名がセキュリティインシデント疑似体験に挑戦 – AWS GameDay 開催レポート](https://aws.amazon.com/jp/blogs/news/healthtech-security-gameday-2026-report/) | news | 2026-04 頃（イベントは 2026-03-31） | 次のステップとして [AWS セキュリティ成熟度モデルの評価ツール](https://maturitymodel.security.aws.dev/ja/assessment-tools/) を明示的に案内。 |
| [フロンティア AI による脅威変化への備え – 金融庁・日本銀行から金融機関等への要請と AWS サービスの活用](https://aws.amazon.com/jp/blogs/news/preparing-for-frontier-ai-threats-fsa-boj-request-aws/) | news | 2026-06 頃（推定） | 金融庁・日銀の要請 9 項目への対応策を解説。**AWS セキュリティ成熟度モデルが過去 1 年で世界 5 万社超に利用されている**とし、経営として優先順位・リソース配分を判断する材料に位置付け。日本語圏で最も踏み込んだ言及。 |

> 上記 4 本は、記事タイトル・URL・内容とも検索スニペット経由でのみ確認しており、**本文による裏取りができていません。**

### 3-3. LOW — 言及のみ／隣接概念

| タイトル | チャネル | 英語版 |
| --- | --- | --- |
| [AI 時代におけるセキュリティ体制の強化](https://aws.amazon.com/jp/blogs/news/security-posture-improvement-in-the-ai-era/) | news | [英語版あり](https://aws.amazon.com/blogs/security/security-posture-improvement-in-the-ai-era/)（SHIP、10 ユースケース） |
| [クラウドでのセキュリティ運用に関する考慮事項](https://aws.amazon.com/jp/blogs/news/considerations-for-security-operations-in-the-cloud/) | news | 英語版あり |
| [ゼロトラストアーキテクチャ: AWS の視点](https://aws.amazon.com/jp/blogs/news/zero-trust-architectures-an-aws-perspective/) | news | [英語版あり](https://aws.amazon.com/blogs/security/zero-trust-architectures-an-aws-perspective/)（2021） |
| [AWS 上でどのようにゼロトラストアーキテクチャを考えていくか](https://aws.amazon.com/jp/blogs/news/how-to-think-about-zero-trust-architectures-on-aws/) | news | 英語版あり |
| [AWS クラウドにおける NIST サイバーセキュリティフレームワークへの準拠 – 日本語のホワイトペーパーを公開しました](https://aws.amazon.com/jp/blogs/news/updated-whitepaper-now-available-aligning-to-the-nist-cybersecurity-framework-in-the-aws-cloud/) | news | 英語版あり（CSF 1.1 期。**CSF 2.0 版の日本語記事は未発見**） |
| [進化するサイバー脅威には新しいセキュリティアプローチが必要 — 統一されたグローバルな IT/OT SOC のメリット](https://aws.amazon.com/jp/blogs/news/evolving-cyber-threats-demand-new-security-approaches-the-benefits-of-a-unified-and-global-it-ot-soc/) | news | 英語版あり |
| [OT/IT コンバージェンスを成功させるための組織変革の管理](https://aws.amazon.com/jp/blogs/news/managing-organizational-transformation-for-successful-ot-it-convergence/) | news | 英語版あり |
| [製造 OT 向けのセキュリティのベストプラクティス](https://aws.amazon.com/jp/blogs/news/best-practices-for-manufacturing-ot-security/) | news | 英語版あり |
| [ISA/IEC 62443 を踏まえた AWS での OT とクラウドの接続設計](https://aws.amazon.com/jp/blogs/news/isaiec62443/) | news | 日本オリジナル（推定）。ISA/IEC 62443 のセキュリティレベル（SL）体系 |
| [攻撃者視点で考える AWS セキュリティ ― 富士通 × AWS 共催セミナーレポート](https://aws.amazon.com/jp/blogs/news/fujitsu-security-seminar/) | news | 日本オリジナル。「可視化 → 検知・防御 → インシデント対応力」の 3 ステップ |
| [セキュリティの実践とベストプラクティス - 日本銀行様『クラウドサービス利用におけるリスク管理上の留意点』によせて -](https://aws.amazon.com/jp/blogs/news/compliance-and-best-practice/) | news | 日本オリジナル。「組織の IT 成熟度」に言及 |
| [【開催報告】ランサムウェアに備える「防御」と「復旧」（2026 年 5 月 21 日）](https://aws.amazon.com/jp/blogs/news/ransomware-security-seminar-may-2026/) | news | 日本オリジナル。NIST CSF（統治〜復旧）に沿った運用整理 |
| [【開催報告＆動画公開】AWS で実現する企業の包括的サイバーセキュリティ対策](https://aws.amazon.com/jp/blogs/news/how-aws-enables-comprehensive-cybersecurity-for-enterprise/) | news | 日本オリジナル |
| [AWS Continuum のご紹介: マシンスピードで実現するセキュリティ](https://aws.amazon.com/jp/blogs/news/introducing-aws-continuum-security-at-machine-speed/) | news | [英語版あり](https://aws.amazon.com/blogs/security/introducing-aws-continuum-security-at-machine-speed/)。脆弱性ライフサイクルの 4 フェーズ |
| [リスクベースのアプローチを考える（AWS FISC リファレンス改訂にあわせて）](https://aws.amazon.com/jp/blogs/news/rethink-riskbased-approach/) | news | 日本オリジナル |
| [すぐに始められるセキュリティレポート作成 – Service Screener v2 と AWS セキュリティフレームワークの活用](https://aws.amazon.com/jp/blogs/startup/service-screener-v2-security-assessment/) | **startup** | 日本オリジナル（推定） |
| [AWS DevOps コンピテンシー DevSecOps カテゴリの追加](https://aws.amazon.com/jp/blogs/psa/aws-devops-competency-expands-to-include-devsecops-category_jp/) | **psa** | 英語版あり（APN Blog） |
| [APN セキュリティコンソーシアム・ジャパン設立と活動のご紹介](https://aws.amazon.com/jp/blogs/psa/apn-security-consortium-japan-established/) | **psa** | 日本オリジナル。成果物「クラウドリスクコントロールフレームワーク（CRCF）」 |

---

## 4. 英日の対応状況 — 日本語版が存在しない重要記事

| 英語記事 | 公開日 | 日本語版 |
| --- | --- | --- |
| [OT/IT convergence security maturity model](https://aws.amazon.com/blogs/security/ot-it-convergence-security-maturity-model/) | 2024-01-18 | **未発見**（セキュリティ成熟度モデルそのものを扱う代表記事にもかかわらず未翻訳） |
| [Operationalizing AWS security: A maturity roadmap](https://aws.amazon.com/blogs/security/operationalizing-aws-security-a-maturity-roadmap/) | 2026-06-08 | **未発見** |
| [Updated Essential Eight guidance for Australian customers](https://aws.amazon.com/blogs/security/updated-essential-eight-guidance-for-australian-customers/) | 2023-10-23 | **未発見** |
| Public Sector Blog の CMMC 系記事群（10 本超） | 2020〜2026 | 日本語版は §3-1 の 1 本のみ |
| NIST CSF 2.0 版ホワイトペーパー告知 | 2024 | **未発見**（CSF 1.1 期の日本語記事のみ） |

**日本語圏の一次情報としては、ブログよりも [maturitymodel.security.aws.dev の日本語版サイト](https://maturitymodel.security.aws.dev/ja/) と [規範ガイダンスの日本語版](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/strategy-accelerating-security-maturity/introduction.html) が実質的な本体です。**

---

## 5. AWS ブログに登場しない隣接フレームワーク

38 クエリを費やしても、以下は AWS ブログに記事が 1 本も見つかりませんでした。

| フレームワーク | 状況 |
| --- | --- |
| **C2M2**（DOE サイバーセキュリティ能力成熟度モデル） | 記事なし。エネルギー分野の AWS ページも NERC CIP / NIST CSF / CMMC には触れるが C2M2 には触れない。 |
| **OWASP SAMM** | 記事なし。OWASP は ZAP、Dependency-Check、OWASP Top 10 for LLMs としてのみ登場。 |
| **BSIMM** | ヒット 0 件。 |
| **Cloud Security Maturity Model（IANS / CSA）** | 記事なし。CSA は Cloud Controls Matrix と STAR 認証としてのみ登場。 |
| **AWS Security Maturity Model の公開告知記事** | **存在しない。** `maturitymodel.security.aws.dev` ドメインは 138 クエリを通じて一度もブログ記事から参照されなかった。モデルは他記事の中で参照される形でのみ流通している。 |

つまり「AWS が実際にブログで扱っている名前付き成熟度フレームワーク」は次の 6 つに限られます。

**CMMC / CISA・DoD ゼロトラスト成熟度 / ACSC Essential Eight / CIS Controls IG / NIST CSF Implementation Tiers / AWS 自身の crawl-walk-run（AWS Security Maturity Model）**

---

## 6. 関連する非ブログ資料

### AWS Security Maturity Model（本体）

- [AWS Security Maturity Model v2](https://maturitymodel.security.aws.dev/en/model/) ／ [日本語版](https://maturitymodel.security.aws.dev/ja/)
- [自己評価ツール](https://maturitymodel.security.aws.dev/ja/assessment-tools/)
- [v1（アーカイブ）](https://v1.maturitymodel.security.aws.dev/en/)
- 4 フェーズ: **Quick Wins**（数クリック〜数日）→ **Foundational**（体制の基礎）→ **Efficiency**（既存実装からの最大効果）→ **Optimize**（次段階へ）

### AWS 規範ガイダンス

- [Crawl, walk, run: Accelerating security maturity in the AWS Cloud](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-accelerating-security-maturity/introduction.html) ／ [日本語](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/strategy-accelerating-security-maturity/introduction.html)
  - 段階: plan → build → assess → operationalize → mature → optimize
- [Reaching Essential Eight maturity on AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/essential-eight-maturity/introduction.html)
- [CMMC Level 2 compliance on AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cmmc-level-2-compliance-on-aws/aws-cloud-considerations.html)
- [Embracing Zero Trust: A strategy for security modernization](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-zero-trust-architecture/introduction.html)
- [Maturity model for adopting generative AI on AWS](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/introduction.html)

### ホワイトペーパー

- [AWS Cloud Adoption Framework: Security Perspective](https://docs.aws.amazon.com/whitepapers/latest/aws-caf-security-perspective/aws-caf-security-perspective.html)（[Planning your security journey](https://docs.aws.amazon.com/whitepapers/latest/aws-caf-security-perspective/planning-your-security-journey.html)）

### AWS Config コンフォーマンスパック / Audit Manager フレームワーク

- [CMMC 2.0 Level 1](https://docs.aws.amazon.com/config/latest/developerguide/operational-best-practices-for-cmmc_2.0_level_1.html) / [Level 2](https://docs.aws.amazon.com/config/latest/developerguide/operational-best-practices-for-cmmc_2.0_level_2.html)
- CIS Critical Security Controls v8 IG1 / IG2 / IG3
- [ACSC Essential 8](https://docs.aws.amazon.com/config/latest/developerguide/operational-best-practices-for-acsc_essential_8.html)
- [NIST CSF](https://docs.aws.amazon.com/config/latest/developerguide/operational-best-practices-for-nist-csf.html)

### 製品・プログラムページ

- [CMMC（英語）](https://aws.amazon.com/compliance/cmmc/) ／ [日本語](https://aws.amazon.com/jp/compliance/cmmc/)
- [CMMC ソリューション（Defense & National Security）](https://aws.amazon.com/solutions/defense-national-security/cybersecurity-maturity-model-certification/)
- [AWS Zero Trust](https://aws.amazon.com/security/zero-trust/)

### AWS Marketplace（サードパーティの成熟度アセスメント）

`Security Maturity Assessment`（prodview-gaflxp72wsw5o）／ `SEK Security Maturity Model`（prodview-hgl26soabl2du）／ `Cloud Security Maturity Assessment`（prodview-klke4td5zcqtu）／ `DevSecOps Maturity Assessment`（prodview-2dxp27gqhum6o）／ `Cevo DevSecOps Maturity Assessment DOMA`（prodview-zow6r2j7z55ty）／ `Zero Trust Assessment & Roadmap for AWS`（prodview-oyxgabbpaoreu）

いずれも AWS CAF の 10 ケイパビリティ領域と AWS Security Maturity Model の 4 フェーズに沿った評価を提供しています。

### 一覧・タグページ（起点として有用）

- <https://aws.amazon.com/blogs/publicsector/tag/cmmc/> · `/tag/zero-trust/` · `/tag/dod/`
- <https://aws.amazon.com/blogs/security/tag/nist-csf/> · `/tag/zero-trust/` · `/tag/devsecops/`
- <https://aws.amazon.com/jp/blogs/news/tag/aws-security-blog/> · [セキュリティタグ](https://aws.amazon.com/jp/blogs/news/tag/%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3/)

### その他（`/jp/blogs/` 外）

- builders.flash [年始に勉強したい AWS セキュリティのコンテンツまとめ](https://aws.amazon.com/jp/builders-flash/202401/security-contents-summary/)

---

## 7. 未確認事項・今後の宿題

egress 制限が解除された環境、または AWS ブログの JSON ディレクトリ API（`https://aws.amazon.com/api/dirs/items/search?item.directoryId=blog-posts&size=100&page=N&item.locale=en_US`／`ja_JP`）を全ページ巡回できる環境で、次を確定させる必要があります。

1. **本レポート全体の網羅性検証。** 現状は検索インデックス依存であり、全件走査による裏取りができていません。
2. **公開日の確定。** 「不明」「推定」と記した記事が多数あります。
3. **LOW 層の分類精度。** 本文未読のため、実際には「成熟度」に触れていない記事が混入している可能性があります。
4. **日本語ワークショップ報告 4 本（§3-2）の裏取り。** URL・タイトル・内容とも検索スニペット経由のみです。
5. **未特定の手がかり**: SMB ブログに 3 段階（Foundational → Established → Optimized、0〜6 / 6〜18 / 18 か月以降）の成熟度モデル記述があるとのスニペットが得られましたが、URL を特定できませんでした。候補は次の 2 つです。
   - <https://aws.amazon.com/blogs/smb/build-a-strong-foundation-in-the-cloud-to-help-your-small-or-medium-businesses-grow/>
   - <https://aws.amazon.com/blogs/smb/getting-started-with-your-smbs-first-aws-cloud-project/>
