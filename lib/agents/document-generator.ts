import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../retry';

const SYSTEM_PROMPT = `You are generating synthetic source documents for a venture capital intelligence system. The documents should be realistic and internally consistent with existing company data.

You will receive the company record, its existing source documents (for context and consistency), and a requested document type. Optionally, you will receive guidance on what the document should contain.

Generate a single document that:
- Is realistic in tone, detail, and formatting for its type
- Is internally consistent with existing documents (references same people, metrics, timelines)
- Advances the company's story plausibly (don't contradict existing facts, but can introduce new developments)
- Uses appropriate formatting for the document type (meeting notes have attendees and action items, emails have from/to/subject, press articles have byline and publication)

For dates, use a date more recent than the most recent existing document for this company.

## Format

{
  "id": "{company-prefix}-{next-number}",
  "type": "{requested_type}",
  "title": "descriptive title",
  "source": "{appropriate source: crm, email, website, publication name, slack}",
  "author": "author name or null",
  "date": "YYYY-MM-DD",
  "participants": ["names if applicable"],
  "content": "full document text"
}`;

export interface GeneratedDocument {
  id: string;
  type: string;
  title: string;
  source: string;
  author: string | null;
  date: string;
  participants: string[];
  content: string;
}

export async function runDocumentGenerator(
  company: Record<string, unknown>,
  existingDocs: Array<{ title: string; type: string; date: string; content: string }>,
  docType: string,
  guidance?: string
): Promise<GeneratedDocument> {
  const client = new Anthropic();

  const docsContext = existingDocs
    .map(d => `- ${d.title} (${d.type}, ${d.date}): ${d.content.slice(0, 200)}...`)
    .join('\n');

  const userMessage = `## Company Record\n${JSON.stringify(company, null, 2)}\n\n## Existing Documents\n${docsContext}\n\n## Request\nType: ${docType}\nGuidance: ${guidance || 'None — generate based on company context'}`;

  return withRetry(async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Document generator did not return valid JSON');
    return JSON.parse(jsonMatch[0]);
  });
}
