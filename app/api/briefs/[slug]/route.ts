import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { rows: [brief] } = await sql`SELECT * FROM briefs WHERE company_id = ${slug}`;
    if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(brief);
  } catch (error) {
    console.error('Error fetching brief:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
