/* Formatting helpers for currency, dates, and labels. */

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/* Returns the next N calendar dates as { value: 'YYYY-MM-DD', label } objects. */
export function upcomingDates(count = 14): Array<{ value: string; label: string; weekday: string }> {
  const out: Array<{ value: string; label: string; weekday: string }> = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    out.push({
      value,
      label: `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    });
  }
  return out;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return '#2B8A3E';
    case 'PENDING':
      return '#E8590C';
    case 'IN_PROGRESS':
      return '#1C7ED6';
    case 'CANCELLED':
      return '#E03131';
    default:
      return '#8A8A8F';
  }
}
