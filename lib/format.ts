export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function formatLastRaise(pitchbookEvents: Array<{
  round: string;
  date: string | null;
  amount: number;
  lead_investor: string | null;
}>): string {
  if (!pitchbookEvents.length) return 'No funding data';
  const sorted = [...pitchbookEvents].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const latest = sorted[0];
  if (!latest.date || latest.amount === 0) return latest.round;
  const dateStr = new Date(latest.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const parts = [formatCurrency(latest.amount), latest.round];
  const detail = [latest.lead_investor, dateStr].filter(Boolean).join(', ');
  if (detail) parts.push(`(${detail})`);
  return parts.join(' ');
}

export function relativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const STAGE_ORDER: Record<string, number> = {
  term_sheet: 0,
  due_diligence: 1,
  active_evaluation: 2,
  initial_contact: 3,
  monitoring: 4,
};

export const STAGE_LABELS: Record<string, string> = {
  term_sheet: 'Term Sheet',
  due_diligence: 'Due Diligence',
  active_evaluation: 'Active Evaluation',
  initial_contact: 'Initial Contact',
  monitoring: 'Monitoring',
  invested: 'Portfolio',
};

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
