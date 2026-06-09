import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { rows: [company] } = await sql`SELECT * FROM companies WHERE id = ${slug}`;
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { rows: [brief] } = await sql`SELECT * FROM briefs WHERE company_id = ${slug}`;
    const { rows: documents } = await sql`SELECT id, type, title, source, author, date, participants FROM documents WHERE company_id = ${slug} ORDER BY date DESC`;
    const { rows: pitchbook } = await sql`SELECT * FROM pitchbook_events WHERE company_id = ${slug} ORDER BY date ASC`;
    const { rows: metrics } = await sql`
      SELECT DISTINCT ON (metric_name) * FROM key_metrics
      WHERE company_id = ${slug} ORDER BY metric_name, date DESC
    `;
    const { rows: team } = await sql`SELECT * FROM team_members`;

    return NextResponse.json({
      company,
      brief: brief || null,
      documents,
      pitchbook,
      metrics,
      team,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
