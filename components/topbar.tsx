import Link from 'next/link';

export function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border-b border-[var(--border)] px-8 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-bold text-base text-[var(--text)] tracking-tight no-underline">
          AIVC Company Tracker
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    initial_contact: 'bg-[#f1f3f5] text-[#6c757d]',
    monitoring: 'bg-[#e9ecef] text-[#495057]',
    active_evaluation: 'bg-[var(--accent-light)] text-[var(--accent)]',
    due_diligence: 'bg-[var(--purple-bg)] text-[var(--purple)]',
    term_sheet: 'bg-[var(--amber-bg)] text-[var(--amber)]',
    invested: 'bg-[var(--green-bg)] text-[var(--green)]',
  };
  const labels: Record<string, string> = {
    initial_contact: 'Initial Contact',
    monitoring: 'Monitoring',
    active_evaluation: 'Active Evaluation',
    due_diligence: 'Due Diligence',
    term_sheet: 'Term Sheet',
    invested: 'Portfolio',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styles[stage] || styles.monitoring}`}>
      {labels[stage] || stage}
    </span>
  );
}

export function BriefStatusBadge({ status, generatedAt }: { status: string; generatedAt?: string | null }) {
  if (status === 'ready') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--green-bg)] text-[var(--green)]">Current</span>;
  }
  if (status === 'generating') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent)]">Generating...</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--red-bg)] text-[var(--red)]">Error</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f5] text-[var(--text-secondary)]">Pending</span>;
}

export function Card({ title, children, headerRight }: { title: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl mb-4 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-[var(--border-light)] flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
