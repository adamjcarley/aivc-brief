import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../retry';

const SYSTEM_PROMPT = `You are an investment analyst at AIVC, an AI-focused venture capital fund. Your task is to produce narrative content for a company briefing.

You will receive the company's CRM record, all source documents, and Pitchbook funding data. Produce three sections.

## Company Overview

2-3 paragraphs maximum. Cover:
- What the company does
- The market they operate in
- How they fit AIVC's AI-focused investment thesis
- Main competitors
- Broader market context
- Major customers (if known)

Do not exceed three paragraphs. Use your judgment on emphasis based on what the data supports.

## Company Updates

Bulleted list. Event-oriented — each bullet is a new piece of information or development, NOT a standing description.

Each bullet contains:
1. The event or data point
2. Your assessment of what it means for company attractiveness and/or investment trajectory
3. Date and source in parentheses

Topics to surface (when relevant new information exists): strategy changes, product developments, commercial traction, operational developments, team changes, risks or challenges.

Example format:
- Site activations up 65% QoQ, with two additional top-20 pharma companies entering contract negotiations. Strengthens the commercial traction story and suggests the enterprise sales motion is working. (Jun 3, 2026 — data room follow-up)

Sort by date, most recent first. Include only updates from the last 12 months. 4-8 bullets typical.

## Market Updates

Bulleted list, same format as company updates. Cover:
- Wider market developments relevant to the company
- Competitor activity: new customers, product launches, funding rounds, traction
- Customer or supplier developments affecting trajectory

Each bullet: event + assessment of implications + (date, source).

3-5 bullets typical. Only include if there is genuinely relevant market information. Do not pad.

## Key Metrics

Also extract these two data points for the key metrics card:
- business_model: A short label (e.g., "B2B SaaS Platform", "Marketplace", "API-first Developer Tool"). Derived from the company's go-to-market motion described in documents.
- traction: One-line summary of the most recent traction data (e.g., "$1.9M ARR, 8 pharma clients, 25% QoQ growth"). Use the most recent numbers available.

## Format

Respond with a JSON object:

{
  "company_overview": "paragraph text with line breaks between paragraphs",
  "company_updates": [
    { "text": "The event/data point and your assessment.", "date": "YYYY-MM-DD", "source": "source description" }
  ],
  "market_updates": [
    { "text": "...", "date": "YYYY-MM-DD", "source": "..." }
  ],
  "business_model": "B2B SaaS Platform",
  "traction": "$1.9M ARR, 8 pharma clients, 25% QoQ growth"
}

## Quality bar

- Do not repeat content that belongs in the assessment section. The narrative provides context and evidence; the assessment provides analytical judgment.
- Company updates are about THIS company. Market updates are about the MARKET this company operates in.
- Every update bullet must have a date and source. If you cannot attribute it, do not include it.
- Do not manufacture updates. If there are only 2 genuine updates, return 2.
- Prefer specifics over generalities. "$1.8M ARR" beats "growing revenue."`;

export interface NarrativeResult {
  company_overview: string;
  company_updates: Array<{ text: string; date: string; source: string }>;
  market_updates: Array<{ text: string; date: string; source: string }>;
  business_model: string;
  traction: string;
}

function buildUserMessage(
  company: Record<string, unknown>,
  team: Record<string, unknown>[],
  pitchbook: Record<string, unknown>[],
  documents: Record<string, unknown>[],
  metrics?: Record<string, unknown>[]
): string {
  const docsText = documents
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())
    .map(d => `### [${d.type}] ${d.title}\nDate: ${d.date} | Source: ${d.source} | Author: ${d.author || 'N/A'}\n${d.content}`)
    .join('\n\n---\n\n');

  let msg = `## Company Record\n${JSON.stringify(company, null, 2)}\n\n## AIVC Team\n${JSON.stringify(team, null, 2)}\n\n## Pitchbook Funding History\n${JSON.stringify(pitchbook, null, 2)}\n\n## Source Documents\n${docsText}`;
  if (metrics) msg += `\n\n## Key Metrics History\n${JSON.stringify(metrics, null, 2)}`;
  return msg;
}

export async function runNarrativeAgent(
  company: Record<string, unknown>,
  team: Record<string, unknown>[],
  pitchbook: Record<string, unknown>[],
  documents: Record<string, unknown>[]
): Promise<NarrativeResult> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(company, team, pitchbook, documents);

  return withRetry(async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Narrative agent did not return valid JSON');
    return JSON.parse(jsonMatch[0]);
  });
}

export interface PortfolioNarrativeResult extends NarrativeResult {
  all_metrics: Array<{ metric: string; prev_value: string; current_value: string; change: string; direction: 'up' | 'down' | 'flat' }>;
}

const PORTFOLIO_NARRATIVE_PROMPT = `You are an investment analyst at AIVC, an AI-focused venture capital fund. Your task is to produce narrative content for a portfolio company briefing.

You will receive the company's CRM record, all source documents, Pitchbook funding data, and key metrics history. Produce the following sections.

## Company Overview

2-3 paragraphs maximum. Cover:
- What the company does
- AIVC's investment (amount, round, date, valuation, board role)
- Growth since investment (headcount, customers, ARR)
- Key product developments
- Competitive landscape

## Company Updates

Bulleted list. Event-oriented — each bullet is a new piece of information or development.

Each bullet contains:
1. The event or data point
2. Your assessment of what it means
3. Date and source in parentheses

Sort by date, most recent first. 4-8 bullets typical.

## Market Updates

Bulleted list, same format. Cover wider market developments, competitor activity, customer/supplier developments.

3-5 bullets typical. Only include genuinely relevant information.

## All Metrics

Produce a comparison table of key business metrics between the two most recent reporting periods. For each metric, provide the previous value, current value, percentage change, and direction (up/down/flat).

Include these metrics when data is available: ARR, Customers, Monthly Burn, Cash Runway, CAC, LTV, LTV:CAC Ratio, Headcount.

Format values for display: currency as "$X.XM" or "$XK", runway as "X months", ratios as "X.Xx".

## Format

Respond with a JSON object:

{
  "company_overview": "paragraph text with line breaks between paragraphs",
  "company_updates": [
    { "text": "...", "date": "YYYY-MM-DD", "source": "..." }
  ],
  "market_updates": [
    { "text": "...", "date": "YYYY-MM-DD", "source": "..." }
  ],
  "business_model": "B2B SaaS Platform",
  "traction": "$3.8M ARR, 180 customers, 19% QoQ growth",
  "all_metrics": [
    { "metric": "ARR", "prev_value": "$3.2M", "current_value": "$3.8M", "change": "+18.75%", "direction": "up" },
    { "metric": "Customers", "prev_value": "145", "current_value": "180", "change": "+24.1%", "direction": "up" }
  ]
}

## Quality bar

- Do not repeat content that belongs in the assessment section.
- Every update bullet must have a date and source.
- Do not manufacture updates or metrics. Use only data from the provided sources.
- Prefer specifics over generalities.`;

export async function runPortfolioNarrativeAgent(
  company: Record<string, unknown>,
  team: Record<string, unknown>[],
  pitchbook: Record<string, unknown>[],
  documents: Record<string, unknown>[],
  metrics: Record<string, unknown>[]
): Promise<PortfolioNarrativeResult> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(company, team, pitchbook, documents, metrics);

  return withRetry(async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: PORTFOLIO_NARRATIVE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Portfolio narrative agent did not return valid JSON');
    return JSON.parse(jsonMatch[0]);
  });
}
