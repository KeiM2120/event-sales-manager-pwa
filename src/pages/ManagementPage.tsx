import { Children, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { InlineActionButton, PrimaryActionBar, StatusChip } from "../components/DesignSystem";
import { Modal } from "../components/Modal";
import { NumberField } from "../components/NumberField";
import { SectionTabs } from "../components/SectionTabs";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import { calculateBundleAvailability } from "../domain/inventory";
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

type ModalMode = "create" | "edit" | null;
type CardTone = "sub" | "accent" | "neutral" | "muted";

const sections: Array<{ value: ManagementSection; label: string }> = [
  { value: "events", label: "イベント" },
  { value: "products", label: "頒布物" },
  { value: "bundles", label: "セット" },
  { value: "inventory", label: "在庫" },
  { value: "expenses", label: "経費" },
];

const productGenres: Array<{ value: ProductGenre; label: string }> = [
  { value: "doujinshi-illustration", label: "同人誌/イラスト" },
  { value: "doujinshi-manga", label: "同人誌/マンガ" },
  { value: "doujinshi-anthology", label: "同人誌/合同" },
  { value: "doujinshi-other", label: "同人誌/その他" },
  { value: "goods-acrylic", label: "グッズ/アクリル" },
  { value: "goods-paper", label: "グッズ/紙" },
  { value: "goods-sticker", label: "グッズ/ステッカー" },
  { value: "goods-fabric", label: "グッズ/布" },
  { value: "goods-other", label: "グッズ/その他" },
  { value: "digital", label: "デジタル頒布物" },
  { value: "other", label: "その他" },
];

const seriesOptions: Array<{ value: Series; label: string }> = [
  { value: "comic-market", label: "コミックマーケット" },
  { value: "doujin-original", label: "同人イベント一次創作" },
  { value: "doujin-secondary-only", label: "同人イベント二次創作/オンリー" },
  { value: "other", label: "その他" },
];

const expenseCategories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "printing", label: "印刷費" },
  { value: "goods-production", label: "グッズ作成費" },
  { value: "event-participation", label: "イベント参加費" },
  { value: "transport", label: "交通費" },
  { value: "lodging", label: "宿泊・滞在費" },
  { value: "shipping", label: "搬出入費" },
  { value: "booth-supply", label: "ブース用備品" },
  { value: "food", label: "飲食費" },
  { value: "promotion", label: "宣伝・販売費" },
  { value: "outsourcing", label: "外注費" },
  { value: "other", label: "その他" },
];

