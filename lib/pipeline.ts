import { sql } from '@vercel/postgres';
import { runAssessmentAgent, runPortfolioAssessmentAgent } from './agents/assessment';
import { runNarrativeAgent, runPortfolioNarrativeAgent } from './agents/narrative';
import { runSynthesisAgent, runPortfolioSynthesisAgent } from './agents/synthesis';
import { computeDataFreshness } from './data-freshness';
import { formatLastRaise } from './format';

export async function generateBrief(companyId: string) {
  await sql`
    INSERT INTO briefs (company_id, status) VALUES (${companyId}, 'generating')
    ON CONFLICT (company_id) DO UPDATE SET status = 'generating', error = NULL
  `;

  try {
    const { rows: [company] } = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
    if (!company) throw new Error(`Company not found: ${companyId}`);

    const { rows: documents } = await sql`SELECT * FROM documents WHERE company_id = ${companyId} ORDER BY date ASC`;
    const { rows: pitchbook } = await sql`SELECT * FROM pitchbook_events WHERE company_id = ${companyId} ORDER BY date ASC`;
    const { rows: team } = await sql`SELECT * FROM team_members`;
    const { rows: allMetrics } = await sql`
      SELECT * FROM key_metrics WHERE company_id = ${companyId} ORDER BY metric_name, date DESC
    `;
    const { rows: latestMetrics } = await sql`
      SELECT DISTINCT ON (metric_name) * FROM key_metrics
      WHERE company_id = ${companyId} ORDER BY metric_name, date DESC
    `;

    const isPortfolio = company.pipeline_stage === 'invested';
    const dataFreshness = computeDataFreshness(
      documents.map(d => ({ type: d.type, date: d.date }))
    );

    let briefContent;

    if (isPortfolio) {
      const [assessment, narrative] = await Promise.all([
        runPortfolioAssessmentAgent(company, team, pitchbook, documents, allMetrics),
        runPortfolioNarrativeAgent(company, team, pitchbook, documents, allMetrics),
      ]);
      const synthesis = await runPortfolioSynthesisAgent(company, assessment, narrative);

      const metricsMap: Record<string, { value: number; date: string }> = {};
      for (const m of latestMetrics) {
        metricsMap[m.metric_name] = { value: Number(m.value), date: m.date };
      }

      const prevMetrics: Record<string, { value: number; date: string }> = {};
      for (const m of allMetrics) {
        const name = m.metric_name as string;
        if (!prevMetrics[name] && metricsMap[name] && String(m.date) !== String(metricsMap[name].date)) {
          prevMetrics[name] = { value: Number(m.value), date: String(m.date) };
        }
      }

      function formatMetricDelta(current: number, previous: number | undefined, metricName: string): { delta: string; direction: 'up' | 'down' | 'flat' } {
        if (previous === undefined) return { delta: '', direction: 'flat' };
        if (metricName === 'cash_runway_months') {
          const diff = current - previous;
          return { delta: `was ${previous} mo`, direction: diff >= 0 ? 'up' : 'down' };
        }
        const pct = ((current - previous) / previous * 100).toFixed(1);
        const isPositive = current >= previous;
        const invertedMetrics = ['monthly_burn', 'cac'];
        const direction = invertedMetrics.includes(metricName)
          ? (isPositive ? 'down' : 'up')
          : (isPositive ? 'up' : 'down');
        return { delta: `${isPositive ? '+' : ''}${pct}% QoQ`, direction };
      }

      function formatMetricValue(value: number, metricName: string): string {
        if (metricName === 'cash_runway_months') return `${Math.round(value)} mo`;
        if (metricName === 'customer_count') return String(Math.round(value));
        if (metricName === 'arr') return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;
        if (metricName === 'monthly_burn') return `$${(value / 1000).toFixed(0)}K`;
        return String(value);
      }

      const portfolioMetrics = [
        { key: 'arr', label: 'ARR' },
        { key: 'monthly_burn', label: 'Monthly Burn' },
        { key: 'cash_runway_months', label: 'Cash Runway' },
        { key: 'customer_count', label: 'Customers' },
      ].map(({ key, label }) => {
        const current = metricsMap[key];
        const prev = prevMetrics[key];
        const { delta, direction } = current
          ? formatMetricDelta(current.value, prev?.value, key)
          : { delta: '', direction: 'flat' as const };
        return {
          label,
          value: current ? formatMetricValue(current.value, key) : 'N/A',
          delta,
          direction,
        };
      });

      briefContent = {
        company_id: companyId,
        type: 'portfolio' as const,
        generated_at: new Date().toISOString(),
        executive_summary: synthesis,
        key_metrics: portfolioMetrics,
        assessment,
        narrative: {
          company_overview: narrative.company_overview,
          company_updates: narrative.company_updates,
          market_updates: narrative.market_updates,
          all_metrics: narrative.all_metrics,
        },
        data_freshness: dataFreshness,
        latest_metrics: latestMetrics,
      };
    } else {
      const [assessment, narrative] = await Promise.all([
        runAssessmentAgent(company, team, pitchbook, documents),
        runNarrativeAgent(company, team, pitchbook, documents),
      ]);
      const synthesis = await runSynthesisAgent(company, assessment, narrative);

      const lastRaise = formatLastRaise(
        pitchbook.map(p => ({
          round: p.round,
          date: p.date,
          amount: p.amount,
          lead_investor: p.lead_investor,
        }))
      );

      briefContent = {
        company_id: companyId,
        type: 'pipeline' as const,
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
    }

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
      VALUES (${companyId}, 'brief_generated', ${`${isPortfolio ? 'Portfolio' : 'Pipeline'} brief generated with ${documents.length} source documents`})
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
