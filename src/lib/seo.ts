import type { HacsIntegration } from '../data/hacs/load';

type JsonLd = Record<string, unknown>;

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogSiteName: string;
  ogImageUrl: string;
  ogImageAlt: string;
  ogImageType: 'image/png';
  ogImageWidth: number;
  ogImageHeight: number;
  ogLocale: string;
  twitterCard: 'summary_large_image';
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  twitterImageAlt: string;
  twitterSite?: string;
  robots?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  jsonLd?: JsonLd | JsonLd[];
};

const MAX_TITLE_LENGTH = 68;
const MAX_DESCRIPTION_LENGTH = 160;

function normalizeBasePath(basePath?: string): string {
  const value = (basePath || '/').trim();
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function trimOne(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function clampText(input: string, maxLength: number): string {
  const normalized = trimOne(input);
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength - 1);
  const safe = slice.replace(/\s+\S*$/, '').trim();
  return `${safe || slice}…`;
}

function pathWithBase(pathname: string, basePath: string): string {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  const normalizedBase = normalizeBasePath(basePath);
  if (pathname.startsWith(normalizedBase)) {
    return pathname;
  }

  const cleaned = pathname.replace(/^\/+/, '');

  if (!cleaned) return normalizedBase;
  if (normalizedBase === '/') return `/${cleaned}`;
  return `${normalizedBase}${cleaned}`;
}

export function buildAbsoluteUrl(
  pathnameOrUrl: string,
  site: URL | undefined,
  currentUrl: URL,
  basePath = '/'
): string {
  if (/^https?:\/\//i.test(pathnameOrUrl)) {
    return new URL(pathnameOrUrl).toString();
  }

  const origin = site?.toString() || currentUrl.origin;
  const finalPath = pathWithBase(pathnameOrUrl, basePath);
  return new URL(finalPath, origin).toString();
}

type SharedSeoOptions = {
  site: URL | undefined;
  currentUrl: URL;
  basePath?: string;
  twitterSite?: string;
  ogLocale?: string;
};

type HomeSeoOptions = SharedSeoOptions & {
  totalIntegrations: number;
  topCohortCount: number;
  generatedAt?: string;
};

export function buildHomeSeo(options: HomeSeoOptions): SeoMetadata {
  const title = clampText('HACS Scoreboard | Integration Quality Ranking', MAX_TITLE_LENGTH);
  const description = clampText(
    'Compare Home Assistant community integrations with one HACS Score. Filter by reliability, freshness, maintenance, and popularity to choose faster with confidence.',
    MAX_DESCRIPTION_LENGTH
  );

  const canonicalUrl = buildAbsoluteUrl('/', options.site, options.currentUrl, options.basePath);
  const ogImageUrl = buildAbsoluteUrl('/og/home.png', options.site, options.currentUrl, options.basePath);
  const generatedAtLabel = options.generatedAt
    ? new Date(options.generatedAt).toISOString().slice(0, 19).replace('T', ' ')
    : 'unknown';
  const ogImageAlt = `HACS Scoreboard social preview. ${options.totalIntegrations} integrations, ${options.topCohortCount} featured, sync ${generatedAtLabel} UTC.`;

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'HACS Scoreboard',
    description,
    inLanguage: 'en',
    numberOfItems: options.totalIntegrations,
    dateModified: options.generatedAt || undefined,
    about: {
      '@type': 'SoftwareApplication',
      name: 'HACS',
      applicationCategory: 'Home Automation'
    }
  };

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogSiteName: 'HACS Showcase',
    ogImageUrl,
    ogImageAlt,
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogLocale: options.ogLocale || 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImageUrl: ogImageUrl,
    twitterImageAlt: ogImageAlt,
    twitterSite: options.twitterSite,
    robots: 'index,follow,max-image-preview:large',
    jsonLd
  };
}

type IntegrationSeoOptions = SharedSeoOptions & {
  integration: HacsIntegration;
  overallRank: number;
  totalCount: number;
  categoryRank: number;
  categoryCount: number;
};