const cardToneClasses: Record<CardTone, string> = {
  sub: "border-l-[color:var(--color-sub)] bg-white",
  accent: "border-l-[color:var(--color-accent)] bg-white",
  neutral: "border-l-slate-300 bg-white",
  muted: "border-l-slate-300 bg-slate-100 text-slate-500",
};

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
    <div className="space-y-4 pb-24">
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
          bundleItems={bundleItems}
          bundles={bundles}
          events={events}
          inventories={inventories}
          products={products}
          sales={sales}
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
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [productGenre, setProductGenre] = useState<ProductGenre>(
    "doujinshi-illustration",
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
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
    closeModal();
  }

  function openAddModal() {
    resetForm();
    setModalMode("create");
  }

  function startEditingProduct(product: Product) {
    setEditingProductId(product.id);
    setName(product.name);
    setPrice(product.defaultPrice);
    setProductGenre(product.productGenre);
    setModalMode("edit");
  }

  function resetForm() {
    setEditingProductId(null);
    setName("");
    setPrice(0);
    setProductGenre("doujinshi-illustration");
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function deleteProduct(productId: string) {
    if (editingProductId === productId) {
      closeModal();
    }

    await database.products.delete(productId);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">頒布物</h2>
      <CardList emptyText="頒布物はまだありません。">
        {products.map((product) => {
          const deleteReason = getProductDeleteBlocker({
            bundleItems,
            events,
            inventories,
            productId: product.id,
            sales,
          });

          return (
            <ManagementCard
              key={product.id}
              title={product.name}
              tone="sub"
              meta={
                <>
                  <span>{formatYen(product.defaultPrice)}</span>
                  <span>{getProductGenreLabel(product.productGenre)}</span>
                </>
              }
              deleteReason={deleteReason}
              editLabel={`${product.name}を編集`}
              deleteLabel={`${product.name}を削除`}
              onEdit={() => startEditingProduct(product)}
              onDelete={() => deleteProduct(product.id)}
            />
          );
        })}
      </CardList>
      <FixedAddAction label="頒布物を追加" onClick={openAddModal} />
      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "頒布物を編集" : "頒布物を追加"}
          onClose={closeModal}
        >
          <form className="grid gap-3" onSubmit={saveProduct}>
            <TextField label="頒布物名" value={name} onChange={setName} />
            <NumberInput label="価格" value={price} onChange={setPrice} />
            <SelectField
              label="ジャンル"
              value={productGenre}
              options={productGenres}
              onChange={(value) => setProductGenre(value as ProductGenre)}
            />
            <SubmitButton label={editingProductId ? "頒布物を更新" : "頒布物を追加"} />
          </form>
        </Modal>
      )}
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
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [series, setSeries] = useState<Series>("comic-market");
  const [circleSpace, setCircleSpace] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
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
    closeModal();
  }

  function openAddModal() {
    resetForm();
    setModalMode("create");
  }

  function startEditingEvent(event: Event) {
    setEditingEventId(event.id);
    setName(event.name);
    setEventDate(event.eventDate);
    setSeries(event.series);
    setCircleSpace(event.circleSpace ?? "");
    setIsClosed(event.isClosed ?? false);
    setModalMode("edit");
  }

  function resetForm() {
    setEditingEventId(null);
    setName("");
    setEventDate("");
    setSeries("comic-market");
    setCircleSpace("");
    setIsClosed(false);
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function deleteEvent(eventId: string) {
    if (editingEventId === eventId) {
      closeModal();
    }

    await database.events.update(eventId, { isHidden: true });
    setEventNotice("イベントを非表示にしました。売上や経費の履歴は削除されません。");
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">イベント</h2>
      {eventNotice && <NoticeMessage message={eventNotice} />}
      <CardList emptyText="イベントはまだありません。">
        {events.map((event) => (
          <ManagementCard
            key={event.id}
            title={event.name}
            tone="neutral"
            meta={
              <>
                <span>{event.eventDate}</span>
                {event.circleSpace ? <span>{event.circleSpace}</span> : null}
                <span>{getSeriesLabel(event.series)}</span>
                {event.isClosed ? <StatusChip tone="muted">終了済み</StatusChip> : null}
              </>
            }
            editLabel={`${event.name}を編集`}
            deleteLabel={`${event.name}を削除`}
            onEdit={() => startEditingEvent(event)}
            onDelete={() => deleteEvent(event.id)}
          />
        ))}
      </CardList>
      <FixedAddAction label="イベントを追加" onClick={openAddModal} />
      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "イベントを編集" : "イベントを追加"}
          onClose={closeModal}
        >
          <form className="grid gap-3" onSubmit={saveEvent}>
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
            <TextField label="スペース" value={circleSpace} onChange={setCircleSpace} />
            {modalMode === "edit" && (
              <CheckboxField
                checked={isClosed}
                label="イベント終了"
                onChange={setIsClosed}
              />
            )}
            <SubmitButton label={editingEventId ? "イベントを更新" : "イベントを追加"} />
          </form>
        </Modal>
      )}
    </section>
  );
}

