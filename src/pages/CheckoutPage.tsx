import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HeroEventCard, StatusChip } from "../components/DesignSystem";
import type { EventSalesDatabase } from "../db/database";
import {
  calculateBundleAvailability,
  calculateRemainingStock,
} from "../domain/inventory";
import type {
  Bundle,
  BundleItem,
  CheckoutState,
  Event,
  EventInventory,
  Product,
  Sale,
} from "../domain/types";
import {
  checkoutReducer,
  createInitialCheckoutState,
  type CheckoutItemInput,
} from "../reducers/checkoutReducer";
import { confirmCheckout, undoSale } from "../services/checkoutService";

const demoProducts = [
  {
    refId: "book",
    displayName: "新刊",
    productGenre: "book" as const,
    unitPrice: 1000,
  },
  {
    refId: "existing-book-a",
    displayName: "既刊A",
    productGenre: "book" as const,
    unitPrice: 800,
  },
  {
    refId: "existing-book-b",
    displayName: "既刊B",
    productGenre: "book" as const,
    unitPrice: 700,
  },
  {
    refId: "goods-a",
    displayName: "グッズA",
    productGenre: "goods" as const,
    unitPrice: 500,
  },
  {
    refId: "goods-b",
    displayName: "グッズB",
    productGenre: "goods" as const,
    unitPrice: 300,
  },
];

interface CheckoutDisplayItem extends CheckoutItemInput {
  kind: "product" | "bundle" | "reservation";
  stockLabel: string;
}

const demoItems: CheckoutDisplayItem[] = demoProducts.flatMap((product) => [
  {
    ...product,
    kind: "product" as const,
    maxQuantity: 99,
    stockLabel: "残99",
  },
  {
    ...product,
    kind: "reservation" as const,
    displayName: `取り置き ${product.displayName}`,
    maxQuantity: 99,
    stockLabel: "残99",
  },
]);

interface CheckoutPageProps {
  database?: EventSalesDatabase;
  eventId: string;
}

