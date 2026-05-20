import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { SectionTabs } from "../components/SectionTabs";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  ExpenseCategory,
  Product,
  ProductGenre,
  Series,
} from "../domain/types";

type ManagementSection = "products" | "bundles" | "inventory" | "events" | "expenses";

interface ManagementPageProps {
  database?: EventSalesDatabase;
}

const sections: Array<{ value: ManagementSection; label: string }> = [
  { value: "events", label: "イベント" },
  { value: "products", label: "商品" },
  { value: "bundles", label: "セット" },
  { value: "inventory", label: "在庫" },
  { value: "expenses", label: "経費" },
];

const productGenres: Array<{ value: ProductGenre; label: string }> = [
  { value: "book", label: "本" },
  { value: "goods", label: "グッズ" },
  { value: "music", label: "音楽" },
  { value: "software", label: "ソフト" },
  { value: "other", label: "その他" },
];

const seriesOptions: Array<{ value: Series; label: string }> = [
  { value: "comic-market", label: "コミックマーケット" },
  { value: "m3", label: "M3" },
  { value: "techbookfest", label: "技術書典" },
  { value: "other", label: "その他" },
];

const expenseCategories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "printing", label: "印刷費" },
  { value: "transport", label: "交通費" },
  { value: "space", label: "参加費" },
  { value: "supply", label: "備品費" },
  { value: "other", label: "その他" },
];

export function ManagementPage({ database = appDatabase }: ManagementPageProps) {
  const [section, setSection] = useState<ManagementSection>("products");
  const products =
    (useLiveQuery(() => database.products.toArray(), [database]) as
      | Product[]
      | undefined) ?? [];
  const events =
    (useLiveQuery(() => database.events.toArray(), [database]) as
      | Event[]
      | undefined) ?? [];
  const bundles =
    (useLiveQuery(() => database.bundles.toArray(), [database]) as
      | Bundle[]
      | undefined) ?? [];
  const bundleItems =
    (useLiveQuery(() => database.bundleItems.toArray(), [database]) as
      | BundleItem[]
      | undefined) ?? [];
  const inventories =
    (useLiveQuery(() => database.eventInventories.toArray(), [database]) as
      | EventInventory[]
      | undefined) ?? [];
  const expenses =
    (useLiveQuery(() => database.expenses.toArray(), [database]) as
      | Expense[]
      | undefined) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">管理</h1>
      <SectionTabs value={section} items={sections} onChange={setSection} />
      {section === "products" && (
        <ProductsPanel database={database} products={products} />
      )}
      {section === "events" && <EventsPanel database={database} events={events} />}
      {section === "inventory" && (
        <InventoryPanel
          database={database}
          events={events}
          inventories={inventories}
          products={products}
        />
      )}
      {section === "expenses" && (
        <ExpensesPanel database={database} events={events} expenses={expenses} />
      )}
      {section === "bundles" && (
        <BundlesPanel
          database={database}
          bundleItems={bundleItems}
          bundles={bundles}
          products={products}
        />
      )}
    </div>
  );
}

function ProductsPanel({
  database,
  products,
}: {
  database: EventSalesDatabase;
  products: Product[];
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [productGenre, setProductGenre] = useState<ProductGenre>("book");

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await database.products.add({
      id: createId("product"),
      name: name.trim(),
      productGenre,
      defaultPrice: price,
      isActive: true,
    });
    setName("");
    setPrice(0);
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">商品</h2>
      <form className="grid gap-3" onSubmit={addProduct}>
        <TextField label="商品名" value={name} onChange={setName} />
        <NumberInput label="価格" value={price} onChange={setPrice} />
        <SelectField
          label="ジャンル"
          value={productGenre}
          options={productGenres}
          onChange={(value) => setProductGenre(value as ProductGenre)}
        />
        <SubmitButton label="商品を追加" />
      </form>
      <List
        emptyText="商品はまだありません。"
        items={products.map((product) => ({
          id: product.id,
          label: `${product.name} / ${product.defaultPrice}円`,
        }))}
      />
    </section>
  );
}

function EventsPanel({
  database,
  events,
}: {
  database: EventSalesDatabase;
  events: Event[];
}) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [series, setSeries] = useState<Series>("comic-market");

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !eventDate) {
      return;
    }

    await database.events.add({
      id: createId("event"),
      name: name.trim(),
      eventDate,
      series,
    });
    setName("");
    setEventDate("");
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">イベント</h2>
      <form className="grid gap-3" onSubmit={addEvent}>
        <TextField label="イベント名" value={name} onChange={setName} />
        <TextField
          label="開催日"
          type="date"
          value={eventDate}
          onChange={setEventDate}
        />
        <SelectField
          label="種別"
          value={series}
          options={seriesOptions}
          onChange={(value) => setSeries(value as Series)}
        />
        <SubmitButton label="イベントを追加" />
      </form>
      <List
        emptyText="イベントはまだありません。"
        items={events.map((item) => ({
          id: item.id,
          label: `${item.name} / ${item.eventDate}`,
        }))}
      />
    </section>
  );
}

