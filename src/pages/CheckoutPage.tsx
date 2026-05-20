import { useReducer } from "react";
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer";

const demoItems = [
  {
    kind: "product" as const,
    refId: "book",
    displayName: "新刊",
    productGenre: "book" as const,
    unitPrice: 1000,
  },
  {
    kind: "reservation" as const,
    refId: "book",
    displayName: "取り置き 新刊",
    productGenre: "book" as const,
    unitPrice: 1000,
  },
];

export function CheckoutPage({ eventId }: { eventId: string }) {
  const [state, dispatch] = useReducer(
    checkoutReducer,
    eventId,
    createInitialCheckoutState,
  );

  return (
    <div className="space-y-4 pb-24">
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
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">会計内容</h2>
        <div className="mt-3 space-y-2">
          {state.lines.map((line) => (
            <div key={line.lineId} className="flex items-center justify-between gap-3">
              <span>
                {line.displayName} x{line.quantity}
              </span>
              <button
                type="button"
                aria-label={`会計内容の${line.displayName}を減らす`}
                className="h-11 w-11 rounded-md border text-lg font-bold"
                onClick={() =>
                  dispatch({ type: "decrementLine", lineId: line.lineId })
                }
              >
                -
              </button>
            </div>
          ))}
        </div>
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
