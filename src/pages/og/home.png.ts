import { loadIntegrations, loadLastSync } from '../../data/hacs/load';
import { renderHomeImagePng } from '../../lib/social-image';

export const prerender = true;

export async function GET() {
  const integrations = await loadIntegrations();
  const featured = integrations.filter((item) => item.featured);
  const lastSync = await loadLastSync();

  const syncedAtLabel = lastSync?.generatedAt
    ? new Date(lastSync.generatedAt).toISOString().slice(0, 16).replace('T', ' ')
    : 'UNKNOWN';

  const image = renderHomeImagePng({
    totalIntegrations: integrations.length,
    topCohortCount: featured.length,
    syncedAtLabel
  });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
}
