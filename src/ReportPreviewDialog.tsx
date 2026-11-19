import { useEffect, useId, useRef } from "react";
import NavIcon from "./NavIcon";

export default function ReportPreviewDialog({ open, html, onClose, onCopy, onDownload }: {
  open: boolean; html: string; onClose: () => void;
  onCopy: () => void; onDownload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open) dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} className="report-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="report-preview-dialog-header">
      <div><span className="report-eyebrow">RAPPORT DE SPRINT</span><h2 id={titleId}>Aperçu du rapport</h2></div>
      <div className="preview-actions">
        <button type="button" className="button button-secondary" onClick={onCopy}>Copier le rapport</button>
        <button type="button" className="button button-quiet" onClick={onDownload}>Télécharger le HTML</button>
        <button type="button" className="button report-preview-close" aria-label="Fermer l’aperçu" onClick={onClose}><NavIcon name="close" /></button>
      </div>
    </header>
    {open && <div className="report-preview-dialog-body"><div dangerouslySetInnerHTML={{ __html: html }} /></div>}
  </dialog>;
}
