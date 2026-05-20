import { useEffect, useReducer, useRef } from "react";
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer";

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

const demoItems = demoProducts.flatMap((product) => [
  {
    ...product,
    kind: "product" as const,
  },
  {
    ...product,
    kind: "reservation" as const,
    displayName: `取り置き ${product.displayName}`,
  },
]);

export function CheckoutPage({ eventId }: { eventId: string }) {
  const checkoutDetailsRef = useRef<HTMLUListElement>(null);
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

  return (
    <div className="space-y-4 pb-[calc(30vh+6rem)]">
      <h1 className="text-2xl font-bold">会計</h1>
      <ul aria-label="商品一覧" className="grid grid-cols-1 gap-3">
        {demoItems.map((item) => (
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
                {item.unitPrice}円 / 数量 {getLineQuantity(state, item)}
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
          <button type="button" className="min-h-16 rounded-md border bg-white font-bold">
            Undo
          </button>
          <button
            type="button"
            className="min-h-16 rounded-md bg-emerald-700 font-bold text-white"
          >
            確定 {state.totalAmount}円
          </button>
        </div>
      </div>
    </div>
  );
}

function createLineId(item: (typeof demoItems)[number]): string {
  return `${item.kind}:${item.refId}`;
}

function getLineQuantity(
  state: ReturnType<typeof createInitialCheckoutState>,
  item: (typeof demoItems)[number],
): number {
  return state.lines.find((line) => line.lineId === createLineId(item))?.quantity ?? 0;
}
