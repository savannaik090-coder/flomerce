import React from 'react';
import Modal from './Modal.jsx';

const VARIANTS = {
  info:    { icon: 'fa-info-circle',         bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb', defaultTitle: 'Heads up' },
  success: { icon: 'fa-check-circle',        bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a', defaultTitle: 'Success' },
  warning: { icon: 'fa-exclamation-triangle',bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706', defaultTitle: 'Warning' },
  error:   { icon: 'fa-times-circle',        bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626', defaultTitle: 'Something went wrong' },
  upgrade: { icon: 'fa-crown',               bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706', defaultTitle: 'Upgrade Required' },
};

export default function AlertModal({
  open,
  variant = 'info',
  title,
  message,
  onClose,
  primaryAction,   // { label, onClick, variant?: 'primary'|'danger'|'success'|'upgrade', href?, target? }
  secondaryAction, // { label, onClick }  defaults to a "Close" button
  hideClose = false,
}) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const resolvedTitle = title || v.defaultTitle;

  const renderPrimary = () => {
    if (!primaryAction) return null;
    const btnClass = `flo-ui-btn flo-ui-btn--${primaryAction.variant || (variant === 'upgrade' ? 'upgrade' : 'primary')}`;
    if (primaryAction.href) {
      return (
        <a
          className={btnClass}
          href={primaryAction.href}
          target={primaryAction.target}
          rel={primaryAction.target === '_blank' ? 'noopener noreferrer' : undefined}
          onClick={() => { if (onClose) onClose(); }}
          style={{ textDecoration: 'none' }}
        >
          {primaryAction.icon && <i className={`fas ${primaryAction.icon}`} style={{ fontSize: 12 }} />}
          {primaryAction.label}
        </a>
      );
    }
    return (
      <button
        type="button"
        className={btnClass}
        onClick={() => {
          if (primaryAction.onClick) primaryAction.onClick();
          if (primaryAction.closeOnClick !== false && onClose) onClose();
        }}
      >
        {primaryAction.icon && <i className={`fas ${primaryAction.icon}`} style={{ fontSize: 12 }} />}
        {primaryAction.label}
      </button>
    );
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel={resolvedTitle}>
      <div className="flo-ui-modal__icon" style={{ background: v.bg }}>
        <i className={`fas ${v.icon}`} style={{ color: v.color }} />
      </div>
      <h3 className="flo-ui-modal__title">{resolvedTitle}</h3>
      {message && <p className="flo-ui-modal__message">{message}</p>}
      <div className="flo-ui-modal__actions">
        {!hideClose && (
          <button
            type="button"
            className="flo-ui-btn flo-ui-btn--secondary"
            onClick={() => {
              if (secondaryAction?.onClick) secondaryAction.onClick();
              if (onClose) onClose();
            }}
          >
            {secondaryAction?.label || (primaryAction ? 'Cancel' : 'OK')}
          </button>
        )}
        {renderPrimary()}
      </div>
    </Modal>
  );
}

/** Detects backend plan/feature errors so callers can decide to show the upgrade alert. */
export function isPlanError(err) {
  if (!err) return false;
  const code = err.code || '';
  const status = err.status || 0;
  return code === 'PLAN_LIMIT_REACHED' || code === 'FEATURE_LOCKED' ||
    (status === 403 && /upgrade|plan|limit/i.test(err.message || ''));
}
