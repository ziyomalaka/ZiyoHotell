export function ConfirmModal({
  title,
  text,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  danger,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-navy">{title}</h3>
        <p className="mt-3 whitespace-pre-line text-muted">{text}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={danger ? "btn-danger" : "btn-primary"}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
