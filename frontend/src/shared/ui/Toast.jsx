import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './styles.css';

const ToastContext = createContext(null);

const ICONS = { success: '✓', error: '!', warning: '!', info: 'i' };

let idSeq = 0;

export function ToastProvider({ children, defaultDuration = 4000, max = 4 }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      const tm = timersRef.current.get(id);
      if (tm) { clearTimeout(tm); timersRef.current.delete(id); }
    }, 200);
  }, []);

  const push = useCallback((variant, msg, opts = {}) => {
    const id = ++idSeq;
    const toast = {
      id,
      variant,
      title: opts.title || null,
      message: typeof msg === 'string' ? msg : String(msg ?? ''),
      duration: opts.duration ?? defaultDuration,
      leaving: false,
    };
    setToasts((prev) => {
      const next = [...prev, toast];
      return next.length > max ? next.slice(next.length - max) : next;
    });
    if (toast.duration > 0) {
      const tm = setTimeout(() => dismiss(id), toast.duration);
      timersRef.current.set(id, tm);
    }
    return id;
  }, [defaultDuration, dismiss, max]);

  const api = useRef(null);
  if (!api.current) api.current = {};
  api.current.success = (msg, opts) => push('success', msg, opts);
  api.current.error   = (msg, opts) => push('error',   msg, opts);
  api.current.warning = (msg, opts) => push('warning', msg, opts);
  api.current.info    = (msg, opts) => push('info',    msg, opts);
  api.current.show    = (msg, opts) => push(opts?.variant || 'info', msg, opts);
  api.current.dismiss = dismiss;

  useEffect(() => () => {
    timersRef.current.forEach((tm) => clearTimeout(tm));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="flo-ui-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flo-ui-toast flo-ui-toast--${t.variant}${t.leaving ? ' flo-ui-toast--leaving' : ''}`}
            role={t.variant === 'error' ? 'alert' : 'status'}
          >
            <div className="flo-ui-toast__icon">{ICONS[t.variant] || 'i'}</div>
            <div className="flo-ui-toast__body">
              {t.title && <p className="flo-ui-toast__title">{t.title}</p>}
              <p className="flo-ui-toast__msg">{t.message}</p>
            </div>
            <button
              type="button"
              className="flo-ui-toast__close"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: no provider mounted — do nothing visible, log to console
    return {
      success: (m) => console.log('[toast.success]', m),
      error:   (m) => console.error('[toast.error]', m),
      warning: (m) => console.warn('[toast.warning]', m),
      info:    (m) => console.info('[toast.info]', m),
      show:    (m) => console.log('[toast]', m),
      dismiss: () => {},
    };
  }
  return ctx;
}
