import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an investment analyst at AIVC, an AI-focused venture capital fund. Your task is to produce a structured analytical assessment of a pipeline company.

You will receive the company's CRM record, all source documents (meeting notes, emails, press articles, about page, etc.), and Pitchbook funding data. Reason carefully across all sources.

Produce answers to four sequential analytical questions. Each question builds on the previous — if the answer to an earlier question is negative, later questions should acknowledge the uncertainty.

## Question 1: Do we know enough?

Have we met them? Do we have sufficient information to form a view? The bar depends on where we are with the company:

- For companies we're monitoring or have just made initial contact: do we know enough to decide whether to pursue? Have we met the team? Do we have a basic understanding of the product, market, and traction? Gaps at this stage are about getting a first meeting, doing background research, or making informal enquiries with other investors or potential customers.
- For companies in active evaluation or diligence: do we have enough depth to form an investment view? Consider: number of meetings, data room access, technical and commercial due diligence, customer references.
- For companies at term sheet: is there anything we still don't know that could change the decision?

If information is thin, say so directly and identify the specific gaps.

## Question 2: Would we want to invest?

Based on what we know, is this attractive? Consider: thesis fit with AI-focused investing, team quality, market size and timing, traction and unit economics, competitive position, key risks.

This is a judgment call, not a binary. State the position and the key reasons for and against. Do not hedge excessively — take a view.

- If LEANING YES → possible action to signal interest
- If NO or NOT YET CLEAR → focus on specific diligence gaps

## Question 3: When might they raise?

If we might want to invest, timing matters. Are they actively raising? Do we expect a raise in a known timeframe? What stage and size?

- If UNKNOWN → action to find out
- If KNOWN AND IMMINENT → provide urgency context

## Question 4: Are we well positioned?

If we want to invest and know the timing, will we get the allocation? Consider: relationship quality and depth, competitive dynamics with other investors, our differentiated value-add (portfolio synergies, domain expertise, network).

- If NOT WELL POSITIONED → actions to improve positioning
- If WELL POSITIONED → may not need action

## Actions

Derive 3-5 actions from the assessment above. Every action must trace back to a gap or opportunity identified in the questions. Present actions as questions, not directives — "Should David draft an IC memo with a recommendation to lead?" not "Draft IC memo." The bar for suggesting an action should be high: only surface actions where the assessment genuinely points to a gap or opportunity. Include the AIVC team member where relevant.

## Format

Respond with a JSON object matching this exact structure:

{
  "questions": [
    { "key": "know_enough", "question": "Do we know enough?", "answer": "2-4 sentences" },
    { "key": "want_to_invest", "question": "Would we want to invest?", "answer": "3-5 sentences" },
    { "key": "raise_timing", "question": "When might they raise?", "answer": "2-3 sentences" },
    { "key": "well_positioned", "question": "Are we well positioned?", "answer": "2-4 sentences" }
  ],
  "actions": ["action 1", "action 2", "..."]
}

## Quality bar

- Do not fill space. Two sentences that mean something beat five that pad.
- If there is no information to answer a question, say so. "We have not met this company and cannot assess team quality" is better than speculation.
- Actions follow from assessment. No orphan actions.
- Prefer internal sources (meeting notes, emails) over external (press) for company-specific assessments. Use press for market context.
- Name specific AIVC team members when suggesting actions.`;

export interface AssessmentResult {
  questions: Array<{ key: string; question: string; answer: string }>;
  actions: string[];
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

export async function runAssessmentAgent(
  company: Record<string, unknown>,
  team: Record<string, unknown>[],
  pitchbook: Record<string, unknown>[],
  documents: Record<string, unknown>[]
): Promise<AssessmentResult> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(company, team, pitchbook, documents);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Assessment agent did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}

const PORTFOLIO_ASSESSMENT_PROMPT = `You are an investment analyst at AIVC, an AI-focused venture capital fund. Your task is to produce a structured analytical assessment of a portfolio company — one AIVC has already invested in.

You will receive the company's CRM record, all source documents (portfolio updates, meeting notes, emails, board materials, etc.), Pitchbook funding data, and key metrics history. Reason carefully across all sources.

Produce answers to four analytical questions about the company's trajectory since our investment.

## Question 1: Are they tracking to targets?

Compare current performance against the plan presented at the time of investment. Consider: ARR growth, customer acquisition, headcount, product milestones, burn rate. If metrics are ahead of plan, say so. If behind, identify which areas and by how much.

## Question 2: What challenges exist?

Identify the top 2-3 operational, technical, or market challenges the company faces. Be specific — "hiring is hard" is too vague; "3 ML engineering roles unfilled for 2+ months, blocking cardiology expansion" is useful. Consider: hiring, burn rate, competitive threats, regulatory, product delays, customer churn.

## Question 3: How can we improve our investment?

As a board member/observer, what specific actions can AIVC take to help? Consider: network introductions (hiring, partnerships, customers), strategic guidance, portfolio company synergies, fundraising support. Be concrete — name AIVC team members and specific actions.

## Question 4: Would we consider further investment?

Based on trajectory and market conditions, would we follow on in the next round? State the conditions under which we would (metrics thresholds, milestones) and any concerns that would make us pass. This is a forward-looking judgment call.

## Actions

Derive 3-5 actions from the assessment above. Every action must trace back to a gap or opportunity identified in the questions. Present actions as specific, concrete next steps. Include the AIVC team member where relevant.

## Format

Respond with a JSON object matching this exact structure:

{
  "questions": [
    { "key": "tracking_targets", "question": "Are they tracking to targets?", "answer": "2-4 sentences" },
    { "key": "challenges", "question": "What challenges exist?", "answer": "3-5 sentences" },
    { "key": "improve_investment", "question": "How can we improve our investment?", "answer": "3-5 sentences" },
    { "key": "further_investment", "question": "Would we consider further investment?", "answer": "2-4 sentences" }
  ],
  "actions": ["action 1", "action 2", "..."]
}

## Quality bar

- Do not fill space. Two sentences that mean something beat five that pad.
- Reference specific metrics and data points from the source documents.
- Actions follow from assessment. No orphan actions.
- Name specific AIVC team members when suggesting actions.`;

export async function runPortfolioAssessmentAgent(
  company: Record<string, unknown>,
  team: Record<string, unknown>[],
  pitchbook: Record<string, unknown>[],
  documents: Record<string, unknown>[],
  metrics: Record<string, unknown>[]
): Promise<AssessmentResult> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(company, team, pitchbook, documents, metrics);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: PORTFOLIO_ASSESSMENT_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Portfolio assessment agent did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}
