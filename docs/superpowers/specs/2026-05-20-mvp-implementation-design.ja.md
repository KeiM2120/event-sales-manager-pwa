# Event Sales Manager PWA MVP実装設計

## 目的

Event Sales Manager PWAの最初の実用MVPを作る。MVPは、イベント当日に使える程度の品質を持ちつつ、計画済み仕様を広くカバーする。

設計では、単一端末のAndroid運用、オフライン利用、会計の速さ、IndexedDBへの堅実な保存、在庫の動的計算、キャンセルによるUndo、イベント当日の統計確認、CSV出力、PWAのオフライン起動と更新通知を優先する。

## プロジェクト概要

このアプリは、コミックマーケット、M3、技術書典、同人誌即売会、その他のコンベンションイベントで使う頒布管理PWAである。スマートフォン向けPWAとして動作し、イベント当日の会計、在庫管理、取り置き管理、売上統計確認を1台の端末で完結できることを目指す。

主な利用シーン:

- 同人誌即売会での頒布会計。
- 商品ごとの初期在庫、取り置き数、残数確認。
- セット商品の頒布と構成品単位の在庫反映。
- 取り置き分の受け渡しと売上計上。
- イベント中またはイベント後の売上、頒布数、経費、利益確認。
- イベント後のCSV出力による表計算での集計。

完全オフライン動作を前提にし、バックエンドに依存しない。運用対象は単一端末であり、複数端末間の同期やクラウド共有は扱わない。

## 対象環境

正式対応:

- Android Chrome

準対応:

- Android Firefox

設計上は、イベント会場での片手操作、通信不安定な環境、急いだ会計、誤タップの起きやすさを前提にする。iOS固有の最適化はMVP対象外とする。

## 技術スタック

Frontend:

- React
- TypeScript
- Vite

UI:

- TailwindCSS

State:

- React `useReducer`
- React Context。必要最低限に留める。

Storage:

- Dexie
- IndexedDB

PWA:

- vite-plugin-pwa

Utility:

- `crypto.randomUUID()`

TypeScriptはstrict modeを前提にし、`any` は使わない。依存関係は必要最小限にし、ドメイン処理にはできるだけ標準機能と純粋関数を使う。

Deploy:

- GitHub Pages
- GitHub Actions

## プロダクト方針

このMVPは、見た目の装飾よりもイベント当日の確実な操作を優先する。

基本方針:

- オフラインファースト。
- 単一端末運用。
- 即売会現場での高速操作を優先。
- Androidスマートフォンでの片手操作を前提。
- 大きく押しやすいボタンを使う。
- 状態の上書きよりイベントログとしての売上履歴を重視する。
- 残在庫は保存せず、初期在庫、取り置き数、キャンセルされていない売上から動的に計算する。
- 売上は物理削除せず、取消は `canceled: true` で表す。
- 売上明細はスナップショットを保持し、後から商品情報が変わっても過去の売上を変えない。

UIは、営業資料のようなランディングページではなく、最初から実際の業務画面として作る。特に会計画面は、価格、数量、残数、確定操作が一目で分かることを優先する。

## スコープ

MVPに含めるもの:

- Vite、React、TypeScript、TailwindCSS、Dexie、vite-plugin-pwaのセットアップ。
- ホーム、会計、統計、管理、設定の独立画面。
- イベント、商品、セット、セット構成、イベント別在庫、売上、経費の保存。
- ホームからの初期セットアップ導線。イベント作成、商品登録、任意のセット登録、在庫と取り置き入力、会計開始へ進む。
- イベント、商品、セット、イベント別在庫、取り置き、経費を手入力できる管理画面。
- 通常商品、セット、取り置き受け渡しの会計。
- `canceled: true` による売上取消。物理削除はしない。
- 残在庫を保存せず、都度計算する在庫管理。
- キャンセル済み売上を除外する統計。
- 売上サマリー、売上明細、商品別展開、経費の4種類のCSV出力。
- PWAのApp Shellキャッシュと、ユーザー操作による更新通知。

MVPに含めないもの:

