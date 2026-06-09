import { sql } from '@vercel/postgres';
import { runAssessmentAgent } from './agents/assessment';
import { runNarrativeAgent } from './agents/narrative';
import { runSynthesisAgent } from './agents/synthesis';
import { computeDataFreshness } from './data-freshness';
import { formatLastRaise } from './format';

export async function generateBrief(companyId: string) {
  // 1. Set status to generating
  await sql`
    INSERT INTO briefs (company_id, status) VALUES (${companyId}, 'generating')
    ON CONFLICT (company_id) DO UPDATE SET status = 'generating', error = NULL
  `;

  try {
    // 2. Load data
    const { rows: [company] } = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
    if (!company) throw new Error(`Company not found: ${companyId}`);

    const { rows: documents } = await sql`SELECT * FROM documents WHERE company_id = ${companyId} ORDER BY date ASC`;
    const { rows: pitchbook } = await sql`SELECT * FROM pitchbook_events WHERE company_id = ${companyId} ORDER BY date ASC`;
    const { rows: team } = await sql`SELECT * FROM team_members`;
    const { rows: latestMetrics } = await sql`
      SELECT DISTINCT ON (metric_name) * FROM key_metrics
      WHERE company_id = ${companyId} ORDER BY metric_name, date DESC
    `;

    // 3. Run Assessment + Narrative in parallel
    const [assessment, narrative] = await Promise.all([
      runAssessmentAgent(company, team, pitchbook, documents),
      runNarrativeAgent(company, team, pitchbook, documents),
    ]);

    // 4. Run Synthesis
    const synthesis = await runSynthesisAgent(company, assessment, narrative);

    // 5. Assemble brief
    const lastRaise = formatLastRaise(
      pitchbook.map(p => ({
        round: p.round,
        date: p.date,
        amount: p.amount,
        lead_investor: p.lead_investor,
      }))
    );

    const dataFreshness = computeDataFreshness(
      documents.map(d => ({ type: d.type, date: d.date }))
    );

    const briefContent = {
      company_id: companyId,
      type: company.pipeline_stage === 'invested' ? 'portfolio' : 'pipeline',
      generated_at: new Date().toISOString(),
      executive_summary: synthesis,
      key_metrics: {
        industry: company.industry,
        sub_industry: company.sub_industry,
        business_model: narrative.business_model,
        traction: narrative.traction,
        last_raise: lastRaise,
      },
      assessment,
      narrative: {
        company_overview: narrative.company_overview,
        company_updates: narrative.company_updates,
        market_updates: narrative.market_updates,
      },
      data_freshness: dataFreshness,
      latest_metrics: latestMetrics,
    };

    // 6. Write to DB
    await sql`
      UPDATE briefs
      SET content = ${JSON.stringify(briefContent)},
          type = ${briefContent.type},
          status = 'ready',
          generated_at = NOW(),
          error = NULL
      WHERE company_id = ${companyId}
    `;

    await sql`
      INSERT INTO generation_log (company_id, event_type, detail)
      VALUES (${companyId}, 'brief_generated', ${`Brief generated successfully with ${documents.length} source documents`})
    `;

    return briefContent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await sql`
      UPDATE briefs SET status = 'error', error = ${errorMessage} WHERE company_id = ${companyId}
    `;
    await sql`
      INSERT INTO generation_log (company_id, event_type, detail)
      VALUES (${companyId}, 'brief_error', ${errorMessage})
    `;
    throw error;
  }
}