function InventoryPanel({
  bundleItems,
  bundles,
  database,
  events,
  inventories,
  products,
  sales,
}: {
  bundleItems: BundleItem[];
  bundles: Bundle[];
  database: EventSalesDatabase;
  events: Event[];
  inventories: EventInventory[];
  products: Product[];
  sales: Sale[];
}) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [eventId, setEventId] = useState("");
  const [productId, setProductId] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const [reservedStock, setReservedStock] = useState(0);
  const [reservationMemo, setReservationMemo] = useState("");
  const [editingInventoryKey, setEditingInventoryKey] =
    useState<InventoryDraftKey | null>(null);

  const selectedEventId = eventId || (events[0]?.id ?? "");
  const selectedProductId = productId || (products[0]?.id ?? "");

  async function saveInventory(event: FormEvent<HTMLFormElement>) {
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
    closeModal();
  }

  function openAddModal() {
    resetForm();
    setModalMode("create");
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
    setModalMode("edit");
  }

  function resetForm() {
    setEditingInventoryKey(null);
    setEventId("");
    setProductId("");
    setInitialStock(0);
    setReservedStock(0);
    setReservationMemo("");
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function deleteInventory(inventory: EventInventory) {
    if (
      editingInventoryKey?.eventId === inventory.eventId &&
      editingInventoryKey.productId === inventory.productId
    ) {
      closeModal();
    }

    await database.eventInventories.delete([inventory.eventId, inventory.productId]);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">在庫</h2>
      <CardList emptyText="在庫はまだありません。">
        {inventories.map((inventory) => {
          const eventName = getEventName(events, inventory.eventId);
          const productName = getProductName(products, inventory.productId);

          return (
            <ManagementCard
              key={`${inventory.eventId}:${inventory.productId}`}
              title={`${eventName} / ${productName}`}
              tone="sub"
              meta={
                <>
                  <span>{`在庫${inventory.initialStock} / 取置${inventory.reservedStock}`}</span>
                  {inventory.reservationMemo ? <span>{inventory.reservationMemo}</span> : null}
                </>
              }
              editLabel={`${eventName}の在庫を編集`}
              deleteLabel={`${eventName}の在庫を削除`}
              onEdit={() => startEditingInventory(inventory)}
              onDelete={() => deleteInventory(inventory)}
            />
          );
        })}
        {events.flatMap((event) =>
          bundles
            .filter((bundle) => bundle.isActive)
            .map((bundle) => {
              const eventInventories = inventories.filter(
                (inventory) => inventory.eventId === event.id,
              );
              const eventSales = sales.filter((sale) => sale.eventId === event.id);
              const availability = calculateBundleAvailability({
                bundleId: bundle.id,
                bundleItems,
                inventories: eventInventories,
                sales: eventSales,
              });

              return (
                <li
                  key={`${event.id}:${bundle.id}:availability`}
                  className={[
                    "rounded-lg border-l-[6px] p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200",
                    availability.availableQuantity === 0
                      ? cardToneClasses.muted
                      : cardToneClasses.accent,
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate-one-line text-base font-bold">{bundle.name}</h3>
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-[color:var(--color-muted)]">
                        <span>{event.name}</span>
                        <span>{`取扱可能数 ${availability.availableQuantity}`}</span>
                      </p>
                      <p className="mt-2 text-sm font-medium text-[color:var(--color-muted)]">
                        セット内容はセットタブで編集
                      </p>
                    </div>
                  </div>
                </li>
              );
            }),
        )}
      </CardList>
      <FixedAddAction label="在庫を追加" onClick={openAddModal} />
      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "在庫を編集" : "在庫を追加"}
          onClose={closeModal}
        >
          <form className="grid gap-3" onSubmit={saveInventory}>
            <SelectField
              label="対象イベント"
              value={selectedEventId}
              options={events.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setEventId}
            />
            <SelectField
              label="対象頒布物"
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
          </form>
        </Modal>
      )}
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
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [eventId, setEventId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("printing");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState(0);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const selectedEventId = eventId || (events[0]?.id ?? "");

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
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
    closeModal();
  }

  function openAddModal() {
    resetForm();
    setModalMode("create");
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEventId(expense.eventId);
    setCategory(expense.category);
    setPayee(expense.payee);
    setAmount(expense.amount);
    setModalMode("edit");
  }

  function resetForm() {
    setEditingExpenseId(null);
    setEventId("");
    setCategory("printing");
    setPayee("");
    setAmount(0);
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function deleteExpense(expenseId: string) {
    if (editingExpenseId === expenseId) {
      closeModal();
    }

    await database.expenses.delete(expenseId);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">経費</h2>
      <CardList emptyText="経費はまだありません。">
        {expenses.map((expense) => (
          <ManagementCard
            key={expense.id}
            title={expense.payee}
            tone="neutral"
            meta={
              <>
                <span>{getEventName(events, expense.eventId)}</span>
                <span>{getExpenseCategoryLabel(expense.category)}</span>
                <span>{formatYen(expense.amount)}</span>
              </>
            }
            editLabel={`${expense.payee}を編集`}
            deleteLabel={`${expense.payee}を削除`}
            onEdit={() => startEditingExpense(expense)}
            onDelete={() => deleteExpense(expense.id)}
          />
        ))}
      </CardList>
      <FixedAddAction label="経費を追加" onClick={openAddModal} />
      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "経費を編集" : "経費を追加"}
          onClose={closeModal}
        >
          <form className="grid gap-3" onSubmit={saveExpense}>
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
          </form>
        </Modal>
      )}
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
  const [modalMode, setModalMode] = useState<ModalMode>(null);
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

  async function saveBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const bundleId = editingBundleId ?? createId("bundle");
    const fallbackProductId = products[0]?.id ?? "";
    const componentQuantities = new Map<string, number>();
    for (const component of components) {
      const nextProductId = component.productId || fallbackProductId;
      if (nextProductId) {
        componentQuantities.set(
          nextProductId,
          (componentQuantities.get(nextProductId) ?? 0) + component.quantity,
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

      for (const [nextProductId, quantity] of componentQuantities) {
        await database.bundleItems.add({
          bundleId,
          productId: nextProductId,
          quantity,
        });
      }
    });
    closeModal();
  }

  function openAddModal() {
    resetForm();
    setModalMode("create");
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
    setModalMode("edit");
  }

  function resetForm() {
    setEditingBundleId(null);
    setName("");
    setPrice(0);
    setComponents([createBundleComponentDraft()]);
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function deleteBundle(bundleId: string) {
    if (editingBundleId === bundleId) {
      closeModal();
    }

    await database.transaction("rw", database.bundles, database.bundleItems, async () => {
      await database.bundleItems.where("bundleId").equals(bundleId).delete();
      await database.bundles.delete(bundleId);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">セット</h2>
      <CardList emptyText="セットはまだありません。">
        {bundles.map((bundle) => {
          const componentLabels = bundleItems
            .filter((item) => item.bundleId === bundle.id)
            .map((componentItem) => {
              const componentName = getProductName(products, componentItem.productId);
              return `${componentName} x${componentItem.quantity}`;
            });

          return (
            <ManagementCard
              key={bundle.id}
              title={bundle.name}
              tone="accent"
              meta={
                <>
                  <span>{formatYen(bundle.price)}</span>
                  {componentLabels.length > 0 ? (
                    <span>{componentLabels.join(" / ")}</span>
                  ) : null}
                </>
              }
              editLabel={`${bundle.name}を編集`}
              deleteLabel={`${bundle.name}を削除`}
              onEdit={() => startEditingBundle(bundle)}
              onDelete={() => deleteBundle(bundle.id)}
            />
          );
        })}
      </CardList>
      <FixedAddAction label="セットを追加" onClick={openAddModal} />
      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "セットを編集" : "セットを追加"}
          onClose={closeModal}
        >
          <form className="grid gap-3" onSubmit={saveBundle}>
            <TextField label="セット名" value={name} onChange={setName} />
            <NumberInput label="セット価格" value={price} onChange={setPrice} />
            <div className="space-y-2" aria-label="構成頒布物一覧">
              {components.map((component, index) => {
                const rowNumber = index + 1;
                const selectedProductId = component.productId || (products[0]?.id ?? "");

                return (
                  <div
                    key={component.id}
                    className="grid gap-2 rounded-md bg-slate-100 p-3"
                  >
                    <SelectField
                      label={`構成頒布物${rowNumber}`}
                      value={selectedProductId}
                      options={products.map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))}
                      onChange={(nextProductId) =>
                        updateComponentProduct(component.id, nextProductId)
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
                        構成頒布物{rowNumber}を取り消し
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
                構成頒布物を追加
              </button>
            </div>
            <SubmitButton label={editingBundleId ? "セットを更新" : "セットを追加"} />
          </form>
        </Modal>
      )}
    </section>
  );
}

function FixedAddAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <PrimaryActionBar>
      <InlineActionButton tone="main" onClick={onClick}>
        {label}
      </InlineActionButton>
    </PrimaryActionBar>
  );
}

