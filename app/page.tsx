'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Topbar, StageBadge, BriefStatusBadge } from '@/components/topbar';

interface Company {
  id: string;
  name: string;
  description: string;
  industry: string;
  sub_industry: string;
  pipeline_stage: string;
  last_contact_date: string | null;
  aivc_lead: string;
  aivc_team: string[];
  deal_size: number | null;
  aivc_investment: number | null;
  board_role: string | null;
  brief_status: string | null;
  brief_generated_at: string | null;
}

const STAGE_ORDER: Record<string, number> = {
  term_sheet: 0,
  due_diligence: 1,
  active_evaluation: 2,
  initial_contact: 3,
  monitoring: 4,
};

const TEAM_NAMES: Record<string, string> = {
  'sarah-chen': 'Sarah Chen',
  'david-okonkwo': 'David Okonkwo',
  'maya-patel': 'Maya Patel',
  'james-morrison': 'James Morrison',
  'elena-rodriguez': 'Elena Rodriguez',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function shortName(name: string) {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function TablePage() {
  return (
    <Suspense>
      <TablePageInner />
    </Suspense>
  );
}

function TablePageInner() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const initialTab = searchParams.get('tab') === 'portfolio' ? 'portfolio' : 'pipeline';
  const [tab, setTab] = useState<'pipeline' | 'portfolio'>(initialTab);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then(data => { setCompanies(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pipeline = useMemo(() =>
    companies
      .filter(c => c.pipeline_stage !== 'invested')
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const stageA = STAGE_ORDER[a.pipeline_stage] ?? 99;
        const stageB = STAGE_ORDER[b.pipeline_stage] ?? 99;
        if (stageA !== stageB) return stageA - stageB;
        if (!a.last_contact_date) return 1;
        if (!b.last_contact_date) return -1;
        return new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime();
      }),
    [companies, search]
  );

  const portfolio = useMemo(() =>
    companies
      .filter(c => c.pipeline_stage === 'invested')
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase())),
    [companies, search]
  );

  const pipelineCount = companies.filter(c => c.pipeline_stage !== 'invested').length;
  const portfolioCount = companies.filter(c => c.pipeline_stage === 'invested').length;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar />

      <div className="flex gap-0 border-b border-[var(--border)] bg-[var(--surface)] px-8">
        <button
          onClick={() => setTab('pipeline')}
          className={`px-5 py-3 text-sm font-medium border-b-2 cursor-pointer transition-colors bg-transparent border-t-0 border-l-0 border-r-0 ${tab === 'pipeline' ? 'text-[var(--accent)] border-b-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)] border-b-transparent hover:text-[var(--text)]'}`}
        >
          Pipeline <span className="bg-[var(--bg)] px-1.5 py-0.5 rounded-full text-xs ml-1.5 text-[var(--text-tertiary)] font-medium">{pipelineCount}</span>
        </button>
        <button
          onClick={() => setTab('portfolio')}
          className={`px-5 py-3 text-sm font-medium border-b-2 cursor-pointer transition-colors bg-transparent border-t-0 border-l-0 border-r-0 ${tab === 'portfolio' ? 'text-[var(--accent)] border-b-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)] border-b-transparent hover:text-[var(--text)]'}`}
        >
          Portfolio <span className="bg-[var(--bg)] px-1.5 py-0.5 rounded-full text-xs ml-1.5 text-[var(--text-tertiary)] font-medium">{portfolioCount}</span>
        </button>
      </div>

      <div className="flex items-center justify-between px-8 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-1.5 w-70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)] shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-none bg-transparent outline-none text-[13px] text-[var(--text)] w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">Loading...</div>
      ) : tab === 'pipeline' ? (
        <PipelineTable companies={pipeline} />
      ) : (
        <PortfolioTable companies={portfolio} />
      )}
    </div>
  );
}

