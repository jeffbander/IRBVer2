import type { PropsWithChildren, ReactNode } from 'react';
import './Modal.css';

type ModalProps = PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
}>;

export const Modal = ({ title, open, onClose, children, footer }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
};
