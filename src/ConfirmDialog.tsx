import { useEffect, useId, useRef } from "react";
import NavIcon from "./NavIcon";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  open, title, description, busy = false, error = "", onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    } else if (!open) {
      dialog.current?.close();
    }
  }, [open]);

  return (
    <dialog ref={dialog} className="confirm-dialog" role="alertdialog"
      aria-labelledby={titleId} aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={event => {
        if (busy || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
      }}
    >
      <div className="confirm-dialog-icon"><NavIcon name="trash" /></div>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
      <div className="confirm-dialog-actions">
        <button ref={cancelButton} type="button" className="button button-secondary"
          disabled={busy} onClick={onCancel}>Annuler</button>
        <button type="button" className="button confirm-dialog-delete"
          disabled={busy} onClick={onConfirm}>
          <NavIcon name="trash" /> {busy ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </dialog>
  );
}
