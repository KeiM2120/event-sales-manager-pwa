interface EmptyStateProps {
  title: string;
  body?: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      {body && <p className="mt-2 text-sm text-slate-600">{body}</p>}
    </div>
  );
}
