import { loadIntegrations, type HacsIntegration } from '../../../data/hacs/load';
import { renderIntegrationImagePng } from '../../../lib/social-image';

export const prerender = true;

type StaticPathProps = {
  integration: HacsIntegration;
  rank: number;
  total: number;
};

export async function getStaticPaths() {
  const integrations = await loadIntegrations();

  return integrations.map((integration, index) => ({
    params: { slug: integration.slug },
    props: {
      integration,
      rank: index + 1,
      total: integrations.length
    } satisfies StaticPathProps
  }));
}

export async function GET({ props }: { props: StaticPathProps }) {
  const { integration, rank, total } = props;

  const updatedLabel = integration.updatedAt
    ? new Date(integration.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    : 'UNKNOWN';

  const image = renderIntegrationImagePng({
    name: integration.name,
    repo: integration.repo,
    category: integration.category,
    score: integration.recommendedScore,
    confidence: Math.round(integration.scoreConfidence ?? integration.recommendedScore),
    stars: integration.stars,
    rank,
    total,
    updatedLabel
  });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
}
