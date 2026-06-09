const SOURCE_TYPE_MAP: Record<string, string> = {
  meeting_note: 'Meeting Notes',
  email: 'Email',
  press_article: 'Press',
  competitor_press: 'Press',
  about_page: 'About Page',
  slack_thread: 'Slack',
  portco_update: 'Portfolio Reporting',
};

export function computeDataFreshness(
  documents: Array<{ type: string; date: string }>
): Array<{ source_type: string; last_updated: string; status: 'current' | 'stale' }> {
  const groups: Record<string, string> = {};

  for (const doc of documents) {
    const label = SOURCE_TYPE_MAP[doc.type] || doc.type;
    if (!groups[label] || new Date(doc.date) > new Date(groups[label])) {
      groups[label] = doc.date;
    }
  }

  const now = new Date();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  return Object.entries(groups)
    .map(([source_type, last_updated]) => ({
      source_type,
      last_updated,
      status: (now.getTime() - new Date(last_updated).getTime() > ninetyDaysMs
        ? 'stale'
        : 'current') as 'current' | 'stale',
    }))
    .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
}
