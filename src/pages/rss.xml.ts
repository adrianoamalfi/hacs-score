import rss from '@astrojs/rss';
import { getBlogPostPath, getPublishedBlogPosts } from '../lib/blog';

export async function GET(context: { site?: URL }) {
  const posts = await getPublishedBlogPosts();
  const site = context.site || new URL('https://example.com');

  return rss({
    title: 'HACS Showcase Blog',
    description: 'Playbooks and release checklists for Home Assistant integration selection and Astro publishing quality.',
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: getBlogPostPath(post.slug, import.meta.env.BASE_URL),
      categories: [...post.data.categories, ...post.data.tags]
    })),
    customData: '<language>en-us</language>'
  });
}
