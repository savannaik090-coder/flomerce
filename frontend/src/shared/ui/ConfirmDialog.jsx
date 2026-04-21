import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import AlertModal from './AlertModal.jsx';

const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation dialog. Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title, message, confirmText, cancelText, variant: 'danger' });
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        variant: opts.variant || 'warning', // 'warning' | 'danger' | 'info'
      });
    });
  }, []);

  const close = (result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const alertVariant = state?.variant === 'danger' ? 'error' : state?.variant || 'warning';
  const btnVariant   = state?.variant === 'danger' ? 'danger' : 'primary';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <AlertModal
          open
          variant={alertVariant}
          title={state.title}
          message={state.message}
          onClose={() => close(false)}
          secondaryAction={{ label: state.cancelText }}
          primaryAction={{
            label: state.confirmText,
            variant: btnVariant,
            onClick: () => close(true),
            closeOnClick: false,
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback so the app keeps working if provider is missing
    return (opts) => Promise.resolve(window.confirm(opts?.message || opts?.title || 'Are you sure?'));
  }
  return ctx;
}