export function buildIntegrationSeo(options: IntegrationSeoOptions): SeoMetadata {
  const { integration } = options;
  const score = integration.recommendedScore;
  const updatedLabel = integration.updatedAt
    ? new Date(integration.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    : 'unknown update date';

  const title = clampText(
    `${integration.name} HACS Score ${score} | Rank #${options.overallRank} of ${options.totalCount}`,
    MAX_TITLE_LENGTH
  );

  const description = clampText(
    `${integration.name} (${integration.repo}) is ranked #${options.overallRank}/${options.totalCount} with HACS Score ${score}. Category rank #${options.categoryRank}/${options.categoryCount}, ${integration.stars.toLocaleString('en-US')} stars, updated ${updatedLabel}.`,
    MAX_DESCRIPTION_LENGTH
  );

  const canonicalUrl = buildAbsoluteUrl(
    integration.detailsPath,
    options.site,
    options.currentUrl,
    options.basePath
  );
  const ogImageUrl = buildAbsoluteUrl(
    `/og/integration/${integration.slug}.png`,
    options.site,
    options.currentUrl,
    options.basePath
  );

  const ogImageAlt = `${integration.name} social preview: HACS Score ${score}, rank ${options.overallRank} of ${options.totalCount}, category ${integration.category}.`;

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: integration.name,
    applicationCategory: 'Home Automation',
    description: integration.description,
    url: canonicalUrl,
    softwareHelp: `https://github.com/${integration.repo}/issues`,
    maintainer: {
      '@type': 'Person',
      name: integration.author
    },
    keywords: integration.topics.join(', ') || undefined,
    sameAs: integration.url,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: integration.stars
      }
    ]
  };

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'article',
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogSiteName: 'HACS Showcase',
    ogImageUrl,
    ogImageAlt,
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogLocale: options.ogLocale || 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImageUrl: ogImageUrl,
    twitterImageAlt: ogImageAlt,
    twitterSite: options.twitterSite,
    robots: 'index,follow,max-image-preview:large',
    article: {
      modifiedTime: integration.updatedAt || undefined,
      section: integration.category,
      tags: integration.topics.length > 0 ? integration.topics : undefined
    },
    jsonLd
  };
}

type BlogIndexSeoOptions = SharedSeoOptions & {
  totalPosts: number;
  totalCategories: number;
  totalTags: number;
};

type BlogPostSeoOptions = SharedSeoOptions & {
  title: string;
  description: string;
  slug: string;
  pubDate: Date;
  updatedDate?: Date;
  categories: string[];
  tags: string[];
  coverImageUrl?: string;
};

export function buildBlogIndexSeo(options: BlogIndexSeoOptions): SeoMetadata {
  const title = clampText('HACS Showcase Blog | Integration Playbooks and Release Notes', MAX_TITLE_LENGTH);
  const description = clampText(
    `Editorial notes and practical checklists for Home Assistant integration decisions. ${options.totalPosts} posts across ${options.totalCategories} categories and ${options.totalTags} tags.`,
    MAX_DESCRIPTION_LENGTH
  );
  const canonicalUrl = buildAbsoluteUrl(options.currentUrl.pathname, options.site, options.currentUrl, options.basePath);
  const ogImageUrl = buildAbsoluteUrl('/og/home.png', options.site, options.currentUrl, options.basePath);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'HACS Showcase Blog',
    description,
    url: canonicalUrl,
    inLanguage: 'en',
    blogPost: options.totalPosts
  };

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogSiteName: 'HACS Showcase',
    ogImageUrl,
    ogImageAlt: 'HACS Showcase blog social preview image.',
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogLocale: options.ogLocale || 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImageUrl: ogImageUrl,
    twitterImageAlt: 'HACS Showcase blog social preview image.',
    twitterSite: options.twitterSite,
    robots: 'index,follow,max-image-preview:large',
    jsonLd
  };
}

export function buildBlogPostSeo(options: BlogPostSeoOptions): SeoMetadata {
  const title = clampText(`${options.title} | HACS Showcase Blog`, MAX_TITLE_LENGTH);
  const description = clampText(options.description, MAX_DESCRIPTION_LENGTH);
  const canonicalUrl = buildAbsoluteUrl(
    `blog/post/${options.slug}/`,
    options.site,
    options.currentUrl,
    options.basePath
  );
  const ogImageUrl = options.coverImageUrl || buildAbsoluteUrl('/og/home.png', options.site, options.currentUrl, options.basePath);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: options.title,
    description,
    datePublished: options.pubDate.toISOString(),
    dateModified: (options.updatedDate || options.pubDate).toISOString(),
    author: {
      '@type': 'Organization',
      name: 'HACS Showcase'
    },
    keywords: [...options.categories, ...options.tags].join(', '),
    mainEntityOfPage: canonicalUrl
  };

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'article',
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogSiteName: 'HACS Showcase',
    ogImageUrl,
    ogImageAlt: `${options.title} blog post cover image.`,
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogLocale: options.ogLocale || 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImageUrl: ogImageUrl,
    twitterImageAlt: `${options.title} blog post cover image.`,
    twitterSite: options.twitterSite,
    robots: 'index,follow,max-image-preview:large',
    article: {
      publishedTime: options.pubDate.toISOString(),
      modifiedTime: (options.updatedDate || options.pubDate).toISOString(),
      section: options.categories[0],
      tags: options.tags
    },
    jsonLd
  };
}
