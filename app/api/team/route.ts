import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM team_members ORDER BY name ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
