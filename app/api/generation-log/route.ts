import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT gl.*, c.name as company_name
      FROM generation_log gl
      JOIN companies c ON gl.company_id = c.id
      ORDER BY gl.created_at DESC
      LIMIT 20
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching generation log:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
