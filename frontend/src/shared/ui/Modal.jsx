import React, { useEffect } from 'react';
import './styles.css';

// Stack-aware scroll lock so nested modals don't leave the page locked.
let scrollLockCount = 0;
let savedBodyOverflow = '';
function lockScroll() {
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount++;
}
function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
  }
}

export default function Modal({ open, onClose, children, closeOnBackdrop = true, ariaLabel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="flo-ui-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || 'Dialog'}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="flo-ui-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
