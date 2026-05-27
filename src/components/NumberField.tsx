import { useId, useState } from "react";

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
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const clampValue = (nextValue: number) => {
    if (min !== undefined && nextValue < min) {
      return min;
    }
    if (max !== undefined && nextValue > max) {
      return max;
    }
    return nextValue;
  };

  const commitDraft = (nextDraft: string) => {
    const parsedValue = Number(nextDraft);
    const nextValue = nextDraft === "" || !Number.isFinite(parsedValue) ? (min ?? 0) : parsedValue;

    onChange(clampValue(nextValue));
  };

  const decrementDisabled = min !== undefined && value <= min;
  const incrementDisabled = max !== undefined && value >= max;
  const displayValue = draft ?? String(value);

  return (
    <div className="block">
      <label htmlFor={inputId} className="text-sm font-bold">
        {label}
      </label>
      <div className="mt-1 grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
        <button
          type="button"
          aria-label={`${label}を減らす`}
          disabled={decrementDisabled}
          className="min-h-12 rounded-md border bg-white text-xl font-bold disabled:opacity-40"
          onClick={() => onChange(clampValue(value - 1))}
        >
          -
        </button>
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          value={displayValue}
          onFocus={() => setDraft(value === 0 ? "" : String(value))}
          onChange={(event) => {
            const nextDraft = event.currentTarget.value;

            setDraft(nextDraft);
            if (nextDraft !== "") {
              commitDraft(nextDraft);
            }
          }}
          onBlur={() => {
            commitDraft(draft ?? String(value));
            setDraft(null);
          }}
          className="min-h-12 rounded-md border px-3 text-center text-lg font-bold"
        />
        <button
          type="button"
          aria-label={`${label}を増やす`}
          disabled={incrementDisabled}
          className="min-h-12 rounded-md border bg-white text-xl font-bold disabled:opacity-40"
          onClick={() => onChange(clampValue(value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
