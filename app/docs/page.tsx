'use client';

import { useState, useEffect } from 'react';
import { Topbar } from '@/components/topbar';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  pipeline_stage: string;
}

interface Document {
  id: string;
  company_id: string;
  type: string;
  title: string;
  source: string;
  author: string | null;
  date: string;
  participants: string[] | null;
  content: string;
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

const TYPE_LABELS: Record<string, string> = {
  meeting_note: 'Meeting Note',
  email: 'Email',
  about_page: 'About Page',
  press_article: 'Press Article',
  competitor_press: 'Competitor Press',
  slack_thread: 'Slack Thread',
  portco_update: 'Portfolio Update',
  market_research: 'Market Research',
};

export default function DocsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(setCompanies);
  }, []);

  useEffect(() => {
    if (!selectedCompany) { setDocuments([]); return; }
    setLoading(true);
    fetch(`/api/documents/${selectedCompany}`)
      .then(r => r.json())
      .then(docs => { setDocuments(docs); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedCompany]);

  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const cs = companies.filter(c => c.pipeline_stage === stage);
    if (cs.length > 0) acc.push({ stage, label: STAGE_LABELS[stage] || stage, companies: cs });
    return acc;
  }, [] as Array<{ stage: string; label: string; companies: Company[] }>);

  const companyName = companies.find(c => c.id === selectedCompany)?.name;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar>
        <Link href="/" className="text-xs text-[var(--accent)] no-underline">&larr; Back to table</Link>
      </Topbar>

      <div className="max-w-[800px] mx-auto p-8">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-light)]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Source Documents</h2>
          </div>
          <div className="p-5">
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
        </div>

        {loading && (
          <div className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading documents...</div>
        )}

        {!loading && selectedCompany && documents.length === 0 && (
          <div className="text-sm text-[var(--text-tertiary)] text-center py-8">No documents found for {companyName}.</div>
        )}

        {!loading && documents.length > 0 && (
          <div className="text-xs text-[var(--text-tertiary)] mb-4">{documents.length} document{documents.length !== 1 ? 's' : ''} for {companyName}</div>
        )}

        {documents.map(doc => (
          <div key={doc.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-4">
            <div className="px-5 pt-4 pb-3 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent)]">
                  {TYPE_LABELS[doc.type] || doc.type}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">{doc.id}</span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)]">{doc.title}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-[var(--text-secondary)]">
                <span>{new Date(doc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {doc.author && <span>Author: {doc.author}</span>}
                <span>Source: {doc.source}</span>
                {doc.participants && doc.participants.length > 0 && (
                  <span>Participants: {doc.participants.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{doc.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
