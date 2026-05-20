interface SectionTabItem<T extends string> {
  value: T;
  label: string;
}

interface SectionTabsProps<T extends string> {
  value: T;
  items: Array<SectionTabItem<T>>;
  onChange: (value: T) => void;
}

export function SectionTabs<T extends string>({
  value,
  items,
  onChange,
}: SectionTabsProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-md bg-slate-200 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={
            item.value === value
              ? "min-h-11 rounded bg-white px-4 text-sm font-bold shadow-sm"
              : "min-h-11 rounded px-4 text-sm font-semibold text-slate-700"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