function InventoryPanel({
  database,
  events,
  inventories,
  products,
}: {
  database: EventSalesDatabase;
  events: Event[];
  inventories: EventInventory[];
  products: Product[];
}) {
  const [eventId, setEventId] = useState("");
  const [productId, setProductId] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const [reservedStock, setReservedStock] = useState(0);
  const [reservationMemo, setReservationMemo] = useState("");

  const selectedEventId = eventId || (events[0]?.id ?? "");
  const selectedProductId = productId || (products[0]?.id ?? "");

  async function addInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || !selectedProductId) {
      return;
    }

    await database.eventInventories.put({
      eventId: selectedEventId,
      productId: selectedProductId,
      initialStock,
      reservedStock,
      ...(reservationMemo.trim() ? { reservationMemo: reservationMemo.trim() } : {}),
    });
    setInitialStock(0);
    setReservedStock(0);
    setReservationMemo("");
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">在庫</h2>
      <form className="grid gap-3" onSubmit={addInventory}>
        <SelectField
          label="対象イベント"
          value={selectedEventId}
          options={events.map((item) => ({ value: item.id, label: item.name }))}
          onChange={setEventId}
        />
        <SelectField
          label="対象商品"
          value={selectedProductId}
          options={products.map((item) => ({ value: item.id, label: item.name }))}
          onChange={setProductId}
        />
        <NumberInput label="初期在庫" value={initialStock} onChange={setInitialStock} />
        <NumberInput label="取り置き数" value={reservedStock} onChange={setReservedStock} />
        <TextField
          label="取り置きメモ"
          value={reservationMemo}
          onChange={setReservationMemo}
        />
        <SubmitButton label="在庫を追加" />
      </form>
      <List
        emptyText="在庫はまだありません。"
        items={inventories.map((inventory) => {
          const eventName =
            events.find((item) => item.id === inventory.eventId)?.name ??
            inventory.eventId;
          const productName =
            products.find((item) => item.id === inventory.productId)?.name ??
            inventory.productId;

          return {
            id: `${inventory.eventId}:${inventory.productId}`,
            label: [
              `${eventName} / ${productName} / 在庫${inventory.initialStock} / 取置${inventory.reservedStock}`,
              inventory.reservationMemo,
            ]
              .filter(Boolean)
              .join(" / "),
          };
        })}
      />
    </section>
  );
}

function ExpensesPanel({
  database,
  events,
  expenses,
}: {
  database: EventSalesDatabase;
  events: Event[];
  expenses: Expense[];
}) {
  const [eventId, setEventId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("printing");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState(0);
  const selectedEventId = eventId || (events[0]?.id ?? "");

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || !payee.trim()) {
      return;
    }

    await database.expenses.add({
      id: createId("expense"),
      eventId: selectedEventId,
      category,
      payee: payee.trim(),
      amount,
    });
    setPayee("");
    setAmount(0);
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">経費</h2>
      <form className="grid gap-3" onSubmit={addExpense}>
        <SelectField
          label="対象イベント"
          value={selectedEventId}
          options={events.map((item) => ({ value: item.id, label: item.name }))}
          onChange={setEventId}
        />
        <SelectField
          label="カテゴリ"
          value={category}
          options={expenseCategories}
          onChange={(value) => setCategory(value as ExpenseCategory)}
        />
        <TextField label="支払先" value={payee} onChange={setPayee} />
        <NumberInput label="金額" value={amount} onChange={setAmount} />
        <SubmitButton label="経費を追加" />
      </form>
      <List
        emptyText="経費はまだありません。"
        items={expenses.map((expense) => ({
          id: expense.id,
          label: `${expense.payee} / ${expense.amount}円`,
        }))}
      />
    </section>
  );
}

function BundlesPanel({
  database,
  bundleItems,
  bundles,
  products,
}: {
  database: EventSalesDatabase;
  bundleItems: BundleItem[];
  bundles: Bundle[];
  products: Product[];
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [productId, setProductId] = useState("");
  const [componentQuantity, setComponentQuantity] = useState(1);
  const selectedProductId = productId || (products[0]?.id ?? "");

  async function addBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const bundleId = createId("bundle");
    await database.transaction("rw", database.bundles, database.bundleItems, async () => {
      await database.bundles.add({
        id: bundleId,
        name: name.trim(),
        price,
        isActive: true,
      });

      if (selectedProductId) {
        await database.bundleItems.add({
          bundleId,
          productId: selectedProductId,
          quantity: componentQuantity,
        });
      }
    });
    setName("");
    setPrice(0);
    setComponentQuantity(1);
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">セット</h2>
      <form className="grid gap-3" onSubmit={addBundle}>
        <TextField label="セット名" value={name} onChange={setName} />
        <NumberInput label="セット価格" value={price} onChange={setPrice} />
        <SelectField
          label="構成商品"
          value={selectedProductId}
          options={products.map((item) => ({ value: item.id, label: item.name }))}
          onChange={setProductId}
        />
        <NumberInput
          label="構成数量"
          value={componentQuantity}
          onChange={setComponentQuantity}
        />
        <SubmitButton label="セットを追加" />
      </form>
      <List
        emptyText="セットはまだありません。"
        items={bundles.map((bundle) => {
          const componentItem = bundleItems.find(
            (item) => item.bundleId === bundle.id,
          );
          const component = products.find(
            (item) => item.id === componentItem?.productId,
          );
          return {
            id: bundle.id,
            label: component && componentItem
              ? `${bundle.name} / ${bundle.price}円 / ${component.name} x${componentItem.quantity}`
              : `${bundle.name} / ${bundle.price}円`,
          };
        })}
      />
    </section>
  );
}

function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-1 min-h-12 w-full rounded-md border px-3"
      />
    </label>
  );
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="mt-1 min-h-12 w-full rounded-md border px-3"
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-1 min-h-12 w-full rounded-md border bg-white px-3"
      >
        {options.length === 0 && <option value="">未登録</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="min-h-12 rounded-md bg-slate-900 px-4 font-bold text-white"
    >
      {label}
    </button>
  );
}

function List({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{ id: string; label: string }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-md bg-slate-100 px-3 py-2 text-sm">
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
