"use client";
import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/state/I18nContext';

interface ConfirmProps {
  open: boolean;
  title?: string;
  description?: ReactNode;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  lockScroll?: boolean; // prevent background scroll
}

const variantClass: Record<string, string> = {
  danger: 'glass-button glass-button--danger',
  primary: 'glass-button glass-button--primary',
  neutral: 'glass-button'
};

export const Confirm: React.FC<ConfirmProps> = ({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
  disabled,
  autoFocus = true,
  lockScroll = true,
}) => {
  const { t } = useI18n();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      // Do not auto-confirm on Enter to allow form inputs inside details
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm, disabled]);

  // Scroll lock
  useEffect(() => {
    if (!open || !lockScroll) return;
    const previousHtml = document.documentElement.style.overflow;
    const previousBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtml;
      document.body.style.overflow = previousBody;
    };
  }, [open, lockScroll]);

  if (!open) return null;

  const node = (
    <div className="modal-overlay" aria-hidden={!open} data-confirm-root>
      <button
        type="button"
        aria-label={t('confirm.close')}
        className="absolute inset-0 w-full h-full cursor-default bg-transparent"
        onClick={onCancel}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') { onCancel(); } }}
        tabIndex={-1}
      />
      <dialog open aria-labelledby="confirm-title" className="modal-panel glass-panel glass-panel--pure modal-enter w-full max-w-md m-0 flex flex-col p-5 space-y-4 bg-transparent max-h-[85vh]">
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <h2 id="confirm-title" className="font-semibold text-lg">{title || t('confirm.title')}</h2>
          {description && <div className="text-xs text-muted leading-relaxed">{description}</div>}
          {details && (
            <div className="text-[11px] glass-panel glass-panel--subtle p-2 flex flex-col gap-0.5 max-h-[50vh] overflow-auto glass-scroll">
              {details}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          {(cancelLabel !== '') && <button type="button" onClick={onCancel} className="glass-button glass-button--sm pressable">{cancelLabel || t('confirm.cancel')}</button>}
          <button type="button" autoFocus={autoFocus} disabled={disabled} onClick={onConfirm} className={`${variantClass[variant]} glass-button--sm pressable disabled:opacity-50 disabled:cursor-not-allowed`}>{confirmLabel || t('confirm.ok')}</button>
        </div>
      </dialog>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(node, document.body);
};

export default Confirm;