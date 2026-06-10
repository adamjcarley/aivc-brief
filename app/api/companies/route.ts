import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT c.*, b.status as brief_status, b.generated_at as brief_generated_at,
        m_arr.value as arr,
        m_growth.value as arr_growth_qoq,
        m_runway.value as cash_runway_months
      FROM companies c
      LEFT JOIN briefs b ON c.id = b.company_id
      LEFT JOIN LATERAL (
        SELECT value FROM key_metrics WHERE company_id = c.id AND metric_name = 'arr' ORDER BY date DESC LIMIT 1
      ) m_arr ON true
      LEFT JOIN LATERAL (
        SELECT value FROM key_metrics WHERE company_id = c.id AND metric_name = 'arr_growth_qoq' ORDER BY date DESC LIMIT 1
      ) m_growth ON true
      LEFT JOIN LATERAL (
        SELECT value FROM key_metrics WHERE company_id = c.id AND metric_name = 'cash_runway_months' ORDER BY date DESC LIMIT 1
      ) m_runway ON true
      ORDER BY c.name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