function CardList({
  children,
  emptyText,
}: {
  children: ReactNode;
  emptyText: string;
}) {
  if (Children.count(children) === 0) {
    return <p className="text-sm text-slate-600">{emptyText}</p>;
  }

  return <ul className="space-y-2">{children}</ul>;
}

function ManagementCard({
  deleteLabel,
  deleteReason,
  editLabel,
  meta,
  onDelete,
  onEdit,
  title,
  tone,
}: {
  deleteLabel: string;
  deleteReason?: string | null;
  editLabel: string;
  meta: ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  title: string;
  tone: CardTone;
}) {
  return (
    <li
      className={[
        "rounded-lg border-l-[6px] p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200",
        cardToneClasses[tone],
      ].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h3 className="truncate-one-line text-base font-bold text-[color:var(--color-text)]">
            {title}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-[color:var(--color-muted)]">
            {meta}
          </p>
          {deleteReason ? (
            <p className="mt-2 text-sm font-bold text-[color:var(--color-error)]">
              {deleteReason}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 font-bold text-slate-800"
            aria-label={editLabel}
            onClick={onEdit}
          >
            編集
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-red-200 bg-white px-4 font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={deleteLabel}
            disabled={Boolean(deleteReason)}
            onClick={onDelete}
          >
            削除
          </button>
        </div>
      </div>
    </li>
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
  return <NumberField label={label} value={value} min={0} onChange={onChange} />;
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

function NoticeMessage({ message }: { message: string }) {
  return (
    <p
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900"
      role="status"
    >
      {message}
    </p>
  );
}

function getProductDeleteBlocker({
  bundleItems,
  events,
  inventories,
  productId,
  sales,
}: {
  bundleItems: BundleItem[];
  events: Event[];
  inventories: EventInventory[];
  productId: string;
  sales: Sale[];
}): string | null {
  if (
    inventories.some((inventory) => inventory.productId === productId) ||
    bundleItems.some((item) => item.productId === productId)
  ) {
    return "在庫・セットで使われているため削除できません";
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
    return "終了済みイベントの売上に含まれるため削除できません";
  }

  return null;
}

function getProductGenreLabel(value: ProductGenre): string {
  return productGenres.find((option) => option.value === value)?.label ?? value;
}

function getSeriesLabel(value: Series): string {
  return seriesOptions.find((option) => option.value === value)?.label ?? value;
}

function getExpenseCategoryLabel(value: ExpenseCategory): string {
  return expenseCategories.find((option) => option.value === value)?.label ?? value;
}

function getEventName(events: Event[], eventId: string): string {
  return events.find((event) => event.id === eventId)?.name ?? eventId;
}

function getProductName(products: Product[], productId: string): string {
  return products.find((product) => product.id === productId)?.name ?? productId;
}

function formatYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
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