- 認証、クラウド同期、複数端末同期、Firebase、リアルタイム通信、プリンター、バーコード読み取り、QR決済、iOS固有最適化。
- JSON import/export。CSV出力は含めるが、JSONバックアップと復元は後続機能とする。
- 予約者単位の取り置き管理。取り置きは商品ごとの数と任意メモで管理する。

## 実装優先順位

実装は次の順に進める。

1. Vite/React/TypeScript/TailwindCSS/Dexie/PWAの足場。
2. Dexie setupとDB schema。
3. ドメイン型定義。
4. 在庫計算、セット展開、売上集計などの純粋関数。
5. Checkout reducer。
6. 会計画面。
7. Sale保存処理とUndo処理。
8. 取り置き受け渡し処理。
9. 管理画面。
10. 統計画面。
11. CSV出力。
12. PWA化と更新通知。
13. ビルド、lint、テストによる検証。

この順序は、在庫計算と売上保存の安全性を先に固め、その上に画面とエクスポートを積むためのもの。

## アーキテクチャ

MVPは、データと業務ルールを先に固めてから画面を作る方針で実装する。画面の作り込みより先に、ドメインロジックと保存境界を安定させる。

推奨するソース構成:

```txt
src/
  components/
  pages/
  hooks/
  reducers/
  services/
  db/
  domain/
  utils/
```

業務ルールはReactコンポーネントに埋め込まず、純粋なドメインモジュールまたはサービスモジュールに置く。Reactのページは、データを読み、サービスを呼び、reducerへdispatchし、状態を描画する役割に寄せる。

主な責務:

- `src/db/`: DexieのDB定義、migration、repository形式の関数。
- `src/domain/`: 在庫計算、セット展開、統計、CSV行生成、検証ヘルパーなどの純粋関数。
- `src/reducers/`: 会計状態reducerなど、純粋なUI状態管理。
- `src/services/`: repositoryとdomain関数を組み合わせる処理。会計確定や取り置き受け渡しなど。
- `src/pages/`: ホーム、会計、統計、管理、設定の独立画面。

## データモデル

Dexie schemaは `spec.md` を基本にする。

```ts
this.version(1).stores({
  events: "id,eventDate,series",
  products: "id,name,productGenre,isActive",
  bundles: "id,name,isActive",
  bundleItems: "[bundleId+productId],bundleId,productId",
  eventInventories: "[eventId+productId],eventId,productId",
  sales: "id,[eventId+datetime],eventId,datetime,canceled",
  expenses: "id,eventId,category",
})
```

主なレコード:

- `Event`: イベント名、日付、種別、任意メモ。
- `Product`: 商品名、ジャンル、標準価格、有効フラグ。
- `Bundle`: セット名、価格、有効フラグ。
- `BundleItem`: セットID、商品ID、数量。
- `EventInventory`: イベントID、商品ID、初期在庫、取り置き数、任意の取り置きメモ。
- `Sale`: イベントID、日時、合計金額、キャンセルフラグ、売上明細。
- `Expense`: イベントID、カテゴリ、支払先、金額、任意メモ。

`EventInventory` には以下を追加する。

```ts
reservationMemo?: string
```

売上明細の種別は明示的に扱う。

```ts
type SaleLineKind = "product" | "bundle" | "reservation"
```

売上明細はスナップショットを保持する。後から商品名、セット名、価格を変更しても、過去の売上が書き換わらないようにする。明細には表示名、ジャンル、単価、数量、小計、必要に応じてセット構成品のスナップショットを保存する。

## 在庫ルール

残在庫は保存しない。

残在庫は次の式で計算する。

```txt
remainingStock = initialStock - reservedStock - soldCount
```

`soldCount` は、キャンセルされていない売上だけから算出する。単品販売と取り置き受け渡しは商品数として直接数える。セット販売は構成品に展開して数える。

キャンセル済み売上は、在庫の販売数、統計、商品ランキングから除外する。売上レコード自体は `canceled: true` の履歴として残す。

## 会計フロー

会計画面はイベント当日の主画面とする。

会計画面には、次の販売項目を大きく表示する。

- 有効な商品。
- 有効なセット。
- `reservedStock > 0` の商品に対する `取り置き: 商品名` の受け渡し項目。

販売項目をタップすると、現在の会計状態に明細を追加する。会計状態はReact reducerで保持し、永続化しない。