function PipelineTable({ companies }: { companies: Company[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {['Company', 'Stage', 'Industry', 'Last Contact', 'Lead', 'Team', 'Brief'].map(h => (
            <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)] bg-[var(--bg)] sticky top-0">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {companies.map(c => (
          <tr key={c.id} className="cursor-pointer hover:bg-[#f8fafc]" onClick={() => window.location.href = `/company/${c.id}`}>
            <td className="px-4 py-3 border-b border-[var(--border-light)]">
              <div className="font-semibold text-[var(--text)]">{c.name}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5 max-w-80 truncate">{c.description}</div>
            </td>
            <td className="px-4 py-3 border-b border-[var(--border-light)]"><StageBadge stage={c.pipeline_stage} /></td>
            <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{c.industry}</td>
            <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{relativeDate(c.last_contact_date)}</td>
            <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{shortName(TEAM_NAMES[c.aivc_lead] || c.aivc_lead)}</td>
            <td className="px-4 py-3 border-b border-[var(--border-light)]">
              <div className="flex">
                {c.aivc_team.map((id, i) => (
                  <div key={id} className="w-6 h-6 bg-[var(--border)] rounded-full flex items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)] border-2 border-white" style={{ marginLeft: i > 0 ? -6 : 0 }}>
                    {getInitials(TEAM_NAMES[id] || id)}
                  </div>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 border-b border-[var(--border-light)]">
              <BriefStatusBadge status={c.brief_status || 'none'} generatedAt={c.brief_generated_at} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PortfolioTable({ companies }: { companies: Company[] }) {
  const [metrics, setMetrics] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    Promise.all(
      companies.map(c =>
        fetch(`/api/companies/${c.id}`).then(r => r.json()).then(data => ({
          id: c.id,
          metrics: Object.fromEntries((data.metrics || []).map((m: { metric_name: string; value: number }) => [m.metric_name, Number(m.value)])),
        }))
      )
    ).then(results => {
      const m: Record<string, Record<string, number>> = {};
      for (const r of results) m[r.id] = r.metrics;
      setMetrics(m);
    });
  }, [companies]);

  const sorted = [...companies].sort((a, b) => {
    const arrA = metrics[a.id]?.arr || 0;
    const arrB = metrics[b.id]?.arr || 0;
    return arrB - arrA;
  });

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {['Company', 'Industry', 'ARR', 'Growth', 'Runway', 'Investment', 'Board Role', 'Lead', 'Brief'].map(h => (
            <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)] bg-[var(--bg)] sticky top-0">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(c => {
          const m = metrics[c.id] || {};
          return (
            <tr key={c.id} className="cursor-pointer hover:bg-[#f8fafc]" onClick={() => window.location.href = `/company/${c.id}`}>
              <td className="px-4 py-3 border-b border-[var(--border-light)]">
                <div className="font-semibold text-[var(--text)]">{c.name}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5 max-w-80 truncate">{c.description}</div>
              </td>
              <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{c.industry}</td>
              <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{m.arr ? formatCurrency(m.arr) : '—'}</td>
              <td className="px-4 py-3 border-b border-[var(--border-light)]">
                {m.arr_growth_qoq ? <span className="text-xs font-semibold text-[var(--green)]">+{m.arr_growth_qoq.toFixed(1)}%</span> : '—'}
              </td>
              <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{m.cash_runway_months ? `${m.cash_runway_months} mo` : '—'}</td>
              <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{c.aivc_investment ? formatCurrency(c.aivc_investment) : '—'}</td>
              <td className="px-4 py-3 border-b border-[var(--border-light)]">
                {c.board_role === 'board_seat' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--purple-bg)] text-[var(--purple)]">Board Seat</span>}
                {c.board_role === 'board_observer' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent)]">Observer</span>}
              </td>
              <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text)]">{shortName(TEAM_NAMES[c.aivc_lead] || c.aivc_lead)}</td>
              <td className="px-4 py-3 border-b border-[var(--border-light)]">
                <BriefStatusBadge status={c.brief_status || 'none'} generatedAt={c.brief_generated_at} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
