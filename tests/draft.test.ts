import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { draftSite, moveProjectFirst, rewriteSection } from '../shared/draft.ts';
import { parseSite } from '../shared/site.ts';
import type { GithubCache } from '../shared/types.ts';

const cache = JSON.parse(
  readFileSync(path.join(process.cwd(), 'data/github/Jacky97s.json'), 'utf8'),
) as GithubCache;

const featured = ['agent-panel', 'pytest-synapse', 'gbp-seo-portfolio', 'parking-calculator-ai'];

describe('draftSite', () => {
  it('builds a Traditional Chinese page from the Jacky97s cache', () => {
    const site = draftSite(cache, { tone: 'professional', language: 'zh-Hant', featured });
    expect(parseSite(site).hero.name).toBe('Jacky Tan');
    expect(site.projects.items.map((item) => item.repo)).toEqual(featured);
    expect(site.projects.items[0]?.description).toContain('Claude Code');
    expect(site.about.body).toContain('台灣');
    expect(site.hero.location).toBe('台灣');
    expect(site.hero.tagline).toBe('從零把東西做出來。');
    expect(site.skills.items.map((item) => item.name)).toContain('TypeScript');
  });

  it('rewrites only the selected section into an SDET voice', () => {
    const site = draftSite(cache, { tone: 'professional', language: 'zh-Hant', featured });
    const next = rewriteSection(site, 'about');
    expect(next.about.body).toContain('我帶 SDET 團隊');
    expect(next.hero).toEqual(site.hero);
    expect(next.projects).toEqual(site.projects);
    expect(next.skills).toEqual(site.skills);
    expect(next.contact).toEqual(site.contact);
  });

  it('moves one project to the front and leaves the about copy', () => {
    const site = draftSite(cache, { tone: 'professional', language: 'zh-Hant', featured });
    const next = moveProjectFirst(site, 'gbp-seo-portfolio');
    expect(next.projects.items.map((item) => item.repo)).toEqual([
      'gbp-seo-portfolio',
      'agent-panel',
      'pytest-synapse',
      'parking-calculator-ai',
    ]);
    expect(next.about).toEqual(site.about);
    expect(next.hero).toEqual(site.hero);
  });
});
