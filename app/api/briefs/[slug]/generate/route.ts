import { NextResponse } from 'next/server';
import { generateBrief } from '@/lib/pipeline';

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const brief = await generateBrief(slug);
    return NextResponse.json({ status: 'ready', brief });
  } catch (error) {
    console.error('Brief generation error:', error);
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