会計明細では `-` と `+` で数量を変更する。`-` によって数量が `0` になった明細は自動で消える。個別の行削除ボタンは置かない。Action Barには次を置く。

- `クリア`: 現在の会計を空にする。
- `Undo`: 選択中イベントの直近の未キャンセル売上をキャンセルする。
- `確定`: 現在の会計を検証して保存する。

会計確定時の処理:

1. Checkout stateをSaleスナップショットへ変換する。
2. IndexedDBから現在のイベント在庫と売上を読み直す。
3. 通常商品とセットを、動的に計算した残在庫に対して検証する。
4. 取り置き明細を `reservedStock >= quantity` で検証する。
5. 問題がなければDexie transaction内でSaleを保存する。
6. 同じtransaction内で、取り置き明細の数量分だけ `reservedStock` を減らす。
7. 保存成功後に会計状態を空にする。

検証に失敗した場合、Saleを保存せず、取り置き数も変更しない。次のような短いメッセージを表示する。

```txt
取り置き数が不足しています: 新刊 残り1 / 必要2
```

## 取り置き受け渡し

取り置きの入力と編集は、管理画面で商品ごとの取り置き数と任意メモとして行う。

取り置き受け渡しは、会計画面の `取り置き: 商品名` 販売項目から行う。取り置き由来の売上明細は、履歴と売上明細CSVでは `kind: "reservation"` として残す。統計と商品別展開CSVでは、通常の商品販売と同じく売上と商品数に含める。

これにより、現場の会計操作を速くしつつ、後から通常販売と取り置き受け渡しを区別できる。

## 画面

### ホーム

ホームは起動時の入口とする。イベント選択、選択中イベント、初期セットアップ進捗、各画面への入口を表示する。

セットアップが未完了の場合は、次の順に案内する。

1. イベント作成。
2. 商品登録。
3. セット登録。セットが不要な場合はスキップ可能。
4. 在庫と取り置き入力。
5. 会計開始。

### 会計

会計画面はAndroid Chromeでのイベント当日利用に最適化する。大きなタップ領域、読みやすい価格、数量、残数、安定したAction Barを優先する。

販売項目には、商品、セット、取り置き受け渡し項目を含める。会計サマリーの明細は `-` と `+` で数量操作し、数量 `0` で明細を消す。

### 管理

管理画面は、イベント前の準備と当日の修正に使う。画面内で次のセクションを切り替える。

- 商品。
- セット。
- 在庫と取り置き。
- イベント。
- 経費。

商品は名前、価格、ジャンル、有効/無効を編集できる。セットは名前、価格、構成商品の数量を編集できる。在庫は初期在庫、取り置き数、任意の取り置きメモ、動的に計算した残在庫を扱う。

### 統計

統計画面は、選択イベントの集計を表示する。

- 総売上。
- 頒布数。
- 平均単価。
- 経費。
- 利益。
- ジャンル比率。
- 商品ランキング。
- 時系列履歴。

キャンセル済み売上は、合計、比率、ランキング、利益から除外する。時系列履歴にはキャンセル済み売上も表示し、取消済みであることが分かるようにする。

### 設定

設定画面には、CSV出力、PWA更新状態、アプリ情報、データ初期化を置く。

データ初期化には、誤操作によるイベント当日データ消失を防ぐため、明示的な確認を必須にする。PWA更新はユーザー操作で実行し、会計中に自動リロードしない。

## CSV出力

MVPでは4種類のCSVを出力する。

### 売上サマリーCSV

1行を1回の会計単位にする。

列:

```csv
saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount
```

### 売上明細CSV

1行を売上明細単位にする。

列:

```csv
saleId,datetime,lineId,kind,refId,displayName,productGenre,unitPrice,quantity,subtotal,canceled,componentProductIds,componentQuantities
```

セット明細はセットとしての情報を残しつつ、構成品IDと数量も保持する。取り置き明細は `kind=reservation` として出力する。

### 商品別展開CSV

商品、セット、取り置きを実際の商品単位に展開し、1行を1商品の動きとして出力する。

列:

```csv
saleId,datetime,lineId,sourceKind,sourceRefId,sourceDisplayName,productId,productName,productGenre,unitQuantity,lineQuantity,totalProductQuantity,canceled
```

