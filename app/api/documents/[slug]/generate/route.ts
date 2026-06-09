import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { runDocumentGenerator } from '@/lib/agents/document-generator';
import { generateBrief } from '@/lib/pipeline';

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { type, guidance } = await request.json();

    const { rows: [company] } = await sql`SELECT * FROM companies WHERE id = ${slug}`;
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const { rows: existingDocs } = await sql`
      SELECT title, type, date, content FROM documents WHERE company_id = ${slug} ORDER BY date DESC
    `;

    // Generate synthetic document
    const doc = await runDocumentGenerator(company, existingDocs as Array<{ title: string; type: string; date: string; content: string }>, type, guidance);

    // Insert document
    await sql`
      INSERT INTO documents (id, company_id, type, title, source, author, date, participants, content)
      VALUES (${doc.id}, ${slug}, ${doc.type}, ${doc.title}, ${doc.source}, ${doc.author}, ${doc.date}, ${(doc.participants || []) as unknown as string}, ${doc.content})
    `;

    await sql`
      INSERT INTO generation_log (company_id, event_type, detail)
      VALUES (${slug}, 'document_generated', ${`Generated ${doc.type}: ${doc.title}`})
    `;

    // Auto-trigger brief regeneration
    const brief = await generateBrief(slug);

    return NextResponse.json({
      status: 'ready',
      document: { id: doc.id, title: doc.title, type: doc.type, date: doc.date },
      brief,
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
