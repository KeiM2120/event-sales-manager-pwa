const csvButtons = ["会計CSV", "明細CSV", "経費CSV", "全データJSON"];

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">設定</h1>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">エクスポート</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {csvButtons.map((label) => (
            <button key={label} type="button" className="rounded-md border px-3 py-3 font-semibold">
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">PWA更新</h2>
        <p className="mt-1 text-sm text-slate-600">
          更新がある場合はここに表示します。
        </p>
      </section>
    </div>
  );
}
