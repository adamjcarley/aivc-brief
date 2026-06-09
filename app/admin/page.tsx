'use client';

import { useState, useEffect } from 'react';
import { Topbar } from '@/components/topbar';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  pipeline_stage: string;
}

interface LogEntry {
  id: number;
  company_id: string;
  company_name: string;
  event_type: string;
  detail: string;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  invested: 'Portfolio',
  term_sheet: 'Pipeline — Term Sheet',
  due_diligence: 'Pipeline — Due Diligence',
  active_evaluation: 'Pipeline — Active Evaluation',
  monitoring: 'Pipeline — Monitoring',
  initial_contact: 'Pipeline — Initial Contact',
};

const STAGE_ORDER = ['invested', 'term_sheet', 'due_diligence', 'active_evaluation', 'monitoring', 'initial_contact'];

const DOC_TYPES = [
  { value: 'meeting_note', label: 'Meeting note' },
  { value: 'email', label: 'Email / correspondence' },
  { value: 'about_page', label: 'Company about page' },
  { value: 'press_article', label: 'Press article' },
  { value: 'competitor_press', label: 'Competitor press' },
  { value: 'slack_thread', label: 'Slack thread' },
  { value: 'portco_update', label: 'Portfolio company update' },
];

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [docType, setDocType] = useState('');
  const [guidance, setGuidance] = useState('');
  const [status, setStatus] = useState<'idle' | 'generating_doc' | 'regenerating_brief' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(setCompanies);
    fetch('/api/generation-log').then(r => r.json()).then(setLog);
  }, []);

  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const cs = companies.filter(c => c.pipeline_stage === stage);
    if (cs.length > 0) acc.push({ stage, label: STAGE_LABELS[stage] || stage, companies: cs });
    return acc;
  }, [] as Array<{ stage: string; label: string; companies: Company[] }>);

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try { return JSON.parse(text); } catch {
      throw new Error(res.ok ? text.slice(0, 200) : `Server error (${res.status}): ${text.slice(0, 200)}`);
    }
  }

  const handleGenerate = async () => {
    if (!selectedCompany || !docType) return;
    setStatus('generating_doc');
    setStatusMessage('Generating synthetic document...');
    try {
      const res = await fetch(`/api/documents/${selectedCompany}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, guidance: guidance || undefined }),
      });
      const data = await safeJson(res);
      if (data.status === 'error') {
        setStatus('error');
        setStatusMessage(`Error: ${data.error}`);
        return;
      }
      setStatus('regenerating_brief');
      setStatusMessage(`Document "${(data.document as Record<string, string>)?.title}" created. Regenerating brief...`);
      fetch('/api/generation-log').then(r => r.json()).then(setLog);

      const briefRes = await fetch(`/api/briefs/${selectedCompany}/generate`, { method: 'POST' });
      const briefData = await safeJson(briefRes);
      if (briefData.status === 'error') {
        setStatus('error');
        setStatusMessage(`Document created but brief failed: ${briefData.error}`);
        return;
      }
      setStatus('done');
      setStatusMessage(`Done! Document "${(data.document as Record<string, string>)?.title}" created and brief regenerated.`);
      fetch('/api/generation-log').then(r => r.json()).then(setLog);
    } catch (e) {
      setStatus('error');
      setStatusMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  function relTime(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar>
        <Link href="/" className="text-xs text-[var(--accent)] no-underline">&larr; Back to table</Link>
      </Topbar>

      <div className="max-w-[640px] mx-auto p-8">
        {/* Generate Form */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-light)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Generate Synthetic Data</h2>
          </div>
          <div className="p-5">
            <div className="mb-5">
              <label className="block text-[13px] font-semibold text-[var(--text)] mb-1.5">Company</label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm text-[var(--text)] bg-[var(--surface)] cursor-pointer focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.1)]"
              >
                <option value="">Select a company...</option>
                {grouped.map(g => (
                  <optgroup key={g.stage} label={g.label}>
                    {g.companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-semibold text-[var(--text)] mb-1.5">Document Type</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm text-[var(--text)] bg-[var(--surface)] cursor-pointer focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.1)]"
              >
                <option value="">Select a document type...</option>
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-semibold text-[var(--text)] mb-1">
                Guidance <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <div className="text-xs text-[var(--text-tertiary)] mb-2">Describe what the document should contain. Leave blank for fully AI-generated content.</div>
              <textarea
                value={guidance}
                onChange={e => setGuidance(e.target.value)}
                placeholder="e.g. A meeting note from a follow-up call with the CEO. They shared Q2 revenue numbers and mentioned plans to expand into the European market."
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm text-[var(--text)] bg-[var(--surface)] font-[inherit] resize-y min-h-[100px] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.1)]"
              />
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={handleGenerate}
                disabled={!selectedCompany || !docType || status === 'generating_doc' || status === 'regenerating_brief'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-medium cursor-pointer bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'generating_doc' || status === 'regenerating_brief' ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Generating...
                  </>
                ) : 'Generate Document'}
              </button>
              <span className="text-xs text-[var(--text-tertiary)]">Document will be added to the company&apos;s source documents</span>
            </div>

            {statusMessage && (
              <div className={`mt-3 text-sm px-4 py-2.5 rounded-lg ${status === 'error' ? 'bg-[var(--red-bg)] text-[var(--red)]' : status === 'done' ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--accent-light)] text-[var(--accent)]'}`}>
                {statusMessage}
              </div>
            )}
          </div>
        </div>

        {/* Recent Generations */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-light)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recent Generations</h2>
          </div>
          <div className="px-5 py-1">
            {log.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-4">No generations yet. Use the form above to generate synthetic documents.</p>
            ) : (
              <ul className="list-none">
                {log.map(entry => (
                  <li key={entry.id} className="flex items-start gap-3 py-3 border-b border-[var(--border-light)] last:border-b-0">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-md flex items-center justify-center text-sm shrink-0 text-[var(--text-tertiary)]">
                      {entry.event_type === 'document_generated' ? '\u{1F4C4}' : entry.event_type === 'brief_generated' ? '✅' : '❌'}
                    </div>
                    <div className="text-[13px]">
                      <div><strong className="font-semibold">{entry.company_name}</strong> — {entry.detail}</div>
                      <div className="text-[var(--text-tertiary)] text-xs">{relTime(entry.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
