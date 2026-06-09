import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createTables, truncateAll } from '@/lib/schema';
import fs from 'fs';
import path from 'path';

function readSeedFile(filePath: string) {
  const fullPath = path.join(process.cwd(), 'data', 'seed', filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

export async function POST() {
  try {
    await createTables();
    await truncateAll();

    const team = readSeedFile('team.json');
    for (const t of team) {
      await sql`
        INSERT INTO team_members (id, name, role, focus_areas, years_experience, email)
        VALUES (${t.id}, ${t.name}, ${t.role}, ${t.focus_areas}, ${t.years_experience}, ${t.email})
      `;
    }

    const companies = readSeedFile('companies.json');
    for (const c of companies) {
      await sql`
        INSERT INTO companies (id, name, website, description, industry, sub_industry, founded_year, location, employee_count, ceo, cto, pipeline_stage, aivc_team, aivc_lead, last_contact_date, deal_size, aivc_investment, board_role, notes)
        VALUES (${c.id}, ${c.name}, ${c.website}, ${c.description}, ${c.industry}, ${c.sub_industry}, ${c.founded_year}, ${c.location}, ${c.employee_count}, ${c.ceo}, ${c.cto}, ${c.pipeline_stage}, ${c.aivc_team}, ${c.aivc_lead}, ${c.last_contact_date}, ${c.deal_size}, ${c.aivc_investment}, ${c.board_role}, ${c.notes})
      `;
    }

    const pitchbook = readSeedFile('pitchbook.json');
    for (const p of pitchbook) {
      await sql`
        INSERT INTO pitchbook_events (company_id, round, date, amount, lead_investor, other_investors, pre_money_valuation, status, source)
        VALUES (${p.company_id}, ${p.round}, ${p.date}, ${p.amount}, ${p.lead_investor}, ${p.other_investors}, ${p.pre_money_valuation}, ${p.status || null}, ${p.source})
      `;
    }

    const keyMetrics = readSeedFile('key-metrics.json');
    for (const period of keyMetrics) {
      for (const [metricName, value] of Object.entries(period.metrics)) {
        if (value === null || value === undefined) continue;
        await sql`
          INSERT INTO key_metrics (company_id, metric_name, value, date, source, source_type)
          VALUES (${period.company_id}, ${metricName}, ${value as number}, ${period.date}, ${period.source}, ${period.source})
        `;
      }
    }

    const docsDir = path.join(process.cwd(), 'data', 'seed', 'documents');
    const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.json'));
    let docCount = 0;
    for (const file of docFiles) {
      const docs = JSON.parse(fs.readFileSync(path.join(docsDir, file), 'utf-8'));
      const companyId = file.replace('.json', '');
      for (const d of docs) {
        await sql`
          INSERT INTO documents (id, company_id, type, title, source, author, date, participants, content)
          VALUES (${d.id}, ${companyId}, ${d.type}, ${d.title}, ${d.source}, ${d.author}, ${d.date}, ${d.participants}, ${d.content})
        `;
        docCount++;
      }
    }

    for (const c of companies) {
      await sql`
        INSERT INTO briefs (company_id, status) VALUES (${c.id}, 'none')
        ON CONFLICT (company_id) DO NOTHING
      `;
    }

    return NextResponse.json({
      success: true,
      counts: {
        team: team.length,
        companies: companies.length,
        pitchbook: pitchbook.length,
        documents: docCount,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
