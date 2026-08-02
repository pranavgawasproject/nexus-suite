// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://pranavgawasproject.github.io',
  base: '/nexus-suite',
  integrations: [
    starlight({
      title: 'Nexus Suite',
      description: 'All-in-one modular enterprise PM + ERP suite. 100% free, open-source, self-hostable forever.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/pranavgawasproject/nexus-suite' },
      ],
      editLink: {
        baseUrl: 'https://github.com/pranavgawasproject/nexus-suite/edit/main/docs-site/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Quickstart', slug: 'quickstart' },
            { label: 'Self-hosting (Production)', slug: 'self-hosting' },
          ],
        },
        {
          label: 'Product',
          items: [
            { label: 'Modules', slug: 'modules' },
            { label: 'Architecture', slug: 'architecture' },
            { label: 'Business Model (Open-Core)', slug: 'business-model' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Public API v1', slug: 'api' },
            { label: 'Webhooks', slug: 'webhooks' },
          ],
        },
        {
          label: 'Project',
          items: [
            { label: 'Roadmap & Status', slug: 'roadmap' },
            { label: 'Contributing', slug: 'contributing' },
          ],
        },
      ],
    }),
  ],
});
