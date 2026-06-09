import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { rows } = await sql`
      SELECT * FROM documents WHERE company_id = ${slug} ORDER BY date DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const doc = await request.json();
    await sql`
      INSERT INTO documents (id, company_id, type, title, source, author, date, participants, content)
      VALUES (${doc.id}, ${slug}, ${doc.type}, ${doc.title}, ${doc.source}, ${doc.author}, ${doc.date}, ${doc.participants || []}, ${doc.content})
    `;
    return NextResponse.json({ success: true, id: doc.id });
  } catch (error) {
    console.error('Error inserting document:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
