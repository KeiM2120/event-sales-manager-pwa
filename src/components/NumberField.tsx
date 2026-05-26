interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  const decrementDisabled = min !== undefined && value <= min;
  const incrementDisabled = max !== undefined && value >= max;

  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <div className="mt-1 grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
        <button
          type="button"
          aria-label={`${label}を減らす`}
          disabled={decrementDisabled}
          className="min-h-12 rounded-md border bg-white text-xl font-bold disabled:opacity-40"
          onClick={() => onChange(value - 1)}
        >
          -
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="min-h-12 rounded-md border px-3 text-center text-lg font-bold"
        />
        <button
          type="button"
          aria-label={`${label}を増やす`}
          disabled={incrementDisabled}
          className="min-h-12 rounded-md border bg-white text-xl font-bold disabled:opacity-40"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </label>
  );
}
