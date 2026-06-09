import Anthropic from '@anthropic-ai/sdk';
import type { AssessmentResult } from './assessment';
import type { NarrativeResult } from './narrative';

const SYSTEM_PROMPT = `You are an investment analyst at AIVC. Your task is to produce a concise executive summary for a company briefing.

You will receive the company's CRM record, a completed assessment (4 analytical questions + actions), and narrative content (company overview, updates). Distill these into a 10-second-readable summary.

## Company Overview

One sentence. What the company is and does. Not a tagline — a factual description.

## Where We Stand

One to two sentences. Summarise the assessment section: do we know enough, do we want to invest, are we positioned. This is a distillation of the assessment, not a separate analysis. Capture the current analytical position.

## Actions

One sentence listing the 2-3 most important actions from the assessment, comma-separated. These must be drawn from the assessment's action list — do not invent new ones.

## Format

{
  "company_overview": "one sentence",
  "where_we_stand": "one to two sentences",
  "actions": "comma-separated sentence"
}

## Quality bar

- Glanceable. A partner should be able to read this in 10 seconds and know the situation.
- Do not repeat content between summary and detail — the summary summarises.
- If there are no actions, say "No immediate actions required."
- Do not pad. Two sentences that mean something beat five that hedge.`;

export interface SynthesisResult {
  company_overview: string;
  where_we_stand?: string;
  trajectory?: string;
  actions: string;
}

export async function runSynthesisAgent(
  company: Record<string, unknown>,
  assessment: AssessmentResult,
  narrative: NarrativeResult
): Promise<SynthesisResult> {
  const client = new Anthropic();

  const userMessage = `## Company Record\n${JSON.stringify(company, null, 2)}\n\n## Assessment\n${JSON.stringify(assessment, null, 2)}\n\n## Narrative\n${JSON.stringify({ company_overview: narrative.company_overview, company_updates: narrative.company_updates }, null, 2)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Synthesis agent did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}

const PORTFOLIO_SYNTHESIS_PROMPT = `You are an investment analyst at AIVC. Your task is to produce a concise executive summary for a portfolio company briefing.

You will receive the company's CRM record, a completed assessment (4 analytical questions + actions), and narrative content. Distill these into a 10-second-readable summary.

## Company & Investment Overview

Two to three sentences. What the company does, AIVC's investment details (amount, round, valuation), and key growth metrics since investment (ARR growth, customer growth, headcount growth).

## Trajectory

One to two sentences. Summarise the overall trajectory: is the company tracking ahead, on plan, or behind? Highlight the single biggest positive and the single biggest concern. This is a distillation of the assessment.

## Actions

One sentence listing the 2-3 most important actions from the assessment, comma-separated. These must be drawn from the assessment's action list.

## Format

{
  "company_overview": "two to three sentences",
  "trajectory": "one to two sentences",
  "actions": "comma-separated sentence"
}

## Quality bar

- Glanceable. A partner should be able to read this in 10 seconds.
- Include specific numbers (ARR, growth rates, runway).
- Do not pad.`;

export async function runPortfolioSynthesisAgent(
  company: Record<string, unknown>,
  assessment: AssessmentResult,
  narrative: NarrativeResult
): Promise<SynthesisResult> {
  const client = new Anthropic();

  const userMessage = `## Company Record\n${JSON.stringify(company, null, 2)}\n\n## Assessment\n${JSON.stringify(assessment, null, 2)}\n\n## Narrative\n${JSON.stringify({ company_overview: narrative.company_overview, company_updates: narrative.company_updates }, null, 2)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: PORTFOLIO_SYNTHESIS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Portfolio synthesis agent did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}
