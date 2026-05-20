const summary = [
  ["総売上", "0円"],
  ["頒布数", "0"],
  ["平均単価", "0円"],
  ["経費", "0円"],
  ["利益", "0円"],
];

export function StatisticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">統計</h1>
      <div className="grid grid-cols-2 gap-3">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
