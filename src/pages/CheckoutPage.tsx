import { useEffect, useReducer, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { EventSalesDatabase } from "../db/database";
import { calculateRemainingStock } from "../domain/inventory";
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Product,
  Sale,
} from "../domain/types";
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer";
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

interface CheckoutDisplayItem {
  kind: "product" | "bundle" | "reservation";
  refId: string;
  displayName: string;
  productGenre: Product["productGenre"];
  unitPrice: number;
  stockLabel: string;
  components?: Array<{
    productId: string;
    productName: string;
    productGenre: Product["productGenre"];
    quantity: number;
  }>;
}

const demoItems: CheckoutDisplayItem[] = demoProducts.flatMap((product) => [
  {
    ...product,
    kind: "product" as const,
    stockLabel: "数量",
  },
  {
    ...product,
    kind: "reservation" as const,
    displayName: `取り置き ${product.displayName}`,
    stockLabel: "数量",
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

  const checkoutData = useCheckoutData(database, eventId);
  const items = checkoutData?.items ?? demoItems;
  const eventLabel = checkoutData?.event ? formatEventLabel(checkoutData.event) : null;

  async function handleConfirm() {
    if (!database || state.lines.length === 0 || isConfirmingRef.current) {
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
      setMessage("保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
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
      setMessage("取り消せる売上がありません。");
      return;
    }

    await undoSale(database, latestSale.id);
    setMessage("直近の売上を取り消しました。");
  }

  return (
    <div className="space-y-4 pb-[calc(30vh+6rem)]">
      <h1 className="text-2xl font-bold">会計</h1>
      {eventLabel && <p className="text-sm font-bold text-slate-700">{eventLabel}</p>}
      {message && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
          {message}
        </p>
      )}
      <ul aria-label="商品一覧" className="grid grid-cols-1 gap-3">
        {items.map((item) => (
          <li
            key={`${item.kind}-${item.refId}`}
            className="grid grid-cols-[1fr_auto_auto] items-stretch gap-2 rounded-md bg-white p-2 shadow-sm ring-1 ring-slate-200"
          >
            <button
              type="button"
              aria-label={`${item.displayName}を追加`}
              onClick={() => dispatch({ type: "addLine", item })}
              className="min-h-20 rounded-md px-2 text-left"
            >
              <span className="block text-lg font-bold">{item.displayName}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {item.unitPrice}円 / {item.stockLabel} {getLineQuantity(state, item)}
              </span>
            </button>
            <button
              type="button"
              aria-label={`${item.displayName}を減らす`}
              disabled={getLineQuantity(state, item) === 0}
              onClick={() =>
                dispatch({ type: "decrementLine", lineId: createLineId(item) })
              }
              className="min-h-20 w-14 rounded-md border text-2xl font-bold disabled:text-slate-300"
            >
              -
            </button>
            <button
              type="button"
              aria-label={`${item.displayName}を増やす`}
              onClick={() => dispatch({ type: "addLine", item })}
              className="min-h-20 w-14 rounded-md bg-slate-900 text-2xl font-bold text-white"
            >
              +
            </button>
          </li>
        ))}
      </ul>
      <section
        aria-label="会計内容"
        className="fixed inset-x-0 bottom-20 z-10 mx-auto flex h-[30vh] max-w-3xl flex-col border-t border-slate-200 bg-white p-3 shadow-lg"
      >
        <h2 className="font-bold">会計内容</h2>
        <ul
          ref={checkoutDetailsRef}
          aria-label="会計明細"
          className="mt-1 flex-1 space-y-1 overflow-y-auto"
        >
          {state.lines.map((line) => (
            <li
              key={line.lineId}
              className="flex items-center justify-between gap-3 py-1"
            >
              <span>
                {line.displayName} x{line.quantity}
              </span>
              <button
                type="button"
                aria-label={`会計内容の${line.displayName}を減らす`}
                className="h-9 w-9 rounded-md border text-lg font-bold"
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
      <div
        role="group"
        aria-label="会計操作"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-2 backdrop-blur"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
          <button
            type="button"
            className="min-h-16 rounded-md border bg-white font-bold"
            onClick={() => dispatch({ type: "clear" })}
          >
            クリア
          </button>
          <button
            type="button"
            className="min-h-16 rounded-md border bg-white font-bold"
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="min-h-16 rounded-md bg-emerald-700 font-bold text-white"
            disabled={isConfirming}
            onClick={handleConfirm}
          >
            確定 {state.totalAmount}円
          </button>
        </div>
      </div>
    </div>
  );
}

function useCheckoutData(database: EventSalesDatabase | undefined, eventId: string) {
  const events =
    (useLiveQuery(async () => (database ? await database.events.toArray() : []), [
      database,
    ]) as
      | Event[]
      | undefined) ?? [];
  const products =
    (useLiveQuery(async () => (database ? await database.products.toArray() : []), [
      database,
    ]) as
      | Product[]
      | undefined) ?? [];
  const bundles =
    (useLiveQuery(async () => (database ? await database.bundles.toArray() : []), [
      database,
    ]) as
      | Bundle[]
      | undefined) ?? [];
  const bundleItems =
    (useLiveQuery(
      async () => (database ? await database.bundleItems.toArray() : []),
      [database],
    ) as
      | BundleItem[]
      | undefined) ?? [];
  const inventories =
    (useLiveQuery(
      async () => (database ? await database.eventInventories.toArray() : []),
      [database],
    ) as EventInventory[] | undefined) ?? [];
  const sales =
    (useLiveQuery(async () => (database ? await database.sales.toArray() : []), [
      database,
    ]) as
      | Sale[]
      | undefined) ?? [];

  if (!database) {
    return null;
  }

  const event = events.find((item) => item.id === eventId) ?? events[0] ?? null;
  const targetEventId = event?.id ?? eventId;
  const eventInventories = inventories.filter(
    (inventory) => inventory.eventId === targetEventId,
  );
  const productItems = eventInventories.flatMap((inventory) => {
    const product = products.find((item) => item.id === inventory.productId);
    if (!product || !product.isActive) {
      return [];
    }

    const remainingStock = calculateRemainingStock(
      product.id,
      eventInventories,
      sales.filter((sale) => sale.eventId === targetEventId),
    );
    const stockLabel = `初期 ${inventory.initialStock} / 残り ${remainingStock} / 取置 ${inventory.reservedStock}`;
    const normalItem: CheckoutDisplayItem = {
      kind: "product",
      refId: product.id,
      displayName: product.name,
      productGenre: product.productGenre,
      unitPrice: product.defaultPrice,
      stockLabel,
    };
    const reservationItem: CheckoutDisplayItem = {
      ...normalItem,
      kind: "reservation",
      displayName: `取り置き ${product.name}`,
    };

    return inventory.reservedStock > 0 ? [normalItem, reservationItem] : [normalItem];
  });
  const bundleDisplayItems = bundles
    .filter((bundle) => bundle.isActive)
    .map((bundle): CheckoutDisplayItem => ({
      kind: "bundle",
      refId: bundle.id,
      displayName: bundle.name,
      productGenre: "other",
      unitPrice: bundle.price,
      stockLabel: "セット",
      components: bundleItems
        .filter((item) => item.bundleId === bundle.id)
        .flatMap((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
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
    }));

  return {
    event,
    items: [...productItems, ...bundleDisplayItems],
  };
}

function formatEventLabel(event: Event): string {
  return [event.name, event.eventDate, event.circleSpace].filter(Boolean).join(" / ");
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createLineId(item: CheckoutDisplayItem): string {
  return `${item.kind}:${item.refId}`;
}

function getLineQuantity(
  state: ReturnType<typeof createInitialCheckoutState>,
  item: CheckoutDisplayItem,
): number {
  return state.lines.find((line) => line.lineId === createLineId(item))?.quantity ?? 0;
}