このCSVは、表計算で商品別販売数を分析しやすくするためのもの。たとえば、新刊1冊と缶バッジ1個を含むセットは、商品別展開CSVでは2行になる。

### 経費CSV

1行を1件の経費単位にする。

列:

```csv
expenseId,eventId,category,payee,amount,memo
```

## PWA挙動

`vite-plugin-pwa` を使い、インストール可能、オフライン起動可能、App Shellキャッシュありの構成にする。

更新がある場合は、設定画面または共通通知領域にユーザー操作の更新ボタンを出す。会計画面の操作中に強制リロードしない。データはIndexedDBに保存され、初回読み込み後はオフラインでも利用できることを前提にする。

## デプロイとCI/CD

ビルド後の静的ファイルはGitHub Pagesへデプロイする。公開方式はProject Pagesとし、想定URLは次の形にする。

```txt
https://KeiM2120.github.io/event-sales-manager-pwa/
```

ViteはGitHub Pagesのサブパス配信に合わせて、`base: "/event-sales-manager-pwa/"` を設定する。PWA manifest、Service Worker、静的アセットもこのサブパス配下で正しく解決される必要がある。

GitHub Actionsは、`main` ブランチへのpushで本番デプロイする。基本のCI/CDフローは次の通り。

1. 依存関係を `npm ci` でインストールする。
2. `npm run lint` を実行する。
3. `npm run test` を実行する。
4. `npm run build` を実行する。
5. すべて成功した場合のみ、`dist/` をGitHub Pages artifactとしてアップロードする。
6. GitHub公式ActionsでPagesへデプロイする。

使用するActionsは公式構成を前提にする。

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

`gh-pages` ブランチへpushする方式は使わない。GitHub Pagesの設定は、GitHub Actionsからデプロイする構成にする。

Pull Requestを使う場合、PRではlint、test、buildのみを実行し、Pagesへのデプロイは行わない。Pagesデプロイは `main` へのpushに限定する。必要に応じて、手動再デプロイ用に `workflow_dispatch` も有効にする。

PWA更新時の注意点として、`main` へpushして新しいビルドが配信されても、会計中に自動でリロードしない。既存のPWA更新方針に従い、更新通知を表示し、ユーザー操作で更新する。

## エラー処理

エラーメッセージは短く、現場で判断しやすいものにする。対象の商品名と必要数が分かる表現を優先する。

例:

- `在庫が不足しています: 新刊 残り1 / 必要2`
- `取り置き数が不足しています: 新刊 残り1 / 必要2`
- `保存できませんでした。もう一度試してください。`

IndexedDBの書き込み失敗やPWA更新失敗は、可能な範囲で再試行できるようにする。

## テストと検証

ドメインロジックのテストを優先する。

- 残在庫計算。
- セット展開。
- 取り置き受け渡しの検証と取り置き数の減算。
- キャンセル済み売上の除外。
- 統計集計。
- CSV行生成。

会計reducerのテストでは次を確認する。

- 商品、セット、取り置き明細の追加。
- 数量の増減。
- 数量が `0` になった明細の削除。
- 会計のクリア。

実装完了前に、利用可能な検証スクリプトを実行する。

```bash
npm run build
npm run lint
npm run test
```

テストスイートがある場合は、関連するテストも実行する。

## 完了条件

MVPは次を満たしたら完了とする。

- アプリをPWAとして開く、またはインストールできる。
- 初回読み込み後、オフラインで起動できる。
- ホームからイベントを作成できる。
- 商品、セット、在庫、取り置き、経費を手入力できる。
- イベントを選択し、通常商品、セット、`取り置き: 商品名` の受け渡しを会計できる。
- 会計保存前に在庫を検証する。
- 取り置き受け渡しは、同じtransaction内でSale作成と `reservedStock` 減算を行う。
- Undoは最新の売上を物理削除せず、キャンセル済みにする。
- 統計はキャンセル済み売上を除外する。
- 売上サマリー、売上明細、商品別展開、経費CSVを出力できる。
- PWA更新通知が表示され、ユーザー操作で更新できる。
- `main` へのpushでGitHub Actionsがlint、test、buildを実行し、成功時のみGitHub Pagesへデプロイできる。
