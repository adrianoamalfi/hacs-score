import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().min(10).max(120),
      description: z.string().min(30).max(220),
      pubDate: z.date(),
      updatedDate: z.date().optional(),
      draft: z.boolean().default(false),
      categories: z.array(z.string().min(2).max(40)).min(1),
      tags: z.array(z.string().min(2).max(40)).min(1),
      cover: image().optional(),
      coverAlt: z.string().max(160).optional()
    })
});

export const collections = { blog };
