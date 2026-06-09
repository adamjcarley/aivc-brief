import { sql } from '@vercel/postgres';

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      focus_areas TEXT[],
      years_experience INTEGER,
      email TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      description TEXT,
      industry TEXT,
      sub_industry TEXT,
      founded_year INTEGER,
      location TEXT,
      employee_count INTEGER,
      ceo TEXT,
      cto TEXT,
      pipeline_stage TEXT,
      aivc_team TEXT[],
      aivc_lead TEXT,
      last_contact_date DATE,
      deal_size INTEGER,
      aivc_investment INTEGER,
      board_role TEXT,
      notes TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT,
      author TEXT,
      date DATE,
      participants TEXT[],
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pitchbook_events (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      round TEXT,
      date DATE,
      amount INTEGER,
      lead_investor TEXT,
      other_investors TEXT[],
      pre_money_valuation INTEGER,
      status TEXT,
      source TEXT DEFAULT 'pitchbook'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS key_metrics (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      metric_name TEXT NOT NULL,
      value NUMERIC,
      date DATE,
      source TEXT,
      source_type TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS briefs (
      id SERIAL PRIMARY KEY,
      company_id TEXT UNIQUE REFERENCES companies(id),
      type TEXT,
      content JSONB,
      status TEXT DEFAULT 'none',
      generated_at TIMESTAMPTZ,
      error TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS generation_log (
      id SERIAL PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      event_type TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function truncateAll() {
  await sql`TRUNCATE generation_log, briefs, key_metrics, pitchbook_events, documents, companies, team_members CASCADE`;
}
