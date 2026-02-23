import { readFile } from 'node:fs/promises';
import {
  freshnessSignal,
  maintenanceSignal,
  popularitySignalsFromStars,
  recommendedScoreFromSignals,
  scoreConfidenceFromSignals
} from '../../lib/score-model';

const DAY_MS = 1000 * 60 * 60 * 24;

type RawEntry = {
  manifest?: { name?: string };
  manifest_name?: string;
  description?: string;
  domain?: string;
  full_name?: string;
  last_updated?: string;
  stargazers_count?: number;
  open_issues?: number;
  topics?: string[];
};

export type HacsIntegration = {
  id: string;
  slug: string;
  detailsPath: string;
  name: string;
  author: string;
  repo: string;
  category: string;
  domain: string;
  stars: number;
  featured: boolean;
  recommendedScore: number;
  scoreConfidence: number;
  url: string;
  description: string;
  updatedAt: string | null;
  updatedTs: number;
  openIssues: number;
  topics: string[];
};

export type HacsSyncMeta = {
  generatedAt?: string;
  strictMode?: boolean;
  timeoutMs?: number;
  results?: Array<{ name: string; ok: boolean; error?: string }>;
} | null;

async function loadJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function toCategory(entry: RawEntry): string {
  const searchable = `${entry.domain || ''} ${(entry.topics || []).join(' ')} ${entry.description || ''}`.toLowerCase();

  if (/(camera|frigate|cctv|alarm|security|lock|doorbell|motion)/.test(searchable)) return 'Security';
  if (/(energy|solar|battery|inverter|power|meter|electric)/.test(searchable)) return 'Energy';
  if (/(climate|thermostat|hvac|air|humidifier|fan|temperature|weather)/.test(searchable)) return 'Climate';
  if (/(media|music|spotify|sonos|plex|tv|audio|radio)/.test(searchable)) return 'Media';
  if (/(network|router|wifi|bluetooth|mqtt|modbus|api)/.test(searchable)) return 'Network';
  if (/(car|vehicle|ev|tesla|transport|navigation)/.test(searchable)) return 'Mobility';
  if (/(calendar|waste|schedule|task|todo|notification|mail)/.test(searchable)) return 'Utility';
  if (/(dashboard|card|ui|lovelace|frontend|template)/.test(searchable)) return 'Dashboard';

  return 'General';
}

function slugFromRepo(repo: string): string {
  return repo.toLowerCase().replace('/', '--');
}

export async function loadIntegrations(nowTs = Date.now()): Promise<HacsIntegration[]> {
  const repositories = await loadJson<string[]>('./integration-repositories.json', []);
  const integrationData = await loadJson<Record<string, RawEntry>>('./integration-data.json', {});

  const repositorySet = new Set(Array.isArray(repositories) ? repositories : []);
  const rawEntries = Object.values(integrationData || {});

  const baseRows = rawEntries
    .filter((entry): entry is RawEntry => Boolean(entry && typeof entry.full_name === 'string'))
    .filter((entry) => repositorySet.has(entry.full_name as string))
    .map((entry) => {
      const fullName = entry.full_name as string;
      const [author = 'unknown', repoName = fullName] = fullName.split('/');
      const stars = Number(entry.stargazers_count || 0);
      const updatedTs = Date.parse(entry.last_updated || '') || 0;
      const daysSinceUpdate = updatedTs ? Math.floor((nowTs - updatedTs) / DAY_MS) : 99999;
      const featured = stars >= 600 && daysSinceUpdate <= 365;
      const openIssues = Number(entry.open_issues || 0);

      const slug = slugFromRepo(fullName);

      return {
        id: fullName,
        slug,
        detailsPath: `/integration/${slug}/`,
        name: entry.manifest?.name || entry.manifest_name || repoName,
        author,
        repo: fullName,
        category: toCategory(entry),
        domain: entry.domain || 'n/a',
        stars,
        featured,
        url: `https://github.com/${fullName}`,
        description: entry.description || 'No description available.',
        updatedAt: entry.last_updated || null,
        updatedTs,
        openIssues,
        topics: Array.isArray(entry.topics) ? entry.topics.slice(0, 6) : []
      };
    });

  const starPercentiles = popularitySignalsFromStars(baseRows.map((row) => row.stars));

  const integrations = baseRows
    .map((row, index) => {
      const popularitySignal = starPercentiles[index];
      const freshness = freshnessSignal(row.updatedTs, nowTs);
      const maintenance = maintenanceSignal(row.openIssues, row.stars);

      const recommendedScore = recommendedScoreFromSignals(popularitySignal, freshness, maintenance);
      const scoreConfidence = scoreConfidenceFromSignals(popularitySignal, freshness);

      return {
        ...row,
        recommendedScore,
        scoreConfidence
      } satisfies HacsIntegration;
    })
    .sort((a, b) => b.recommendedScore - a.recommendedScore || b.stars - a.stars);

  return integrations;
}

export async function loadLastSync(): Promise<HacsSyncMeta> {
  return loadJson<HacsSyncMeta>('./last-sync.json', null);
}
