import type { APIRoute } from 'astro';
import { loadIntegrations } from '../../data/hacs/load';

export const prerender = true;

export const GET: APIRoute = async () => {
  const integrations = await loadIntegrations();
  const payload = integrations.map((item) => ({
    name: item.name,
    author: item.author,
    repo: item.repo,
    slug: item.slug,
    detailsPath: item.detailsPath,
    category: item.category,
    domain: item.domain,
    stars: item.stars,
    featured: item.featured,
    recommendedScore: item.recommendedScore,
    scoreConfidence: item.scoreConfidence,
    url: item.url,
    description: item.description,
    updatedAt: item.updatedAt,
    updatedTs: item.updatedTs,
    openIssues: item.openIssues,
    topics: item.topics
  }));

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
