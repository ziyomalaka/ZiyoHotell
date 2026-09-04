export function EmptyState({
  title = "Ma’lumot topilmadi",
  text,
  className = "",
}: {
  title?: string;
  text?: string;
  className?: string;
}) {
  return (
    <div className={`card px-6 py-12 text-center ${className}`}>
      <p className="font-semibold text-navy">{title}</p>
      {text ? <p className="mt-2 text-sm text-muted">{text}</p> : null}
    </div>
  );
}

export function ErrorState({ text = "Server bilan bog‘lanishda xatolik yuz berdi" }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-danger">{text}</div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-white">
          <div className="m-5 h-3 w-24 rounded bg-line" />
          <div className="mx-5 h-7 w-32 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
