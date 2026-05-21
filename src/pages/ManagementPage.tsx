import { useEffect, useState, type FormEvent } from "react";
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
  Sale,
  Series,
} from "../domain/types";

export type ManagementSection =
  | "products"
  | "bundles"
  | "inventory"
  | "events"
  | "expenses";

interface ManagementPageProps {
  database?: EventSalesDatabase;
  initialSection?: ManagementSection;
  notice?: string | null;
}

interface BundleComponentDraft {
  id: string;
  productId: string;
  quantity: number;
}

interface InventoryDraftKey {
  eventId: string;
  productId: string;
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

export function ManagementPage({
  database = appDatabase,
  initialSection = "products",
  notice = null,
}: ManagementPageProps) {
  const [section, setSection] = useState<ManagementSection>(initialSection);
  const products =
    (useLiveQuery(() => database.products.toArray(), [database]) as
      | Product[]
      | undefined) ?? [];
  const eventRecords =
    (useLiveQuery(() => database.events.toArray(), [database]) as
      | Event[]
      | undefined) ?? [];
  const events = eventRecords.filter((event) => !event.isHidden);
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
  const sales =
    (useLiveQuery(() => database.sales.toArray(), [database]) as Sale[] | undefined) ??
    [];

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">管理</h1>
      {notice && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          {notice}
        </p>
      )}
      <SectionTabs value={section} items={sections} onChange={setSection} />
      {section === "products" && (
        <ProductsPanel
          database={database}
          bundleItems={bundleItems}
          events={eventRecords}
          inventories={inventories}
          products={products}
          sales={sales}
        />
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
  bundleItems,
  database,
  events,
  inventories,
  products,
  sales,
}: {
  bundleItems: BundleItem[];
  database: EventSalesDatabase;
  events: Event[];
  inventories: EventInventory[];
  products: Product[];
  sales: Sale[];
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [productGenre, setProductGenre] = useState<ProductGenre>("book");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productNotice, setProductNotice] = useState<string | null>(null);

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await database.products.put({
      id: editingProductId ?? createId("product"),
      name: name.trim(),
      productGenre,
      defaultPrice: price,
      isActive: true,
    });
    setProductNotice(null);
    resetProductForm();
  }

  function startEditingProduct(product: Product) {
    setEditingProductId(product.id);
    setName(product.name);
    setPrice(product.defaultPrice);
    setProductGenre(product.productGenre);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setName("");
    setPrice(0);
    setProductGenre("book");
  }

