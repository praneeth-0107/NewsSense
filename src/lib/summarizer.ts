import type { Article } from '../types';
import { API_BASE } from './api';

export async function summarizeArticle(article: Article): Promise<string> {
  const response = await fetch(`${API_BASE}/news/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ article }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = errorBody;

    try {
      const json = JSON.parse(errorBody);
      errorMessage = json.error?.message || json.error || json.message || JSON.stringify(json);
    } catch {
      // Keep raw text if JSON parsing fails.
    }

    throw new Error(`Summarization failed: ${errorMessage}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? 'Unable to summarize the article.';
  // Strip any introductory line before the first bullet point
  const firstBullet = raw.search(/^[•\-\*]/m);
  return firstBullet > 0 ? raw.slice(firstBullet).trim() : raw;
}
