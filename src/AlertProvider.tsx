import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertContext } from "./alerts";
import type { AppAlert } from "./alerts";
import "./ConfirmDialog.css";
import "./AlertProvider.css";

export default function AlertProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AppAlert[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const current = queue[0];
  const showAlert = useCallback((alert: AppAlert) => setQueue(previous => [...previous, alert]), []);
  const dismiss = () => setQueue(previous => previous.slice(1));

  useEffect(() => {
    if (current) {
      if (!dialog.current?.open) dialog.current?.showModal();
      button.current?.focus();
    } else dialog.current?.close();
  }, [current]);

  return <AlertContext.Provider value={showAlert}>
    {children}
    <dialog ref={dialog} className="confirm-dialog app-alert-dialog" role="alertdialog"
      aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
      }}>
      <div className={`app-alert-icon app-alert-icon-${current?.tone || "info"}`} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          {current?.tone === "success" ? <path d="m8 12 3 3 5-6" /> : <path d="M12 7v6M12 17h.01" />}
        </svg>
      </div>
      <h2 id={titleId}>{current?.title}</h2>
      <p id={descriptionId}>{current?.message}</p>
      <div className="confirm-dialog-actions">
        <button ref={button} type="button" className="button button-primary" onClick={dismiss}>Compris</button>
      </div>
    </dialog>
  </AlertContext.Provider>;
}
