import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT c.*, b.status as brief_status, b.generated_at as brief_generated_at
      FROM companies c
      LEFT JOIN briefs b ON c.id = b.company_id
      ORDER BY c.name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
