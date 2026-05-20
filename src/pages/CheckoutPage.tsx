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
      <div className="grid grid-cols-2 gap-3">
        {demoItems.map((item) => (
          <button
            key={`${item.kind}-${item.refId}`}
            type="button"
            aria-label={`${item.displayName} ${item.unitPrice}円`}
            onClick={() => dispatch({ type: "addLine", item })}
            className="min-h-24 rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-slate-200"
          >
            <span className="block text-lg font-bold">{item.displayName}</span>
            <span className="mt-2 block text-sm text-slate-600">
              {item.unitPrice}円
            </span>
          </button>
        ))}
      </div>
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
                aria-label={`${line.displayName}を減らす`}
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
