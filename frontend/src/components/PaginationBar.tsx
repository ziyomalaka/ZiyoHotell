export function PaginationBar({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">{total} ta yozuv</p>
      <div className="flex items-center gap-2">
        {onPageSize ? (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="min-h-10">
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} ta
              </option>
            ))}
          </select>
        ) : null}
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary min-h-10 px-3 disabled:opacity-40">
          Oldingi
        </button>
        <span className="tabular text-muted">
          {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary min-h-10 px-3 disabled:opacity-40">
          Keyingi
        </button>
      </div>
    </div>
  );
}
