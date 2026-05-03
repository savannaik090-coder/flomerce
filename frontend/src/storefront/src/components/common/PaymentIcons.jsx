import React from 'react';

export const PAYMENT_METHODS = [
  { id: 'visa',       label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex',       label: 'American Express' },
  { id: 'discover',   label: 'Discover' },
  { id: 'paypal',     label: 'PayPal' },
  { id: 'gpay',       label: 'Google Pay' },
  { id: 'applepay',   label: 'Apple Pay' },
  { id: 'unionpay',   label: 'UnionPay' },
];

export const DEFAULT_PAYMENT_METHODS = ['visa', 'mastercard', 'amex', 'paypal', 'gpay', 'applepay'];

const ICONS = {
  visa: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" />
      <path d="M19.5 21.5l1.7-10.6h2.7l-1.7 10.6h-2.7zm12.4-10.4c-.5-.2-1.4-.4-2.5-.4-2.7 0-4.6 1.4-4.6 3.4 0 1.5 1.4 2.3 2.5 2.8 1.1.5 1.4.8 1.4 1.2 0 .6-.8.9-1.5.9-1 0-1.6-.1-2.4-.5l-.3-.2-.4 2.3c.6.3 1.7.5 2.9.5 2.9 0 4.7-1.4 4.7-3.5 0-1.2-.7-2.1-2.4-2.8-1-.5-1.6-.8-1.6-1.3 0-.4.5-.9 1.6-.9.9 0 1.5.2 2 .4l.3.1.3-2zm6.7-.2h-2.1c-.6 0-1.1.2-1.4.9l-4 9.7h2.9l.6-1.6h3.5l.3 1.6h2.5l-2.3-10.6zm-3.4 6.8c.2-.6 1.1-2.9 1.1-2.9 0 .1.2-.6.4-1l.2.9.6 3h-2.3zM17.2 10.9l-2.7 7.2-.3-1.5c-.5-1.7-2.1-3.6-3.8-4.5l2.5 9.4h2.9l4.4-10.6h-2.9z" fill="#1a1f71" />
      <path d="M12.1 10.9H7.7l-.1.2c3.5.9 5.8 3 6.7 5.5l-1-4.8c-.2-.7-.7-.9-1.2-.9z" fill="#f7b600" />
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" />
      <circle cx="20" cy="16" r="7" fill="#eb001b" />
      <circle cx="28" cy="16" r="7" fill="#f79e1b" />
      <path d="M24 10.6a7 7 0 000 10.8 7 7 0 000-10.8z" fill="#ff5f00" />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#1f72cd" />
      <path d="M9 19.7l1-2.3 1 2.3H9zm21.7-2.4h-2.3v.7h2.2v.9h-2.2v.8h2.3v.7l1.6-1.7-1.6-1.7v.3zm-15.5-2.6L13 19.6l-2.2-4.9H8v6.4l-2.9-6.4H3l-2.7 6.4H2l.6-1.4h3l.6 1.4h3.4v-4.7l2.1 4.7h1.5l2.1-4.7v4.7h1.7v-6.4h-1.8zm15.4 0H25l-1.7 1.9-1.7-1.9h-5.5v6.4h5.4l1.7-1.9 1.7 1.9H28L25.3 18l2.7-3.3zm-7.6 5h-3.2v-1.3h2.9v-1.3h-2.9v-1.1H23l1.4 1.6-1.4 1.6V19zm17.4-5l-1.6 2.5-1.6-2.5h-2.1v6.1l-2.7-6.1h-2.1l-2.2 5.1H32v-3.7l2.5 3.7H36l2.5-3.8v3.8h1.7v-2.4h2c1.3 0 2.1-.6 2.1-1.9 0-1.2-.8-1.8-2-1.8h-1.9zm.2 2.7h-1.9v-1.4h1.9c.5 0 .8.2.8.7 0 .4-.3.7-.8.7z" fill="#ffffff" />
    </svg>
  ),
  discover: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" />
      <path d="M48 22c0 1.1-.9 2-2 2H22s14.4-3.7 26-9.5V22z" fill="#f48120" />
      <circle cx="24" cy="16" r="3.5" fill="#f48120" />
      <text x="4" y="20" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="700" fill="#000">DISC</text>
      <text x="28" y="20" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="700" fill="#000">VER</text>
    </svg>
  ),
  paypal: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" />
      <path d="M18.5 9h6.7c2.4 0 4.4.6 5.5 1.8 1 1.1 1.3 2.6 1 4.6-.6 3.7-3 5.7-7 5.7h-2c-.4 0-.7.3-.8.7l-.6 3.6c-.1.3-.3.6-.7.6h-3.4c-.3 0-.5-.3-.4-.6L18.5 9z" fill="#003087" />
      <path d="M31.7 14.3c-.1.6-.2 1.1-.4 1.7-1 4.7-4.2 6.3-8.3 6.3h-2.1c-.5 0-.9.4-1 .8l-1 6.4-.3 1.7c-.1.3.1.6.5.6h3.7c.4 0 .8-.3.9-.7l.5-3 .6-3.4c.1-.4.4-.7.9-.7h.6c3.6 0 6.4-1.5 7.2-5.7.4-1.7.2-3.2-.7-4.2-.4-.4-.9-.7-1.5-.9-.4 0-.6 0-.6.1z" fill="#009cde" />
      <path d="M30.7 13.9c-.2-.1-.3-.1-.5-.1-.2 0-.3-.1-.5-.1-.6-.1-1.2-.1-1.8-.1h-5.3c-.1 0-.2 0-.4.1-.2.1-.4.4-.4.6l-1.2 7.4v.2c.1-.5.5-.8 1-.8h2.1c4 0 7.3-1.6 8.3-6.3.1-.1.1-.3.1-.4-.3-.1-.5-.3-.8-.4-.2-.1-.4-.1-.6-.1z" fill="#012169" />
    </svg>
  ),
  gpay: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e0e0e0" strokeWidth="0.5" />
      <path d="M22.6 16.4v3.4h-1.1v-8.5h2.9c.7 0 1.4.3 1.9.8s.7 1.1.7 1.8c0 .7-.2 1.3-.7 1.8s-1.1.7-1.9.7h-1.8zm0-4v3h1.8c.4 0 .8-.2 1.1-.5.6-.6.6-1.5 0-2-.3-.3-.7-.5-1.1-.5h-1.8zM27.7 14.5c.8 0 1.4.2 1.9.6.5.4.7 1 .7 1.7v3.4h-1V19.2h-.1c-.4.6-1 1-1.8 1-.6 0-1.1-.2-1.6-.6-.4-.4-.6-.8-.6-1.4 0-.6.2-1.1.6-1.4.4-.4 1-.5 1.8-.5.6 0 1.2.1 1.6.4v-.2c0-.3-.1-.7-.4-.9-.3-.3-.6-.4-1-.4-.6 0-1 .2-1.4.7l-.9-.6c.6-.7 1.2-.8 2.2-.8zm-1.4 4.2c0 .3.1.5.4.7.2.2.5.3.8.3.4 0 .9-.2 1.2-.5.4-.3.6-.7.6-1.2-.4-.3-.9-.4-1.6-.4-.5 0-.9.1-1.2.3-.2.2-.2.5-.2.8zM35.3 14.7L31.7 23h-1.1l1.4-2.9-2.4-5.4h1.2l1.7 4.1 1.7-4.1h1.1z" fill="#5f6368" />
      <path d="M19.4 15.4c0-.3 0-.7-.1-1h-4.6v1.9h2.6c-.1.6-.5 1.1-1 1.4v1.2h1.6c.9-.9 1.5-2.1 1.5-3.5z" fill="#4285f4" />
      <path d="M14.7 20.2c1.3 0 2.4-.4 3.2-1.2l-1.6-1.2c-.4.3-1 .5-1.7.5-1.3 0-2.4-.9-2.8-2H10.3v1.3c.8 1.6 2.5 2.6 4.4 2.6z" fill="#34a853" />
      <path d="M11.9 16.4c-.2-.6-.2-1.3 0-1.9V13.2H10.3c-.7 1.3-.7 2.9 0 4.3l1.6-1.1z" fill="#fbbc04" />
      <path d="M14.7 12.5c.7 0 1.4.3 1.9.7l1.4-1.4c-.9-.8-2.1-1.3-3.3-1.3-1.9 0-3.6 1-4.4 2.7l1.6 1.3c.4-1.1 1.5-2 2.8-2z" fill="#ea4335" />
    </svg>
  ),
  applepay: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e0e0e0" strokeWidth="0.5" />
      <path d="M13.4 13.6c-.4.4-1 .8-1.6.7-.1-.6.2-1.3.6-1.6.4-.4 1-.8 1.6-.8 0 .6-.2 1.3-.6 1.7zm.5.9c-.9-.1-1.6.5-2 .5s-1-.5-1.7-.4c-.9 0-1.7.5-2.1 1.3-.9 1.6-.2 3.9.7 5.2.4.6.9 1.3 1.6 1.3.6 0 .9-.4 1.7-.4s1 .4 1.7.4c.7 0 1.2-.6 1.6-1.3.5-.7.7-1.4.7-1.5 0 0-1.4-.5-1.4-2.1 0-1.3 1.1-1.9 1.1-2-.6-.8-1.5-1-1.9-1zM19.6 12.7v8h1.2v-2.7h1.7c1.6 0 2.7-1.1 2.7-2.7s-1.1-2.7-2.6-2.7h-3zm1.2 1.1h1.4c1.1 0 1.7.6 1.7 1.6s-.6 1.6-1.7 1.6h-1.4v-3.2zM27 20.7c.8 0 1.5-.4 1.8-1h.1v.9h1.1v-3.9c0-1.2-.9-1.9-2.4-1.9-1.3 0-2.3.7-2.3 1.8h1.1c.1-.5.6-.8 1.2-.8.8 0 1.2.4 1.2 1v.5l-1.6.1c-1.5.1-2.3.7-2.3 1.7s.8 1.6 1.8 1.6h.3zm.3-.9c-.7 0-1.1-.3-1.1-.8 0-.5.4-.8 1.2-.9l1.4-.1v.5c0 .7-.6 1.3-1.5 1.3zM31.4 22.8c1.2 0 1.7-.4 2.2-1.7l2.1-5.8h-1.2l-1.4 4.5-1.4-4.5h-1.3l2 5.5-.1.3c-.2.6-.5.8-1 .8-.1 0-.3 0-.4 0v.9c.1 0 .3 0 .5 0z" fill="#000000" />
    </svg>
  ),
  unionpay: (
    <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="32" rx="4" fill="#ffffff" />
      <path d="M11.6 8h7.5c.9 0 1.5.8 1.3 1.7l-2.8 12.6c-.2.9-1.1 1.7-2 1.7H8.1c-.9 0-1.5-.8-1.3-1.7L9.6 9.7C9.8 8.8 10.7 8 11.6 8z" fill="#e21836" />
      <path d="M18.5 8h8.6c.9 0 .5.8.3 1.7l-2.8 12.6c-.2.9-.1 1.7-1 1.7h-8.6c-.9 0-1.5-.8-1.3-1.7l2.8-12.6C16.7 8.8 17.6 8 18.5 8z" fill="#00447c" />
      <path d="M26.7 8h7.5c.9 0 1.5.8 1.3 1.7l-2.8 12.6c-.2.9-1.1 1.7-2 1.7h-7.5c-.9 0-1.5-.8-1.3-1.7l2.8-12.6c.2-.9 1.1-1.7 2-1.7z" fill="#007b84" />
      <text x="11" y="18" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="700" fill="#fefefe">Union</text>
      <text x="11" y="22" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="700" fill="#fefefe">Pay</text>
    </svg>
  ),
};

export default function PaymentIcons({ methods, className = 'footer-payment-icons' }) {
  const list = Array.isArray(methods) && methods.length > 0 ? methods : null;
  if (list === null) return null;
  const valid = list.filter((id) => ICONS[id]);
  if (valid.length === 0) return null;
  const labels = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label]));
  return (
    <div className={className}>
      {valid.map((id) => (
        <span key={id} aria-label={labels[id] || id} title={labels[id] || id}>
          {ICONS[id]}
        </span>
      ))}
    </div>
  );
}
