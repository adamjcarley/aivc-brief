'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Topbar, StageBadge, Card } from '@/components/topbar';

interface CompanyData {
  company: Record<string, string | number | string[] | null>;
  brief: { status: string; content: Record<string, unknown> | null; generated_at: string | null; error: string | null } | null;
  documents: Array<Record<string, unknown>>;
  pitchbook: Array<Record<string, unknown>>;
  metrics: Array<{ metric_name: string; value: number }>;
  team: Array<{ id: string; name: string; role: string }>;
}

const TEAM_NAMES: Record<string, string> = {
  'sarah-chen': 'Sarah Chen',
  'david-okonkwo': 'David Okonkwo',
  'maya-patel': 'Maya Patel',
  'james-morrison': 'James Morrison',
  'elena-rodriguez': 'Elena Rodriguez',
};

export default function CompanyBriefPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(() => {
    fetch(`/api/companies/${slug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/briefs/${slug}/generate`, { method: 'POST' });
      loadData();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  if (loading) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text-tertiary)]">Loading...</div>;
  if (!data) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text-tertiary)]">Company not found</div>;

  const { company, brief } = data;
  const briefContent = brief?.content as Record<string, unknown> | null;
  const hasBrief = brief?.status === 'ready' && briefContent;
  const stage = company.pipeline_stage as string;
  const isPipeline = stage !== 'invested';
  const stageLabel = isPipeline
    ? { term_sheet: 'Term Sheet', due_diligence: 'Due Diligence', active_evaluation: 'Active Evaluation', initial_contact: 'Initial Contact', monitoring: 'Monitoring' }[stage] || stage
    : 'Portfolio';

  const relTime = brief?.generated_at
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(brief.generated_at).getTime()) / 60000);
        if (diff < 1) return 'just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return `${Math.floor(diff / 1440)}d ago`;
      })()
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar>
        {relTime && (
          <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            Brief generated {relTime}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
        >
          {generating ? 'Generating...' : hasBrief ? 'Regenerate' : 'Generate Brief'}
        </button>
      </Topbar>

      {/* Company Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-8 pt-6 pb-5">
        <div className="text-xs text-[var(--text-tertiary)] mb-2">
          <Link href="/" className="text-[var(--accent)] no-underline">{isPipeline ? 'Pipeline' : 'Portfolio'}</Link> &rsaquo; {stageLabel}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <StageBadge stage={stage} />
              <span className="text-[13px] text-[var(--text-secondary)]">{company.industry} &middot; {company.sub_industry}</span>
              <span className="text-[13px] text-[var(--text-secondary)]">&middot; {company.location}</span>
              <span className="text-[13px] text-[var(--text-secondary)]">&middot; Lead: {TEAM_NAMES[company.aivc_lead as string] || company.aivc_lead}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-8 py-6">
        {generating && (
          <div className="bg-[var(--accent-light)] text-[var(--accent)] text-sm font-medium px-5 py-3 rounded-xl mb-4 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Generating brief... This takes 15-30 seconds.
          </div>
        )}

        {brief?.status === 'error' && (
          <div className="bg-[var(--red-bg)] text-[var(--red)] text-sm px-5 py-3 rounded-xl mb-4">
            Error generating brief: {brief.error}
          </div>
        )}

        {!hasBrief && !generating && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center mb-4">
            <p className="text-[var(--text-secondary)] mb-4">No brief has been generated for this company yet.</p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer bg-[var(--accent)] text-white border-none hover:bg-[#1d4ed8]"
            >
              Generate Brief
            </button>
          </div>
        )}

        {hasBrief && isPipeline && <PipelineBriefContent brief={briefContent} company={company} />}
        {hasBrief && !isPipeline && <PortfolioBriefContent brief={briefContent} />}
      </div>
    </div>
  );
}

function FreshnessGrid({ freshness }: { freshness: Array<{ source_type: string; last_updated: string; status: string }> }) {
  return (
    <div className="text-[13px]">
      {freshness.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-0">
          <span className="px-3 py-2 font-medium text-[var(--text)] border-b border-[var(--border-light)]">{f.source_type}</span>
          <span className="px-3 py-2 text-[var(--text-secondary)] text-right border-b border-[var(--border-light)]">
            {new Date(f.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="px-3 py-2 text-right border-b border-[var(--border-light)]">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${f.status === 'current' ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--amber-bg)] text-[var(--amber)]'}`}>
              {f.status === 'current' ? 'Current' : 'Stale'}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: { questions: Array<{ key: string; question: string; answer: string }>; actions: string[] } }) {
  return (
    <Card title="Assessment">
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          {assessment.questions.map(q => (
            <div key={q.key}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">{q.question}</h3>
              <p className="text-sm text-[var(--text)] leading-relaxed">{q.answer}</p>
            </div>
          ))}
        </div>
        {assessment.actions.length > 0 && (
          <div className="border-t border-[var(--border-light)] mt-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Actions We Should Take</h3>
            <ul className="list-none flex flex-col gap-1.5">
              {assessment.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text)] leading-snug">
                  <span className="w-1.5 h-1.5 bg-[var(--amber)] rounded-full mt-1.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function NarrativeSection({ narrative }: { narrative: { company_overview: string; company_updates: Array<{ text: string; date: string; source: string }>; market_updates: Array<{ text: string; date: string; source: string }> } }) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-[13px] font-bold text-[var(--text)] mb-2">Company Overview</h3>
        {narrative.company_overview.split('\n').filter(Boolean).map((p, i) => (
          <p key={i} className="text-sm text-[var(--text)] leading-relaxed mb-2.5">{p}</p>
        ))}
      </div>
      {narrative.company_updates.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[13px] font-bold text-[var(--text)] mb-2">Company Updates</h3>
          {narrative.company_updates.map((u, i) => (
            <p key={i} className="text-sm text-[var(--text)] leading-relaxed mb-2.5">
              {u.text}
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded ml-1">
                {new Date(u.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {u.source}
              </span>
            </p>
          ))}
        </div>
      )}
      {narrative.market_updates.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[13px] font-bold text-[var(--text)] mb-2">Market Updates</h3>
          {narrative.market_updates.map((u, i) => (
            <p key={i} className="text-sm text-[var(--text)] leading-relaxed mb-2.5">
              {u.text}
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded ml-1">
                {new Date(u.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {u.source}
              </span>
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function PipelineBriefContent({ brief, company }: { brief: Record<string, unknown>; company: Record<string, string | number | string[] | null> }) {
  const exec = brief.executive_summary as { company_overview: string; where_we_stand: string; actions: string } | undefined;
  const keyMetrics = brief.key_metrics as { industry: string; sub_industry?: string; business_model: string; traction: string; last_raise: string } | undefined;
  const assessment = brief.assessment as { questions: Array<{ key: string; question: string; answer: string }>; actions: string[] } | undefined;
  const narrative = brief.narrative as { company_overview: string; company_updates: Array<{ text: string; date: string; source: string }>; market_updates: Array<{ text: string; date: string; source: string }> } | undefined;
  const freshness = brief.data_freshness as Array<{ source_type: string; last_updated: string; status: string }> | undefined;

  return (
    <>
      {exec && (
        <Card title="Executive Summary">
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Company Overview</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.company_overview}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Where We Stand</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.where_we_stand}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Actions</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.actions}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {keyMetrics && (
        <Card title="Key Metrics">
          <div className="grid grid-cols-4 gap-px bg-[var(--border-light)]">
            {[
              { label: 'Industry', value: keyMetrics.industry, sub: keyMetrics.sub_industry || (company.sub_industry as string) },
              { label: 'Business Model', value: keyMetrics.business_model, sub: '' },
              { label: 'Traction', value: keyMetrics.traction, sub: '' },
              { label: 'Last Raise', value: keyMetrics.last_raise, sub: '' },
            ].map(m => (
              <div key={m.label} className="bg-[var(--surface)] p-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{m.label}</div>
                <div className="text-base font-bold text-[var(--text)] tracking-tight">{m.value}</div>
                {m.sub && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{m.sub}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {assessment && <AssessmentCard assessment={assessment} />}

      {narrative && (
        <Card title="Narrative">
          <div className="p-5">
            <NarrativeSection narrative={narrative} />
          </div>
        </Card>
      )}

      {freshness && freshness.length > 0 && (
        <Card title="Data Freshness">
          <FreshnessGrid freshness={freshness} />
        </Card>
      )}
    </>
  );
}

function PortfolioBriefContent({ brief }: { brief: Record<string, unknown> }) {
  const exec = brief.executive_summary as { company_overview: string; trajectory?: string; where_we_stand?: string; actions: string } | undefined;
  const keyMetrics = brief.key_metrics as Array<{ label: string; value: string; delta: string; direction: 'up' | 'down' | 'flat' }> | undefined;
  const assessment = brief.assessment as { questions: Array<{ key: string; question: string; answer: string }>; actions: string[] } | undefined;
  const narrative = brief.narrative as {
    company_overview: string;
    company_updates: Array<{ text: string; date: string; source: string }>;
    market_updates: Array<{ text: string; date: string; source: string }>;
    all_metrics?: Array<{ metric: string; prev_value: string; current_value: string; change: string; direction: 'up' | 'down' | 'flat' }>;
  } | undefined;
  const freshness = brief.data_freshness as Array<{ source_type: string; last_updated: string; status: string }> | undefined;

  return (
    <>
      {exec && (
        <Card title="Executive Summary">
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Company & Investment Overview</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.company_overview}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Trajectory</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.trajectory || exec.where_we_stand}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Actions</h3>
                <p className="text-sm text-[var(--text)] leading-relaxed">{exec.actions}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {keyMetrics && Array.isArray(keyMetrics) && (
        <Card title="Key Metrics">
          <div className="grid grid-cols-4 gap-px bg-[var(--border-light)]">
            {keyMetrics.map(m => (
              <div key={m.label} className="bg-[var(--surface)] p-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{m.label}</div>
                <div className="text-xl font-bold text-[var(--text)] tracking-tight">{m.value}</div>
                {m.delta && (
                  <div className={`text-xs font-semibold mt-0.5 ${m.direction === 'up' ? 'text-[var(--green)]' : m.direction === 'down' ? 'text-[var(--red)]' : 'text-[var(--text-secondary)]'}`}>
                    {m.delta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {assessment && <AssessmentCard assessment={assessment} />}

      {narrative && (
        <Card title="Narrative">
          <div className="p-5">
            <NarrativeSection narrative={narrative} />

            {narrative.all_metrics && narrative.all_metrics.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[13px] font-bold text-[var(--text)] mb-2">All Metrics</h3>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)]">Metric</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)]">Previous</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)]">Current</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)]">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {narrative.all_metrics.map((m, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium border-b border-[var(--border-light)]">{m.metric}</td>
                        <td className="py-2 px-3 border-b border-[var(--border-light)]">{m.prev_value}</td>
                        <td className="py-2 px-3 border-b border-[var(--border-light)]">{m.current_value}</td>
                        <td className="py-2 px-3 border-b border-[var(--border-light)]">
                          <span className={`text-xs font-semibold ${m.direction === 'up' ? 'text-[var(--green)]' : m.direction === 'down' ? 'text-[var(--red)]' : 'text-[var(--text-secondary)]'}`}>
                            {m.change}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {freshness && freshness.length > 0 && (
              <div>
                <h3 className="text-[13px] font-bold text-[var(--text)] mb-2">Data Freshness</h3>
                <FreshnessGrid freshness={freshness} />
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
