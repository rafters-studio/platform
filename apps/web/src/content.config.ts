import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const reference = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/reference" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
  }),
});

export const collections = { reference };
