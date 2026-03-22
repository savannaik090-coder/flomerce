export function formatDateForAdmin(dateStr, timezone) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  if (timezone) opts.timeZone = timezone;
  try {
    return d.toLocaleString('en-IN', opts);
  } catch (e) {
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function formatDateShortForAdmin(dateStr, timezone) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (timezone) opts.timeZone = timezone;
  try {
    return d.toLocaleDateString('en-IN', opts);
  } catch (e) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

export function formatDateForCustomer(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShortForCustomer(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateForEmail(dateStr, timezone) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
  if (timezone) opts.timeZone = timezone;
  try {
    return d.toLocaleString('en-IN', opts);
  } catch (e) {
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function getStartOfDayInTimezone(timezone) {
  const now = new Date();
  if (!timezone) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const [y, m, d] = parts.split('-').map(Number);
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
    const nowInTz = formatter.format(now);
    const match = nowInTz.match(/GMT([+-]?\d+:?\d*)/);
    let offsetMs = 0;
    if (match) {
      const [h, min] = match[1].split(':').map(Number);
      offsetMs = (h * 60 + (min || 0)) * 60000;
    }
    const utcMidnight = Date.UTC(y, m - 1, d) - offsetMs;
    return new Date(utcMidnight);
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

export function getStartOfMonthInTimezone(timezone) {
  const now = new Date();
  if (!timezone) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(now);
    const [y, m] = parts.split('-').map(Number);
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
    const nowInTz = formatter.format(now);
    const match = nowInTz.match(/GMT([+-]?\d+:?\d*)/);
    let offsetMs = 0;
    if (match) {
      const [h, min] = match[1].split(':').map(Number);
      offsetMs = (h * 60 + (min || 0)) * 60000;
    }
    const utcFirst = Date.UTC(y, m - 1, 1) - offsetMs;
    return new Date(utcFirst);
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export function safeFormatInTimezone(date, timezone, opts = {}) {
  try {
    if (timezone) opts.timeZone = timezone;
    return date.toLocaleString('en-IN', opts);
  } catch {
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export const TIMEZONE_OPTIONS = [
  { value: '', label: 'Auto (Browser Default)' },
  { value: 'Asia/Kolkata', label: '🇮🇳 India (IST, UTC+5:30)' },
  { value: 'America/New_York', label: '🇺🇸 US Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: '🇺🇸 US Central (CST/CDT)' },
  { value: 'America/Denver', label: '🇺🇸 US Mountain (MST/MDT)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 US Pacific (PST/PDT)' },
  { value: 'Europe/London', label: '🇬🇧 UK (GMT/BST)' },
  { value: 'Europe/Paris', label: '🇫🇷 Central Europe (CET/CEST)' },
  { value: 'Europe/Berlin', label: '🇩🇪 Germany (CET/CEST)' },
  { value: 'Asia/Dubai', label: '🇦🇪 UAE (GST, UTC+4)' },
  { value: 'Asia/Riyadh', label: '🇸🇦 Saudi Arabia (AST, UTC+3)' },
  { value: 'Asia/Singapore', label: '🇸🇬 Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Japan (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: '🇨🇳 China (CST, UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '🇭🇰 Hong Kong (HKT, UTC+8)' },
  { value: 'Australia/Sydney', label: '🇦🇺 Australia Eastern (AEST/AEDT)' },
  { value: 'Australia/Perth', label: '🇦🇺 Australia Western (AWST)' },
  { value: 'Pacific/Auckland', label: '🇳🇿 New Zealand (NZST/NZDT)' },
  { value: 'America/Toronto', label: '🇨🇦 Canada Eastern (EST/EDT)' },
  { value: 'America/Vancouver', label: '🇨🇦 Canada Pacific (PST/PDT)' },
  { value: 'Asia/Karachi', label: '🇵🇰 Pakistan (PKT, UTC+5)' },
  { value: 'Asia/Dhaka', label: '🇧🇩 Bangladesh (BST, UTC+6)' },
  { value: 'Asia/Colombo', label: '🇱🇰 Sri Lanka (SLST, UTC+5:30)' },
  { value: 'Africa/Lagos', label: '🇳🇬 Nigeria (WAT, UTC+1)' },
  { value: 'Africa/Johannesburg', label: '🇿🇦 South Africa (SAST, UTC+2)' },
  { value: 'America/Sao_Paulo', label: '🇧🇷 Brazil (BRT, UTC-3)' },
  { value: 'Asia/Kuala_Lumpur', label: '🇲🇾 Malaysia (MYT, UTC+8)' },
  { value: 'Asia/Jakarta', label: '🇮🇩 Indonesia Western (WIB, UTC+7)' },
  { value: 'Asia/Seoul', label: '🇰🇷 South Korea (KST, UTC+9)' },
  { value: 'Asia/Kathmandu', label: '🇳🇵 Nepal (NPT, UTC+5:45)' },
];
