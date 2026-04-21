import React from 'react';
import AlertModal, { isPlanError as sharedIsPlanError } from '../../../shared/ui/AlertModal.jsx';

export const isPlanError = sharedIsPlanError;

/**
 * Thin wrapper around the shared AlertModal — kept for backwards compatibility
 * with existing call sites that use `<PlanLimitModal message={...} onClose={...} />`.
 * For new code, prefer importing AlertModal directly from `shared/ui`.
 */
export default function PlanLimitModal({ message, onClose }) {
  return (
    <AlertModal
      open={!!message}
      variant="upgrade"
      title="Upgrade Required"
      message={message}
      onClose={onClose}
      secondaryAction={{ label: 'Maybe Later' }}
      primaryAction={{
        label: 'Upgrade Plan',
        icon: 'fa-arrow-up',
        variant: 'upgrade',
        onClick: () => { document.querySelector('[data-page="billing"]')?.click(); },
      }}
    />
  );
}