  async function deleteProduct(productId: string) {
    if (inventories.some((inventory) => inventory.productId === productId)) {
      setProductNotice("在庫で使われている商品は削除できません。");
      return;
    }

    if (bundleItems.some((item) => item.productId === productId)) {
      setProductNotice("セットで使われている商品は削除できません。");
      return;
    }

    const closedEventIds = new Set(
      events.filter((event) => event.isClosed).map((event) => event.id),
    );
    const hasClosedEventSale = sales.some(
      (sale) =>
        !sale.canceled &&
        closedEventIds.has(sale.eventId) &&
        sale.lines.some((line) => saleLineIncludesProduct(line, productId)),
    );
    if (hasClosedEventSale) {
      setProductNotice("終了済みイベントの売上に含まれる商品は削除できません。");
      return;
    }

    if (editingProductId === productId) {
      resetProductForm();
    }

    setProductNotice(null);
    await database.products.delete(productId);
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">商品</h2>
      {productNotice && <NoticeMessage tone="warning" message={productNotice} />}
      <form className="grid gap-3" onSubmit={addProduct}>
        <TextField label="商品名" value={name} onChange={setName} />
        <NumberInput label="価格" value={price} onChange={setPrice} />
        <SelectField
          label="ジャンル"
          value={productGenre}
          options={productGenres}
          onChange={(value) => setProductGenre(value as ProductGenre)}
        />
        <SubmitButton label={editingProductId ? "商品を更新" : "商品を追加"} />
        {editingProductId && (
          <button
            type="button"
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            onClick={resetProductForm}
          >
            編集をキャンセル
          </button>
        )}
      </form>
      <ActionList
        emptyText="商品はまだありません。"
        items={products.map((product) => ({
          id: product.id,
          label: `${product.name} / ${product.defaultPrice}円`,
          editLabel: `${product.name}を編集`,
          deleteLabel: `${product.name}を削除`,
          onEdit: () => startEditingProduct(product),
          onDelete: () => deleteProduct(product.id),
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
  const [circleSpace, setCircleSpace] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !eventDate) {
      return;
    }

    await database.events.put({
      id: editingEventId ?? createId("event"),
      name: name.trim(),
      eventDate,
      series,
      isClosed,
      ...(circleSpace.trim() ? { circleSpace: circleSpace.trim() } : {}),
    });
    setEventNotice(null);
    resetEventForm();
  }

  function startEditingEvent(event: Event) {
    setEditingEventId(event.id);
    setName(event.name);
    setEventDate(event.eventDate);
    setSeries(event.series);
    setCircleSpace(event.circleSpace ?? "");
    setIsClosed(event.isClosed ?? false);
  }

  function resetEventForm() {
    setEditingEventId(null);
    setName("");
    setEventDate("");
    setSeries("comic-market");
    setCircleSpace("");
    setIsClosed(false);
  }

  async function deleteEvent(eventId: string) {
    if (editingEventId === eventId) {
      resetEventForm();
    }

    await database.events.update(eventId, { isHidden: true });
    setEventNotice(
      "イベントを非表示にしました。売上や経費の履歴は保持されています。",
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">イベント</h2>
      {eventNotice && <NoticeMessage tone="warning" message={eventNotice} />}
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
        <TextField
          label="サークルスペース"
          value={circleSpace}
          onChange={setCircleSpace}
        />
        <CheckboxField
          checked={isClosed}
          label="イベント終了"
          onChange={setIsClosed}
        />
        <SubmitButton label={editingEventId ? "イベントを更新" : "イベントを追加"} />
        {editingEventId && (
          <button
            type="button"
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            onClick={resetEventForm}
          >
            編集をキャンセル
          </button>
        )}
      </form>
      <ActionList
        emptyText="イベントはまだありません。"
        items={events.map((event) => {
          const label = [event.name, event.eventDate, event.circleSpace]
            .filter(Boolean)
            .join(" / ");
          const displayLabel = event.isClosed ? `${label} / 終了済み` : label;

          return {
            id: event.id,
            label: displayLabel,
            editLabel: `${event.name}を編集`,
            deleteLabel: `${event.name}を削除`,
            onEdit: () => startEditingEvent(event),
            onDelete: () => deleteEvent(event.id),
          };
        })}
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
  const [editingInventoryKey, setEditingInventoryKey] =
    useState<InventoryDraftKey | null>(null);

  const selectedEventId = eventId || (events[0]?.id ?? "");
  const selectedProductId = productId || (products[0]?.id ?? "");

  async function addInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || !selectedProductId) {
      return;
    }

    if (
      editingInventoryKey &&
      (editingInventoryKey.eventId !== selectedEventId ||
        editingInventoryKey.productId !== selectedProductId)
    ) {
      await database.eventInventories.delete([
        editingInventoryKey.eventId,
        editingInventoryKey.productId,
      ]);
    }

    await database.eventInventories.put({
      eventId: selectedEventId,
      productId: selectedProductId,
      initialStock,
      reservedStock,
      ...(reservationMemo.trim() ? { reservationMemo: reservationMemo.trim() } : {}),
    });
    resetInventoryForm();
  }

  function startEditingInventory(inventory: EventInventory) {
    setEditingInventoryKey({
      eventId: inventory.eventId,
      productId: inventory.productId,
    });
    setEventId(inventory.eventId);
    setProductId(inventory.productId);
    setInitialStock(inventory.initialStock);
    setReservedStock(inventory.reservedStock);
    setReservationMemo(inventory.reservationMemo ?? "");
  }

  function resetInventoryForm() {
    setEditingInventoryKey(null);
    setEventId("");
    setProductId("");
    setInitialStock(0);
    setReservedStock(0);
    setReservationMemo("");
  }

  async function deleteInventory(inventory: EventInventory) {
    if (
      editingInventoryKey?.eventId === inventory.eventId &&
      editingInventoryKey.productId === inventory.productId
    ) {
      resetInventoryForm();
    }

    await database.eventInventories.delete([inventory.eventId, inventory.productId]);
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
        <SubmitButton label={editingInventoryKey ? "在庫を更新" : "在庫を追加"} />
        {editingInventoryKey && (
          <button
            type="button"
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            onClick={resetInventoryForm}
          >
            編集をキャンセル
          </button>
        )}
      </form>
      <ActionList
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
            editLabel: `${eventName}の在庫を編集`,
            deleteLabel: `${eventName}の在庫を削除`,
            onEdit: () => startEditingInventory(inventory),
            onDelete: () => deleteInventory(inventory),
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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const selectedEventId = eventId || (events[0]?.id ?? "");

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || !payee.trim()) {
      return;
    }

    await database.expenses.put({
      id: editingExpenseId ?? createId("expense"),
      eventId: selectedEventId,
      category,
      payee: payee.trim(),
      amount,
    });
    resetExpenseForm();
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEventId(expense.eventId);
    setCategory(expense.category);
    setPayee(expense.payee);
    setAmount(expense.amount);
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setEventId("");
    setCategory("printing");
    setPayee("");
    setAmount(0);
  }

  async function deleteExpense(expenseId: string) {
    if (editingExpenseId === expenseId) {
      resetExpenseForm();
    }

    await database.expenses.delete(expenseId);
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
        <SubmitButton label={editingExpenseId ? "経費を更新" : "経費を追加"} />
        {editingExpenseId && (
          <button
            type="button"
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            onClick={resetExpenseForm}
          >
            編集をキャンセル
          </button>
        )}
      </form>
      <ActionList
        emptyText="経費はまだありません。"
        items={expenses.map((expense) => ({
          id: expense.id,
          label: `${expense.payee} / ${expense.amount}円`,
          editLabel: `${expense.payee}を編集`,
          deleteLabel: `${expense.payee}を削除`,
          onEdit: () => startEditingExpense(expense),
          onDelete: () => deleteExpense(expense.id),
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
  const [components, setComponents] = useState<BundleComponentDraft[]>(() => [
    createBundleComponentDraft(),
  ]);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);

  function updateComponentProduct(id: string, productId: string) {
    setComponents((currentComponents) =>
      currentComponents.map((component) =>
        component.id === id ? { ...component, productId } : component,
      ),
    );
  }

  function updateComponentQuantity(id: string, quantity: number) {
    setComponents((currentComponents) =>
      currentComponents.map((component) =>
        component.id === id ? { ...component, quantity } : component,
      ),
    );
  }

  function addComponent() {
    setComponents((currentComponents) => [
      ...currentComponents,
      createBundleComponentDraft(),
    ]);
  }

  function removeComponent(id: string) {
    setComponents((currentComponents) =>
      currentComponents.filter((component) => component.id !== id),
    );
  }

  async function addBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const bundleId = editingBundleId ?? createId("bundle");
    const fallbackProductId = products[0]?.id ?? "";
    const componentQuantities = new Map<string, number>();
    for (const component of components) {
      const productId = component.productId || fallbackProductId;
      if (productId) {
        componentQuantities.set(
          productId,
          (componentQuantities.get(productId) ?? 0) + component.quantity,
        );
      }
    }

    await database.transaction("rw", database.bundles, database.bundleItems, async () => {
      await database.bundles.put({
        id: bundleId,
        name: name.trim(),
        price,
        isActive: true,
      });

      if (editingBundleId) {
        await database.bundleItems.where("bundleId").equals(bundleId).delete();
      }

      for (const [productId, quantity] of componentQuantities) {
        await database.bundleItems.add({
          bundleId,
          productId,
          quantity,
        });
      }
    });
    resetBundleForm();
  }

  function startEditingBundle(bundle: Bundle) {
    const bundleComponents = bundleItems
      .filter((item) => item.bundleId === bundle.id)
      .map((item) => ({
        id: createBundleComponentDraft().id,
        productId: item.productId,
        quantity: item.quantity,
      }));

    setEditingBundleId(bundle.id);
    setName(bundle.name);
    setPrice(bundle.price);
    setComponents(
      bundleComponents.length > 0 ? bundleComponents : [createBundleComponentDraft()],
    );
  }

  function resetBundleForm() {
    setEditingBundleId(null);
    setName("");
    setPrice(0);
    setComponents([createBundleComponentDraft()]);
  }

  async function deleteBundle(bundleId: string) {
    if (editingBundleId === bundleId) {
      resetBundleForm();
    }

    await database.transaction("rw", database.bundles, database.bundleItems, async () => {
      await database.bundleItems.where("bundleId").equals(bundleId).delete();
      await database.bundles.delete(bundleId);
    });
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">セット</h2>
      <form className="grid gap-3" onSubmit={addBundle}>
        <TextField label="セット名" value={name} onChange={setName} />
        <NumberInput label="セット価格" value={price} onChange={setPrice} />
        <div className="space-y-2" aria-label="構成商品一覧">
          {components.map((component, index) => {
            const rowNumber = index + 1;
            const selectedProductId = component.productId || (products[0]?.id ?? "");

            return (
              <div
                key={component.id}
                className="grid gap-2 rounded-md bg-slate-100 p-3"
              >
                <SelectField
                  label={`構成商品${rowNumber}`}
                  value={selectedProductId}
                  options={products.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  onChange={(productId) =>
                    updateComponentProduct(component.id, productId)
                  }
                />
                <NumberInput
                  label={`構成数量${rowNumber}`}
                  value={component.quantity}
                  onChange={(quantity) =>
                    updateComponentQuantity(component.id, quantity)
                  }
                />
                {components.length > 1 && (
                  <button
                    type="button"
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"
                    onClick={() => removeComponent(component.id)}
                  >
                    構成商品{rowNumber}を取り消し
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
            onClick={addComponent}
          >
            構成商品を追加
          </button>
        </div>
        <SubmitButton label={editingBundleId ? "セットを更新" : "セットを追加"} />
        {editingBundleId && (
          <button
            type="button"
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            onClick={resetBundleForm}
          >
            編集をキャンセル
          </button>
        )}
      </form>
      <ActionList
        emptyText="セットはまだありません。"
        items={bundles.map((bundle) => {
          const componentLabels = bundleItems
            .filter((item) => item.bundleId === bundle.id)
            .map((componentItem) => {
              const componentName =
                products.find((item) => item.id === componentItem.productId)?.name ??
                componentItem.productId;

              return `${componentName} x${componentItem.quantity}`;
            });

          return {
            id: bundle.id,
            label: componentLabels.length > 0
              ? `${bundle.name} / ${bundle.price}円 / ${componentLabels.join(", ")}`
              : `${bundle.name} / ${bundle.price}円`,
            editLabel: `${bundle.name}を編集`,
            deleteLabel: `${bundle.name}を削除`,
            onEdit: () => startEditingBundle(bundle),
            onDelete: () => deleteBundle(bundle.id),
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

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-md border px-3">
      <input
        checked={checked}
        className="h-5 w-5"
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="text-sm font-bold">{label}</span>
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

function NoticeMessage({
  message,
  tone,
}: {
  message: string;
  tone: "warning";
}) {
  const className =
    tone === "warning"
      ? "rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900"
      : "";

  return (
    <p className={className} role="status">
      {message}
    </p>
  );
}

function ActionList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{
    id: string;
    label: string;
    editLabel: string;
    deleteLabel: string;
    onEdit: () => void;
    onDelete: () => void;
  }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="grid items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
        >
          <span className="flex items-center">{item.label}</span>
          <span className="grid grid-cols-2 items-center gap-2">
            <button
              type="button"
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 font-bold text-slate-800"
              aria-label={item.editLabel}
              onClick={item.onEdit}
            >
              編集
            </button>
            <button
              type="button"
              className="min-h-10 rounded-md border border-red-200 bg-white px-3 font-bold text-red-700"
              aria-label={item.deleteLabel}
              onClick={item.onDelete}
            >
              削除
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function saleLineIncludesProduct(line: Sale["lines"][number], productId: string): boolean {
  if ((line.kind === "product" || line.kind === "reservation") && line.refId === productId) {
    return true;
  }

  return line.components?.some((component) => component.productId === productId) ?? false;
}

function createBundleComponentDraft(): BundleComponentDraft {
  return {
    id: createId("bundle-component"),
    productId: "",
    quantity: 1,
  };
}