export function CheckoutPage({ database, eventId }: CheckoutPageProps) {
  const checkoutDetailsRef = useRef<HTMLUListElement>(null);
  const isConfirmingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, dispatch] = useReducer(
    checkoutReducer,
    eventId,
    createInitialCheckoutState,
  );

  useEffect(() => {
    const checkoutDetails = checkoutDetailsRef.current;
    if (!checkoutDetails || state.lines.length === 0) {
      return;
    }

    if (typeof checkoutDetails.scrollTo === "function") {
      checkoutDetails.scrollTo({ top: checkoutDetails.scrollHeight });
      return;
    }

    checkoutDetails.scrollTop = checkoutDetails.scrollHeight;
  }, [state.totalQuantity, state.lines.length]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timerId = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(timerId);
  }, [message]);

  const checkoutData = useCheckoutData(database, eventId);
  const items = checkoutData?.items ?? demoItems;
  const sortedItems = useMemo(
    () => sortDisplayItems(items, state),
    [items, state],
  );
  const eventName = checkoutData?.event?.name ?? "デモイベント";
  const circleSpace = checkoutData?.event?.circleSpace;
  const hasLines = state.lines.length > 0;
  const totalLabel = `合計 ${state.totalQuantity}点`;
  const amountLabel = formatYen(state.totalAmount);

  async function handleConfirm() {
    if (!database || !hasLines || isConfirmingRef.current) {
      return;
    }

    isConfirmingRef.current = true;
    setIsConfirming(true);
    try {
      await confirmCheckout(database, state, {
        saleId: createId("sale"),
        datetime: new Date().toISOString(),
      });
      dispatch({ type: "clear" });
      setMessage("会計を保存しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした");
    } finally {
      isConfirmingRef.current = false;
      setIsConfirming(false);
    }
  }

  async function handleUndo() {
    if (!database) {
      return;
    }

    const latestSale = await database.sales
      .where("eventId")
      .equals(eventId)
      .and((sale) => !sale.canceled)
      .reverse()
      .sortBy("datetime")
      .then((sales) => sales.at(0));

    if (!latestSale) {
      setMessage("取り消せる売上がありません");
      return;
    }

    await undoSale(database, latestSale.id);
    setMessage("直近の売上を取り消しました");
  }

  return (
    <div className="space-y-3 px-3 pb-80 pt-3">
      <HeroEventCard eventName={eventName} circleSpace={circleSpace} />

      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-1/2 z-30 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-emerald-200 bg-white px-5 py-4 text-center text-base font-bold text-emerald-800 shadow-[var(--shadow-card)]"
        >
          {message}
        </div>
      ) : null}

      <ul aria-label="頒布物一覧" className="grid grid-cols-1 gap-2">
        {sortedItems.map((item) => {
          const quantity = getLineQuantity(state, item);
          const isSoldOut = getMaxQuantity(item) <= 0;
          const canAddItem = canAdd(state, item);
          const tone = getItemTone(item, isSoldOut);

          return (
            <li
              key={`${item.kind}-${item.refId}`}
              aria-label={item.displayName}
              className={[
                "grid min-h-24 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border-l-[6px] p-3 shadow-[var(--shadow-card)] ring-1 ring-slate-200",
                tone.cardClassName,
              ].join(" ")}
            >
              <button
                type="button"
                aria-label={`${item.displayName}を追加`}
                disabled={!canAddItem}
                onClick={() => dispatch({ type: "addLine", item })}
                className="min-w-0 text-left disabled:cursor-not-allowed"
              >
                <span
                  aria-label={`${item.displayName}の全文`}
                  title={item.displayName}
                  className="truncate-one-line block text-base font-bold leading-tight text-[color:var(--color-text)]"
                >
                  {item.displayName}
                </span>
                <span className="mt-3 flex min-w-0 items-center gap-2 text-sm font-bold text-[color:var(--color-muted)]">
                  <span className="shrink-0">{formatYen(item.unitPrice)}</span>
                  <span className="shrink-0">/</span>
                  <span className="truncate-one-line">{item.stockLabel}</span>
                  {quantity > 0 ? (
                    <span className="shrink-0 text-[color:var(--color-main)]">
                      選択{quantity}
                    </span>
                  ) : null}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {item.kind === "reservation" ? <StatusChip tone="sub">予約</StatusChip> : null}
                {isSoldOut ? <StatusChip tone="muted">売切</StatusChip> : null}
                <div className="flex shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <button
                    type="button"
                    aria-label={`${item.displayName}を減らす`}
                    disabled={quantity === 0}
                    onClick={() =>
                      dispatch({ type: "decrementLine", lineId: createLineId(item) })
                    }
                    className="min-h-12 w-12 bg-white text-2xl font-bold text-[color:var(--color-main)] disabled:text-slate-300"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    aria-label={`${item.displayName}を増やす`}
                    disabled={!canAddItem}
                    onClick={() => dispatch({ type: "addLine", item })}
                    className="min-h-12 w-12 bg-[color:var(--color-main)] text-2xl font-bold text-white disabled:bg-slate-300"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        role="group"
        aria-label="会計操作"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_28px_rgb(23_32_51_/_0.10)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <section aria-label="選択中">
            <h2 className="text-sm font-bold text-[color:var(--color-text)]">選択中</h2>
            <ul
              ref={checkoutDetailsRef}
              aria-label="選択中の明細"
              className="mt-2 max-h-32 space-y-1 overflow-y-auto"
            >
              {state.lines.map((line) => (
                <li
                  key={line.lineId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="truncate-one-line text-sm font-bold">
                    {line.displayName} x{line.quantity}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[color:var(--color-muted)]">
                    {formatYen(line.subtotal)}
                  </span>
                  <button
                    type="button"
                    aria-label={`選択中の${line.displayName}を減らす`}
                    className="h-9 w-9 rounded-md bg-white text-lg font-bold text-[color:var(--color-main)] ring-1 ring-slate-200"
                    onClick={() =>
                      dispatch({ type: "decrementLine", lineId: line.lineId })
                    }
                  >
                    -
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex items-end justify-between gap-3">
            <span className="text-base font-bold text-[color:var(--color-text)]">
              {totalLabel}
            </span>
            <span className="text-3xl font-bold text-[color:var(--color-text)]">
              {amountLabel}
            </span>
          </div>

          <button
            type="button"
            className="min-h-14 rounded-lg bg-[color:var(--color-main)] text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!hasLines || isConfirming}
            onClick={handleConfirm}
          >
            会計を確定 {amountLabel}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="min-h-10 rounded-lg bg-white text-sm font-bold text-[color:var(--color-muted)] ring-1 ring-slate-200"
              onClick={() => dispatch({ type: "clear" })}
            >
              クリア
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg bg-white text-sm font-bold text-[color:var(--color-muted)] ring-1 ring-slate-200"
              onClick={handleUndo}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useCheckoutData(database: EventSalesDatabase | undefined, eventId: string) {
  const events =
    (useLiveQuery(async () => (database ? await database.events.toArray() : []), [
      database,
    ]) as Event[] | undefined) ?? [];
  const products =
    (useLiveQuery(async () => (database ? await database.products.toArray() : []), [
      database,
    ]) as Product[] | undefined) ?? [];
  const bundles =
    (useLiveQuery(async () => (database ? await database.bundles.toArray() : []), [
      database,
    ]) as Bundle[] | undefined) ?? [];
  const bundleItems =
    (useLiveQuery(
      async () => (database ? await database.bundleItems.toArray() : []),
      [database],
    ) as BundleItem[] | undefined) ?? [];
  const inventories =
    (useLiveQuery(
      async () => (database ? await database.eventInventories.toArray() : []),
      [database],
    ) as EventInventory[] | undefined) ?? [];
  const sales =
    (useLiveQuery(async () => (database ? await database.sales.toArray() : []), [
      database,
    ]) as Sale[] | undefined) ?? [];

  if (!database) {
    return null;
  }

  const event = events.find((item) => item.id === eventId) ?? events[0] ?? null;
  const targetEventId = event?.id ?? eventId;
  const eventInventories = inventories.filter(
    (inventory) => inventory.eventId === targetEventId,
  );
  const eventSales = sales.filter((sale) => sale.eventId === targetEventId);

  const productItems = eventInventories.flatMap((inventory) => {
    const product = products.find((item) => item.id === inventory.productId);
    if (!product || !product.isActive) {
      return [];
    }

    const remainingStock = calculateRemainingStock(
      product.id,
      eventInventories,
      eventSales,
    );
    const normalItem: CheckoutDisplayItem = {
      kind: "product",
      refId: product.id,
      displayName: product.name,
      productGenre: product.productGenre,
      unitPrice: product.defaultPrice,
      maxQuantity: remainingStock,
      stockLabel: `残${remainingStock}`,
    };
    const reservationItem: CheckoutDisplayItem = {
      kind: "reservation",
      refId: product.id,
      displayName: `取り置き ${product.name}`,
      productGenre: product.productGenre,
      unitPrice: product.defaultPrice,
      maxQuantity: inventory.reservedStock,
      stockLabel: `残${inventory.reservedStock}`,
    };

    return inventory.reservedStock > 0 ? [normalItem, reservationItem] : [normalItem];
  });

  const bundleDisplayItems = bundles
    .filter((bundle) => bundle.isActive)
    .map((bundle): CheckoutDisplayItem => {
      const availability = calculateBundleAvailability({
        bundleId: bundle.id,
        bundleItems,
        inventories: eventInventories,
        sales: eventSales,
      });

      return {
        kind: "bundle",
        refId: bundle.id,
        displayName: bundle.name,
        productGenre: "other",
        unitPrice: bundle.price,
        maxQuantity: availability.availableQuantity,
        stockLabel: `残${availability.availableQuantity}`,
        components: bundleItems
          .filter((item) => item.bundleId === bundle.id)
          .flatMap((item) => {
            const product = products.find(
              (candidate) => candidate.id === item.productId,
            );
            if (!product) {
              return [];
            }

            return [
              {
                productId: product.id,
                productName: product.name,
                productGenre: product.productGenre,
                quantity: item.quantity,
              },
            ];
          }),
      };
    });

  return {
    event,
    items: [...productItems, ...bundleDisplayItems],
  };
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createLineId(item: Pick<CheckoutDisplayItem, "kind" | "refId">): string {
  return `${item.kind}:${item.refId}`;
}

function getLineQuantity(state: CheckoutState, item: CheckoutDisplayItem): number {
  return state.lines.find((line) => line.lineId === createLineId(item))?.quantity ?? 0;
}

function canAdd(state: CheckoutState, item: CheckoutDisplayItem): boolean {
  return getLineQuantity(state, item) < (item.maxQuantity ?? Number.POSITIVE_INFINITY);
}

function sortDisplayItems(
  items: CheckoutDisplayItem[],
  state: CheckoutState,
): CheckoutDisplayItem[] {
  return [...items].sort((first, second) => {
    const firstIsLower =
      getMaxQuantity(first) <= 0 && getLineQuantity(state, first) === 0;
    const secondIsLower =
      getMaxQuantity(second) <= 0 && getLineQuantity(state, second) === 0;

    if (firstIsLower === secondIsLower) {
      return 0;
    }

    return firstIsLower ? 1 : -1;
  });
}

function getItemTone(
  item: CheckoutDisplayItem,
  isSoldOut: boolean,
): { cardClassName: string } {
  if (isSoldOut) {
    return {
      cardClassName:
        "border-l-slate-300 bg-slate-100 text-slate-500 opacity-80",
    };
  }

  if (item.kind === "bundle") {
    return {
      cardClassName: "border-l-[color:var(--color-accent)] bg-white",
    };
  }

  if (item.kind === "reservation") {
    return {
      cardClassName:
        "border-l-[color:var(--color-sub)] bg-[color:var(--color-sub)]/20",
    };
  }

  return {
    cardClassName: "border-l-[color:var(--color-sub)] bg-white",
  };
}

function getMaxQuantity(item: CheckoutDisplayItem): number {
  return item.maxQuantity ?? Number.POSITIVE_INFINITY;
}

function formatYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}
