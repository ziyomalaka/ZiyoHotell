export function ExportExcelButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="btn-excel">
      {loading ? "Tayyorlanmoqda..." : "Excelga chiqarish"}
    </button>
  );
}
