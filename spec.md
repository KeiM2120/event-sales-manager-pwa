# コミックマーケット向け頒布管理PWA プロトタイプ実装指示

## 概要

スマートフォン向けPWAとして動作する、即売会向け頒布管理アプリケーションのプロトタイプを作成する。

主用途は以下。

* 同人誌即売会での頒布会計
* 在庫管理
* 取り置き管理
* 売上統計確認

完全オフライン動作を前提とし、単一端末運用とする。

---

# 技術スタック

## Frontend

* React
* TypeScript
* Vite

## UI

* TailwindCSS

## State

* React useReducer
* React Context（必要最低限）

## Storage

* Dexie
* IndexedDB

## PWA

* vite-plugin-pwa

## Utility

* crypto.randomUUID()

---

# 対応環境

## 正規対応

* Android Chrome

## 準対応

* Android Firefox

---

# アプリ設計思想

* 完全オフライン動作
* 単一端末運用
* 即売会現場での高速操作優先
* 片手操作前提
* 大ボタンUI
* 状態よりイベントログ重視
* remainingStockは保存しない
* 在庫は動的計算

---

# IndexedDB / Dexie schema

```ts
this.version(1).stores({
  events:
    "id,eventDate,series",

  products:
    "id,name,productGenre,isActive",

  bundles:
    "id,name,isActive",

  bundleItems:
    "[bundleId+productId],bundleId,productId",

  eventInventories:
    "[eventId+productId],eventId,productId",

  sales:
    "id,[eventId+datetime],eventId,datetime,canceled",

  expenses:
    "id,eventId,category",
})
```

---

# Domain Models

## Event

```ts
interface Event {
  id: string
  name: string
  eventDate: string
  series: Series
  memo?: string
}
```

---

## Product

```ts
interface Product {
  id: string
  name: string
  productGenre: ProductGenre
  defaultPrice: number
  isActive: boolean
}
```

---

## Bundle

```ts
interface Bundle {
  id: string
  name: string
  price: number
  isActive: boolean
}
```

---

## BundleItem

```ts
interface BundleItem {
  bundleId: string
  productId: string
  quantity: number
}
```

---

## EventInventory

```ts
interface EventInventory {
  eventId: string
  productId: string
  initialStock: number
  reservedStock: number
}
```

---

## Sale

```ts
interface Sale {
  id: string
  eventId: string
  datetime: string
  totalAmount: number
  canceled: boolean
  lines: SaleLine[]
}
```

---

## SaleLine

```ts
interface SaleLine {
  lineId: string

  kind: "product" | "bundle"

  refId: string

  displayName: string

  productGenre: ProductGenre

  unitPrice: number

  quantity: number

  subtotal: number

  components?: SaleLineComponent[]
}
```

---

## SaleLineComponent

```ts
interface SaleLineComponent {
  productId: string
  quantity: number
}
```

---

## Expense

```ts
interface Expense {
  id: string
  eventId: string
  category: ExpenseCategory
  payee: string
  amount: number
  memo?: string
}
```

---

# 在庫計算仕様

remainingStockはDB保存しない。

毎回以下で算出する。

```ts
remainingStock =
initialStock
- reservedStock
- soldCount
```

soldCountは canceled=false の Sale から集計する。

---

# 取り置き仕様

## 基本

* reservedStock で管理
* 個人単位管理は不要

## 取り置き受渡時

以下を行う。

```text
reservedStock--
Sale生成
```

つまり、取り置きも売上統計には含める。

---

# 会計仕様

## Checkout state

React state(useReducer)で保持。

永続化不要。

## CheckoutState

```ts
interface CheckoutState {
  eventId: string
  lines: CheckoutLine[]
  totalQuantity: number
  totalAmount: number
}
```

## CheckoutLine

```ts
interface CheckoutLine {
  lineId: string

  kind: "product" | "bundle"

  refId: string

  displayName: string

  productGenre: ProductGenre

  unitPrice: number

  quantity: number

  subtotal: number

  components?: CheckoutLineComponent[]
}
```

---

# 会計フロー

```text
商品タップ
↓
Checkout state更新
↓
会計確定
↓
在庫再確認
↓
Sale生成
↓
IndexedDB保存
↓
Checkout state初期化
```

---

# Bundle仕様

Bundle追加時は内部展開して在庫確認する。

例：

```text
新刊セット
=
新刊 x1
缶バッジ x1
```

在庫確認時はcomponentsを全確認する。

---

# Undo仕様

* 全Sale cancel可能
* 物理削除なし
* canceled=true で管理

## cancel時

在庫戻し処理は行わない。

在庫は Sale 再集計で算出する。

---

# UI構成

## Bottom Navigation

```text
会計
統計
管理
設定
```

---

# 会計画面

## Header

表示内容：

* イベント名
* 現在時刻

---

## Product Area

### 仕様

* 画面上部
* flex-grow
* overflow-y auto
* 2列 grid
* 大ボタン

### 商品ボタン表示

```text
商品名
¥価格
残数
```

### 売り切れ

* disabled
* 赤背景
* 半透明

---

## Checkout Summary

表示：

```text
商品名 x数量 小計
```

スクロール可能。

### 操作

* tap: quantity--
* long press: line削除

---

## Action Bar

3分割。

```text
[クリア]
[Undo]
[確定]
```

### Button仕様

* 高さ64px以上
* 確定ボタンは強調表示

---

# 管理画面

## タブ

```text
商品
セット
在庫
イベント
経費
```

---

## 商品管理

一覧表示：

* 名前
* 価格
* ジャンル
* 有効/無効

### 編集

* modal形式

---

## セット管理

表示：

* セット名
* 価格
* 構成一覧

---

## 在庫管理

表示：

```text
商品名
初期在庫
取り置き
残数
```

---

# 統計画面

## 上部サマリー

表示：

* 総売上
* 頒布数
* 平均単価
* 経費
* 利益

---

## ジャンル比率

横棒グラフ風UI。

個数優先。

---

## 商品ランキング

```text
1位 商品名 数量
```

---

## 時系列履歴

表示：

```text
11:32 ¥1500
```

タップで詳細。

---

# Export / Import

## JSON Export

全DB内容をexport。

対象：

* events
* products
* bundles
* bundleItems
* eventInventories
* sales
* expenses

---

## CSV Export

以下を出力。

* 会計CSV
* 明細CSV
* 経費CSV

---

# PWA要件

* install可能
* offline動作
* App Shell caching
* 起動高速化

---

# 非目標

以下は現段階では不要。

* Firebase
* 複数端末同期
* 認証
* クラウド同期
* リアルタイム通信
* レシートプリンタ
* QRコード決済
* バーコード
* iOS最適化

---

# 実装優先順位

1. Dexie setup
2. Domain models
3. Checkout reducer
4. 会計画面
5. Sale保存処理
6. 在庫計算
7. 管理画面
8. 統計画面
9. Export機能
10. PWA化

---

# コーディング方針

* 関数責務を小さく分離
* derived dataは保存しない
* snapshotを重視
* React componentは肥大化させない
* business logicをhooks/componentsに埋め込まない
* utility関数へ切り出す
* any禁止
* TypeScript strict前提
* UIよりロジック安定性優先
