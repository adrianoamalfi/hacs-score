import { getCollection, type CollectionEntry } from 'astro:content';
import { withBasePath } from './base-path';

export type BlogPostEntry = CollectionEntry<'blog'>;

export type TaxonomyBucket = {
  label: string;
  slug: string;
  count: number;
  posts: BlogPostEntry[];
};

export function toTaxonomySlug(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'general';
}

export function formatBlogDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

export function sortBlogPosts(posts: BlogPostEntry[]): BlogPostEntry[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPublishedBlogPosts(): Promise<BlogPostEntry[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return sortBlogPosts(posts);
}

export function buildTaxonomyBuckets(posts: BlogPostEntry[], key: 'categories' | 'tags'): TaxonomyBucket[] {
  const map = new Map<string, TaxonomyBucket>();

  for (const post of posts) {
    const labels = post.data[key];
    for (const label of labels) {
      const slug = toTaxonomySlug(label);
      const existing = map.get(slug);
      if (existing) {
        existing.count += 1;
        existing.posts.push(post);
        continue;
      }

      map.set(slug, {
        label,
        slug,
        count: 1,
        posts: [post]
      });
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getBlogPostPath(slug: string, basePath = '/'): string {
  return withBasePath(`blog/post/${slug}/`, basePath);
}

export function getBlogCategoryPath(slug: string, basePath = '/'): string {
  return withBasePath(`blog/category/${slug}/`, basePath);
}

export function getBlogTagPath(slug: string, basePath = '/'): string {
  return withBasePath(`blog/tag/${slug}/`, basePath);
}
